import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, projectClips, generationJobs } from "@/db/schema";
import { createGenerationJob } from "@/lib/create-job";
import { dispatchOneJob } from "@/lib/dispatch-one-job";
import type { PublicVideoScene } from "@/lib/scene-validation";

export interface SceneDraft {
  scene: PublicVideoScene;
  characterRefs: Record<string, string>;
}

export interface StitchJobInput {
  orderedKeys: string[];
}

/**
 * The project state machine's only mover. Called from two places:
 * applyRunpodResult (so every path a job can complete through - the
 * webhook, the stale-job sweep, and the in-process stitch execution -
 * advances the project for free), and tryAdvanceProject below (so saving a
 * scene's draft can immediately dispatch it when it's already that clip's
 * turn, instead of waiting for some other job to finish first).
 *
 * Relies on (and is why) MAX_CONCURRENT_JOBS_PER_USER = 1
 * (src/app/api/jobs/route.ts) - a project's "generate" clips are dispatched
 * one at a time, in order, never in parallel.
 */
export async function advanceProject(projectId: string): Promise<void> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.status === "done" || project.status === "failed") return;

  const clips = await db
    .select()
    .from(projectClips)
    .where(eq(projectClips.projectId, projectId))
    .orderBy(asc(projectClips.orderIndex));

  // Bail if any "generate" clip's job has already failed - no auto-retry,
  // the user re-triggers from the UI.
  for (const clip of clips) {
    if (clip.source !== "generate" || !clip.generationJobId) continue;
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, clip.generationJobId));
    if (job?.status === "failed") {
      await db.update(projects).set({ status: "failed", updatedAt: new Date() }).where(eq(projects.id, projectId));
      return;
    }
  }

  const nextToGenerate = clips.find((c) => c.source === "generate" && !c.generationJobId && c.sceneDraft);
  if (nextToGenerate) {
    const draft = nextToGenerate.sceneDraft as unknown as SceneDraft;
    // Same invariants as a live POST /api/jobs request (content policy +
    // the per-user in-flight cap credits.ts's non-transactional reserve
    // flow depends on) - see create-job.ts. A concurrent_limit result here
    // just means some OTHER job (in or out of this project) is still
    // in-flight for this user; the periodic project poll in
    // /api/cron/dispatch retries on the next tick rather than this call
    // ever blocking or failing loudly.
    const result = await createGenerationJob({
      userId: project.userId,
      type: "video",
      input: { scene: draft.scene, characterRefs: draft.characterRefs },
      projectClipId: nextToGenerate.id,
    });
    if (!result.ok) {
      if (result.reason === "content_policy") {
        await db
          .update(projects)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));
      }
      return;
    }
    await db
      .update(projectClips)
      .set({ generationJobId: result.job.id, updatedAt: new Date() })
      .where(eq(projectClips.id, nextToGenerate.id));
    if (project.status === "draft") {
      await db.update(projects).set({ status: "generating", updatedAt: new Date() }).where(eq(projects.id, projectId));
    }
    // Same reasoning as POST /api/jobs (src/app/api/jobs/route.ts): dispatch
    // immediately instead of leaving this "queued" for the cron's next
    // tick to find. Row updates above happen first so dispatchOneJob's
    // claim-guard sees a fully-consistent project/clip state regardless of
    // how fast it resolves. Best-effort - a failure here just leaves the
    // row "queued" for the cron to retry, same as before this existed.
    await dispatchOneJob(result.job);
    return;
  }

  // Nothing left to dispatch right now - either every "generate" clip is
  // done, or the next undispatched one hasn't been authored (no sceneDraft)
  // yet, in which case there's nothing to advance until the user finishes it.
  const resolvedKeys: string[] = [];
  for (const clip of clips) {
    if (clip.source === "existing") {
      if (!clip.existingOutputStorageKey) return; // shouldn't happen, but don't stitch a hole
      resolvedKeys.push(clip.existingOutputStorageKey);
      continue;
    }
    if (!clip.generationJobId) return; // not authored/dispatched yet - wait
    const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, clip.generationJobId));
    if (!job || job.status !== "done" || !job.outputStorageKey) return; // still in flight
    resolvedKeys.push(job.outputStorageKey);
  }

  if (project.stitchJobId) return; // already kicked off

  const stitchInput: StitchJobInput = { orderedKeys: resolvedKeys };
  const result = await createGenerationJob({ userId: project.userId, type: "stitch", input: stitchInput });
  if (!result.ok) return; // concurrent_limit - retried by the periodic project poll

  await db
    .update(projects)
    .set({ status: "stitching", stitchJobId: result.job.id, updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  // Stitch jobs run synchronously inside dispatchOneJob (no RunPod round
  // trip - see dispatch-one-job.ts's "stitch" branch), which calls
  // applyRunpodResult -> finalizeStitchJob before this returns.
  // finalizeStitchJob looks the project up by stitchJobId, so the update
  // above MUST happen first - dispatching before it would have
  // finalizeStitchJob query for a project row that doesn't have
  // stitchJobId set yet and silently no-op.
  await dispatchOneJob(result.job);
}

/** Thin wrapper so route handlers don't need to know advanceProject's
 * internals - called right after saving a clip's sceneDraft or registering
 * an "existing" clip, in case this was the piece the project was waiting on. */
export async function tryAdvanceProject(projectId: string): Promise<void> {
  await advanceProject(projectId);
}

/**
 * The stitch job itself has no projectClipId (it's the project's final
 * output, not one of its ordered clips - only project.stitchJobId points TO
 * it), so its completion needs its own hook rather than advanceProject's
 * clip-driven one. Called from applyRunpodResult whenever a completed job
 * has type="stitch".
 */
export async function finalizeStitchJob(stitchJob: { id: string; status: string }): Promise<void> {
  const [project] = await db.select().from(projects).where(eq(projects.stitchJobId, stitchJob.id));
  if (!project) return;
  await db
    .update(projects)
    .set({ status: stitchJob.status === "done" ? "done" : "failed", updatedAt: new Date() })
    .where(eq(projects.id, project.id));
}
