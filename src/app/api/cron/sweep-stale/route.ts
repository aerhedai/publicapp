import { NextResponse } from "next/server";
import { and, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs, jobType } from "@/db/schema";
import { verifyCronSecret } from "@/lib/cron";
import { releaseGlobalSlot } from "@/lib/concurrency";
import { releaseCredits, CREDIT_COST_BY_TYPE } from "@/lib/credits";
import { getJobStatus, cancelJob, RunpodDispatchError } from "@/lib/runpod";
import { applyRunpodResult } from "@/lib/apply-job-result";

// Generous upper bound beyond the worker's own worst-case runtime
// (handler.py's COMFY_READY_TIMEOUT_S=600s cold-start budget +
// GENERATION_TIMEOUT_S=1800s generation budget = 2400s), so this sweep
// never races a legitimately still-running job - it only ever catches a
// job whose webhook genuinely never arrived.
const STALE_THRESHOLD_S_BY_TYPE: Record<(typeof jobType.enumValues)[number], number> = {
  image: 15 * 60,
  video: 45 * 60,
  stitch: 5 * 60, // ffmpeg concat of a few short clips is seconds of work - generous ceiling regardless
};

const BATCH_SIZE = 10;

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const oldestAllowedDispatch = new Date(
    now - Math.max(...Object.values(STALE_THRESHOLD_S_BY_TYPE)) * 1000
  );

  // Coarse pre-filter using the loosest (largest) threshold - the per-type
  // exact cutoff is re-checked in the loop below since types have different
  // budgets.
  const candidates = await db
    .select()
    .from(generationJobs)
    .where(
      and(
        inArray(generationJobs.status, ["warming", "processing"]),
        lt(generationJobs.dispatchedAt, oldestAllowedDispatch)
      )
    )
    .limit(BATCH_SIZE);

  const results: Array<{ jobId: string; outcome: string }> = [];

  for (const job of candidates) {
    const thresholdS = STALE_THRESHOLD_S_BY_TYPE[job.type];
    const ageS = job.dispatchedAt ? (now - job.dispatchedAt.getTime()) / 1000 : Infinity;
    if (ageS < thresholdS) {
      continue; // pre-filter used the loosest threshold - this type's own is stricter and not yet exceeded
    }

    if (job.settleLedgerId) {
      // Already resolved by a race with the webhook between our SELECT and now.
      results.push({ jobId: job.id, outcome: "already_settled" });
      continue;
    }

    if (job.type === "stitch") {
      // Never gets a runpodJobId - it doesn't dispatch to RunPod at all
      // (src/lib/stitch.ts runs in-process). Reaching this sweep means the
      // ffmpeg run crashed or the function was killed mid-flight without
      // ever calling applyRunpodResult - fail it directly, no RunPod calls
      // to make. The user re-triggers the stitch from the project UI.
      await applyRunpodResult(job, { id: job.id, status: "FAILED", output: { error: "stitch_timed_out" } });
      results.push({ jobId: job.id, outcome: "stitch_timed_out" });
      console.error(`[cron/sweep-stale] stitch job ${job.id} timed out after ${Math.round(ageS)}s with no result`);
      continue;
    }

    if (!job.runpodJobId) {
      // Used to be treated as "can't happen" and skipped outright - but it
      // can: a dispatch whose /run request to RunPod hangs (see runpod.ts's
      // dispatchJob, which previously had no fetch timeout at all) gets
      // killed by the platform before the catch block that would normally
      // release the slot/credits ever runs, leaving a row claimed
      // ("warming") with no runpodJobId to ever poll - confirmed live via
      // RunPod's own endpoint-health showing zero jobs in queue/in progress
      // for a row stuck exactly like this. With nothing to check RunPod's
      // side for, this is an unrecoverable lost dispatch - refund and fail
      // it the same way a permanent dispatch error would, same as
      // dispatch-one-job.ts's own `dispatch_failed_permanent` path.
      const cost = job.estimatedCredits ?? CREDIT_COST_BY_TYPE[job.type];
      await releaseCredits({ jobId: job.id, userId: job.userId, estimatedCredits: cost, error: "dispatch_lost_no_runpod_job_id" });
      await releaseGlobalSlot();
      results.push({ jobId: job.id, outcome: "dispatch_lost_no_runpod_job_id" });
      console.error(`[cron/sweep-stale] job ${job.id} had no runpodJobId after ${Math.round(ageS)}s - lost dispatch, refunded`);
      continue;
    }

    try {
      const status = await getJobStatus(job.type, job.runpodJobId);
      const cost = job.estimatedCredits ?? CREDIT_COST_BY_TYPE[job.type];

      if (status.status === "COMPLETED" || status.status === "FAILED") {
        await applyRunpodResult(job, status);
        results.push({ jobId: job.id, outcome: `resolved_${status.status.toLowerCase()}` });
        console.log(`[cron/sweep-stale] job ${job.id} resolved via sweep (lost webhook), runpod status=${status.status}`);
      } else if (status.status === "NOT_FOUND") {
        // RunPod has no record of this job at all (purged after its own
        // retention window) - unrecoverable, nothing left to cancel.
        await releaseCredits({
          jobId: job.id,
          userId: job.userId,
          estimatedCredits: cost,
          error: "runpod_job_not_found",
        });
        await releaseGlobalSlot();
        results.push({ jobId: job.id, outcome: "runpod_job_not_found" });
        console.error(`[cron/sweep-stale] job ${job.id} - RunPod has no record of runpodJobId=${job.runpodJobId}`);
      } else {
        // Still not terminal despite exceeding this type's own worst-case
        // runtime budget - genuinely stuck, not just a slow webhook.
        await cancelJob(job.type, job.runpodJobId);
        await releaseCredits({
          jobId: job.id,
          userId: job.userId,
          estimatedCredits: cost,
          error: "timed_out_no_callback",
        });
        await releaseGlobalSlot();
        results.push({ jobId: job.id, outcome: "timed_out_no_callback" });
        console.error(`[cron/sweep-stale] job ${job.id} timed out after ${Math.round(ageS)}s, cancelled`);
      }
    } catch (err) {
      const message = err instanceof RunpodDispatchError ? err.message : String(err);
      results.push({ jobId: job.id, outcome: "unexpected_error" });
      console.error(`[cron/sweep-stale] unexpected error processing job ${job.id}:`, message);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
