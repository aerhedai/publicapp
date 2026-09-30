import { NextResponse } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs, projects } from "@/db/schema";
import { verifyCronSecret } from "@/lib/cron";
import { tryAcquireGlobalSlot, releaseGlobalSlot } from "@/lib/concurrency";
import { CREDIT_COST_BY_TYPE, reserveCredits, releaseCredits, refundReservedCredits } from "@/lib/credits";
import { dispatchJob, RunpodDispatchError, type JobInput, type JobType } from "@/lib/runpod";
import { runStitchJob } from "@/lib/stitch";
import { applyRunpodResult } from "@/lib/apply-job-result";
import { advanceProject, type StitchJobInput } from "@/lib/projects";

// Generous upper bound on rows considered per tick - the global-slot check
// below is what actually gates how many get dispatched; jobs beyond
// available headroom are simply left "queued" for the next tick.
const BATCH_SIZE = 10;
const MAX_DISPATCH_ATTEMPTS = 5;

type DispatchOutcome =
  | { jobId: string; outcome: "dispatched"; runpodJobId: string }
  | { jobId: string; outcome: "stitched" }
  | { jobId: string; outcome: "stitch_failed"; error: string }
  | { jobId: string; outcome: "insufficient_credits" }
  | { jobId: string; outcome: "already_claimed" }
  | { jobId: string; outcome: "dispatch_failed_permanent"; error: string }
  | { jobId: string; outcome: "dispatch_failed_retryable"; error: string }
  | { jobId: string; outcome: "unexpected_error"; error: string };

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Non-terminal projects get a poll every tick, before the main dispatch
  // loop below - advanceProject is otherwise only triggered reactively
  // (a job completing, a scene draft being saved), so a project blocked
  // purely on some OTHER job occupying this user's one in-flight slot
  // (create-job.ts's MAX_CONCURRENT_JOBS_PER_USER) would never resume on
  // its own once that slot frees up. Cheap: most calls are a no-op (the
  // project is already waiting on something real, like an unfinished
  // scene draft) and any job this creates is picked up by the very same
  // tick's `candidates` query right below.
  const activeProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.status, ["draft", "generating", "stitching"]));
  for (const p of activeProjects) {
    await advanceProject(p.id);
  }

  const candidates = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.status, "queued"))
    .orderBy(asc(generationJobs.createdAt))
    .limit(BATCH_SIZE);

  const results: DispatchOutcome[] = [];

  for (const job of candidates) {
    const acquired = await tryAcquireGlobalSlot();
    if (!acquired) {
      console.log("[cron/dispatch] global concurrency ceiling reached, stopping this tick");
      break;
    }

    try {
      // The `AND status='queued'` guard is what makes this safe against
      // overlapping cron invocations - only one of them can ever win the
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
        results.push({ jobId: job.id, outcome: "already_claimed" });
        continue;
      }

      const cost = CREDIT_COST_BY_TYPE[claimed.type];
      const reserve = await reserveCredits({ jobId: claimed.id, userId: claimed.userId, type: claimed.type });
      if (!reserve.ok) {
        await db
          .update(generationJobs)
          .set({ status: "failed", error: "insufficient_credits", updatedAt: new Date() })
          .where(eq(generationJobs.id, claimed.id));
        await releaseGlobalSlot();
        results.push({ jobId: claimed.id, outcome: "insufficient_credits" });
        console.log(`[cron/dispatch] job ${claimed.id} failed: insufficient_credits`);
        continue;
      }

      // "stitch" never goes to RunPod - it's fast, CPU-only ffmpeg
      // concatenation, run in-process (see src/lib/stitch.ts). It resolves
      // synchronously within this same tick, so it goes straight through
      // applyRunpodResult (credits/output/project-advancement) instead of
      // the async dispatch-then-wait-for-webhook path below.
      if (claimed.type === "stitch") {
        try {
          const result = await runStitchJob({ userId: claimed.userId, input: claimed.input as StitchJobInput });
          await applyRunpodResult(claimed, result);
          if (result.status === "COMPLETED" && !result.output?.error) {
            results.push({ jobId: claimed.id, outcome: "stitched" });
          } else {
            results.push({ jobId: claimed.id, outcome: "stitch_failed", error: result.output?.error ?? "unknown" });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await applyRunpodResult(claimed, { id: claimed.id, status: "FAILED", output: { error: message } });
          results.push({ jobId: claimed.id, outcome: "stitch_failed", error: message });
        }
        continue;
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
        results.push({ jobId: claimed.id, outcome: "dispatched", runpodJobId });
        console.log(
          `[cron/dispatch] job ${claimed.id} type=${claimed.type} dispatched runpodJobId=${runpodJobId} estimatedCredits=${cost}`
        );
        // Slot intentionally NOT released here - it's held for the life of
        // the job ("warming"/"processing") and released by the webhook or
        // the stale-job sweep once the job reaches a terminal state.
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
          results.push({ jobId: claimed.id, outcome: "dispatch_failed_permanent", error: dispatchErr.message });
        } else {
          await refundReservedCredits({ userId: claimed.userId, estimatedCredits: cost });
          await db
            .update(generationJobs)
            .set({ status: "queued", updatedAt: new Date() })
            .where(eq(generationJobs.id, claimed.id));
          results.push({ jobId: claimed.id, outcome: "dispatch_failed_retryable", error: dispatchErr.message });
        }
        await releaseGlobalSlot();
        console.error(`[cron/dispatch] job ${claimed.id} dispatch failed (permanent=${permanent}):`, dispatchErr);
      }
    } catch (err) {
      await releaseGlobalSlot();
      const message = err instanceof Error ? err.message : String(err);
      results.push({ jobId: job.id, outcome: "unexpected_error", error: message });
      console.error(`[cron/dispatch] unexpected error processing job ${job.id}:`, err);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
