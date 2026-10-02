import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs, characterReferences, projectClips } from "@/db/schema";
import { CREDIT_COST_BY_TYPE, releaseCredits } from "@/lib/credits";
import { releaseGlobalSlot } from "@/lib/concurrency";
import { advanceProject, finalizeStitchJob } from "@/lib/projects";
import type { RunpodJobStatus } from "@/lib/runpod";
import { checkImageOutputSafety } from "@/lib/output-moderation";
import { createPresignedDownload, deleteUserObjects } from "@/storage/r2";

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
    if (job.type === "stitch") {
      await finalizeStitchJob({ id: job.id, status: "failed" });
    } else {
      await advanceProjectForJob(job.projectClipId);
    }
    return;
  }

  // Output-side moderation - only for images (see output-moderation.ts's own
  // docstring on why video/stitch aren't covered). A second, separate gate
  // from the generic failure check above: the job succeeded at the RunPod
  // level, but its rendered output still needs to clear this before "done"
  // is allowed to mean "shown to the user".
  if (job.type === "image") {
    const previewUrl = await createPresignedDownload(output.outputStorageKey!, 300);
    const moderation = await checkImageOutputSafety(previewUrl);
    if (!moderation.allowed) {
      await releaseCredits({
        jobId: job.id,
        userId: job.userId,
        estimatedCredits: cost,
        error: moderation.reason ?? "Blocked by output safety check",
      });
      await releaseGlobalSlot();
      // Already uploaded to R2 by the worker before this check ran (unlike
      // an ordinary generation failure, which never produces an object) -
      // delete it rather than leaving a flagged image sitting in the bucket.
      await deleteUserObjects(job.userId, [output.outputStorageKey!]);
      await advanceProjectForJob(job.projectClipId);
      return;
    }
  }

  // reserveLedgerId is guaranteed non-null here - a job can only reach
  // "warming"/"processing" (and therefore get a RunPod webhook at all) after
  // going through reserveCredits in the dispatch route.
  //
  // settleLedgerId and status/outputStorageKey used to be two SEPARATE
  // sequential update() calls - if anything interrupted execution between
  // them (a platform-level kill, same class of bug as dispatchJob's
  // previously-missing fetch timeout), a row could end up with
  // settleLedgerId set (so the idempotency guard above correctly refuses to
  // re-process it) but status still stuck non-terminal forever, with no
  // recovery path at all - confirmed live: a real job stuck exactly like
  // this, found via sweep-stale reporting "already_settled" on a row the
  // user could still see as "generating". One update now, so the two can
  // never be split by an interruption.
  await db
    .update(generationJobs)
    .set({
      settleLedgerId: job.reserveLedgerId!,
      status: "done",
      outputStorageKey: output.outputStorageKey,
      runpodExecMs: payload.executionTime ?? output.comfyExecMs ?? null,
      seed: output.seed ?? null,
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
  if (job.type === "stitch") {
    await finalizeStitchJob({ id: job.id, status: "done" });
  } else {
    await advanceProjectForJob(job.projectClipId);
  }
}

/** Resolves a job's projectClipId to its project and advances that
 * project's state machine - a no-op for the (most common) standalone job
 * that isn't part of a project. */
async function advanceProjectForJob(projectClipId: string | null): Promise<void> {
  if (!projectClipId) return;
  const [clip] = await db.select().from(projectClips).where(eq(projectClips.id, projectClipId));
  if (!clip) return;
  await advanceProject(clip.projectId);
}
