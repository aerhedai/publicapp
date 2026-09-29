import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs, characterReferences } from "@/db/schema";
import { CREDIT_COST_BY_TYPE, confirmCredits, releaseCredits } from "@/lib/credits";
import { releaseGlobalSlot } from "@/lib/concurrency";
import type { RunpodJobStatus } from "@/lib/runpod";

/**
 * Applies a RunPod job's terminal result to our row - shared by the webhook
 * receiver (the happy path) and the stale-job sweep (the fallback for a
 * lost/never-delivered webhook), so a job can only ever be resolved one way,
 * through one code path. Callers must check `job.settleLedgerId === null`
 * themselves first (the idempotency guard) - this function always applies
 * unconditionally.
 *
 * Whether the RunPod SDK auto-fails a job on the handler returning
 * `{error: ...}` vs reporting COMPLETED with the error nested in `output`
 * was an open question when this was written (see the PART 2 plan's own
 * note) - checking both `status !== "COMPLETED"` and `output?.error` covers
 * either behavior without needing to have resolved that ahead of time.
 */
export async function applyRunpodResult(
  job: typeof generationJobs.$inferSelect,
  payload: RunpodJobStatus
): Promise<void> {
  const cost = job.estimatedCredits ?? CREDIT_COST_BY_TYPE[job.type];
  const output = payload.output;
  const failed = payload.status !== "COMPLETED" || !!output?.error || !output?.outputStorageKey;

  if (failed) {
    const errorMessage = output?.error ?? `RunPod job ended with status ${payload.status}`;
    await releaseCredits({ jobId: job.id, userId: job.userId, estimatedCredits: cost, error: errorMessage });
    await releaseGlobalSlot();
    return;
  }

  // reserveLedgerId is guaranteed non-null here - a job can only reach
  // "warming"/"processing" (and therefore get a RunPod webhook at all) after
  // going through reserveCredits in the dispatch route.
  await confirmCredits(job.id, job.reserveLedgerId!);
  await db
    .update(generationJobs)
    .set({
      status: "done",
      outputStorageKey: output.outputStorageKey,
      runpodExecMs: payload.executionTime ?? output.comfyExecMs ?? null,
      updatedAt: new Date(),
    })
    .where(eq(generationJobs.id, job.id));

  // This job's real purpose was minting a reusable reference photo (the
  // "generate a reference for N credits" flow), not just producing a normal
  // user-facing output - register it in the shared library so it's usable by
  // future image/video requests without re-uploading or regenerating.
  if (job.createsReferenceLabel) {
    await db.insert(characterReferences).values({
      userId: job.userId,
      label: job.createsReferenceLabel,
      storageKey: output.outputStorageKey!, // guaranteed non-null - `failed` already checked this above
      source: "generated",
      sourceJobId: job.id,
    });
  }

  await releaseGlobalSlot();
}
