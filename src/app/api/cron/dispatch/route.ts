import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { verifyCronSecret } from "@/lib/cron";
import { tryAcquireGlobalSlot, releaseGlobalSlot } from "@/lib/concurrency";
import { CREDIT_COST_BY_TYPE, reserveCredits, releaseCredits, refundReservedCredits } from "@/lib/credits";
import { dispatchJob, RunpodDispatchError, type JobInput } from "@/lib/runpod";

// Generous upper bound on rows considered per tick - the global-slot check
// below is what actually gates how many get dispatched; jobs beyond
// available headroom are simply left "queued" for the next tick.
const BATCH_SIZE = 10;
const MAX_DISPATCH_ATTEMPTS = 5;

type DispatchOutcome =
  | { jobId: string; outcome: "dispatched"; runpodJobId: string }
  | { jobId: string; outcome: "insufficient_credits" }
  | { jobId: string; outcome: "already_claimed" }
  | { jobId: string; outcome: "dispatch_failed_permanent"; error: string }
  | { jobId: string; outcome: "dispatch_failed_retryable"; error: string }
  | { jobId: string; outcome: "unexpected_error"; error: string };

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      try {
        const { runpodJobId } = await dispatchJob({
          jobId: claimed.id,
          userId: claimed.userId,
          type: claimed.type,
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
