import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { tryAcquireGlobalSlot, releaseGlobalSlot } from "@/lib/concurrency";
import { computeJobCostWithFreeRegen, reserveCredits, releaseCredits, refundReservedCredits } from "@/lib/credits";
import { dispatchJob, RunpodDispatchError, type JobInput, type JobType } from "@/lib/runpod";
import { runStitchJob } from "@/lib/stitch";
import { applyRunpodResult } from "@/lib/apply-job-result";
import type { StitchJobInput } from "@/lib/projects";

const MAX_DISPATCH_ATTEMPTS = 5;

export type DispatchOutcome =
  | { jobId: string; outcome: "dispatched"; runpodJobId: string }
  | { jobId: string; outcome: "stitched" }
  | { jobId: string; outcome: "stitch_failed"; error: string }
  | { jobId: string; outcome: "insufficient_credits" }
  | { jobId: string; outcome: "already_claimed" }
  | { jobId: string; outcome: "no_global_slot" }
  | { jobId: string; outcome: "dispatch_failed_permanent"; error: string }
  | { jobId: string; outcome: "dispatch_failed_retryable"; error: string }
  | { jobId: string; outcome: "unexpected_error"; error: string };

/**
 * Claims, reserves credits for, and dispatches exactly one "queued"
 * generationJobs row - the single-job unit of work shared by two callers:
 *   - POST /api/jobs (src/app/api/jobs/route.ts), which calls this once,
 *     immediately after creating the row, so the common case (no other job
 *     in flight, a global slot free) starts generating within the same
 *     request instead of waiting for the next cron tick - this is what
 *     makes "press generate, image appears a few seconds later" possible.
 *   - /api/cron/dispatch's batch loop, the resilience backstop: retries
 *     whatever the inline attempt above couldn't dispatch (no free global
 *     slot at creation time, a transient RunPod error, etc).
 *
 * Extracted from the cron route verbatim (no behavior change) so both
 * callers share one claim-guard/credit-reservation/dispatch code path -
 * that invariant (a policy-violating input never occupies a slot, and
 * MAX_CONCURRENT_JOBS_PER_USER is never exceeded) has to hold for every
 * code path that can dispatch a job, not just the cron's.
 */
export async function dispatchOneJob(job: typeof generationJobs.$inferSelect): Promise<DispatchOutcome> {
  const acquired = await tryAcquireGlobalSlot();
  if (!acquired) {
    return { jobId: job.id, outcome: "no_global_slot" };
  }

  try {
    // The `AND status='queued'` guard is what makes this safe against
    // overlapping callers (an inline dispatch racing the cron's next tick,
    // or two cron invocations overlapping) - only one can ever win the
    // claim on a given row.
    const [claimed] = await db
      .update(generationJobs)
      .set({
        status: "warming",
        dispatchedAt: new Date(),
        dispatchAttempts: sql`${generationJobs.dispatchAttempts} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(generationJobs.id, job.id), eq(generationJobs.status, "queued")))
      .returning();

    if (!claimed) {
      await releaseGlobalSlot();
      return { jobId: job.id, outcome: "already_claimed" };
    }

    const cost = await computeJobCostWithFreeRegen(claimed);
    const reserve = await reserveCredits({ jobId: claimed.id, userId: claimed.userId, cost });
    if (!reserve.ok) {
      await db
        .update(generationJobs)
        .set({ status: "failed", error: "insufficient_credits", updatedAt: new Date() })
        .where(eq(generationJobs.id, claimed.id));
      await releaseGlobalSlot();
      console.log(`[dispatch-one-job] job ${claimed.id} failed: insufficient_credits`);
      return { jobId: claimed.id, outcome: "insufficient_credits" };
    }

    // "stitch" never goes to RunPod - it's fast, CPU-only ffmpeg
    // concatenation, run in-process (see src/lib/stitch.ts). It resolves
    // synchronously within this same call, so it goes straight through
    // applyRunpodResult (credits/output/project-advancement) instead of
    // the async dispatch-then-wait-for-webhook path below.
    if (claimed.type === "stitch") {
      try {
        const result = await runStitchJob({ userId: claimed.userId, input: claimed.input as StitchJobInput });
        await applyRunpodResult(claimed, result);
        if (result.status === "COMPLETED" && !result.output?.error) {
          return { jobId: claimed.id, outcome: "stitched" };
        }
        return { jobId: claimed.id, outcome: "stitch_failed", error: result.output?.error ?? "unknown" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await applyRunpodResult(claimed, { id: claimed.id, status: "FAILED", output: { error: message } });
        return { jobId: claimed.id, outcome: "stitch_failed", error: message };
      }
    }

    try {
      const { runpodJobId } = await dispatchJob({
        jobId: claimed.id,
        userId: claimed.userId,
        type: claimed.type as JobType,
        input: claimed.input as JobInput,
      });
      await db
        .update(generationJobs)
        .set({ runpodJobId, updatedAt: new Date() })
        .where(eq(generationJobs.id, claimed.id));
      console.log(
        `[dispatch-one-job] job ${claimed.id} type=${claimed.type} dispatched runpodJobId=${runpodJobId} estimatedCredits=${cost}`
      );
      // Slot intentionally NOT released here - it's held for the life of
      // the job ("warming"/"processing") and released by the webhook or
      // the stale-job sweep once the job reaches a terminal state.
      return { jobId: claimed.id, outcome: "dispatched", runpodJobId };
    } catch (err) {
      const dispatchErr = err instanceof RunpodDispatchError ? err : new RunpodDispatchError(String(err), false);
      const permanent = !dispatchErr.retryable || claimed.dispatchAttempts + 1 >= MAX_DISPATCH_ATTEMPTS;

      if (permanent) {
        await releaseCredits({
          jobId: claimed.id,
          userId: claimed.userId,
          estimatedCredits: cost,
          error: dispatchErr.message,
        });
        await releaseGlobalSlot();
        console.error(`[dispatch-one-job] job ${claimed.id} dispatch failed (permanent):`, dispatchErr);
        return { jobId: claimed.id, outcome: "dispatch_failed_permanent", error: dispatchErr.message };
      }

      await refundReservedCredits({ userId: claimed.userId, estimatedCredits: cost });
      await db
        .update(generationJobs)
        .set({ status: "queued", updatedAt: new Date() })
        .where(eq(generationJobs.id, claimed.id));
      await releaseGlobalSlot();
      console.error(`[dispatch-one-job] job ${claimed.id} dispatch failed (retryable):`, dispatchErr);
      return { jobId: claimed.id, outcome: "dispatch_failed_retryable", error: dispatchErr.message };
    }
  } catch (err) {
    await releaseGlobalSlot();
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dispatch-one-job] unexpected error processing job ${job.id}:`, err);
    return { jobId: job.id, outcome: "unexpected_error", error: message };
  }
}
