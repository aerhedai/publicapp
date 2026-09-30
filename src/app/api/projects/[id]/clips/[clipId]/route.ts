import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { projects, projectClips } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { tryAdvanceProject, type SceneDraft } from "@/lib/projects";
import { assertOwnsKey } from "@/storage/r2";

// Saves a "generate" clip's authored scene - called once the chat flow
// (VideoChat's dispatchOverride prop) reaches "ready" for this clip. Does
// NOT create a generation_jobs row itself; advanceProject decides when
// it's actually this clip's turn (scenes generate one at a time, in
// order - see projects.ts).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: projectId, clipId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [clip] = await db
    .select()
    .from(projectClips)
    .where(and(eq(projectClips.id, clipId), eq(projectClips.projectId, projectId)));
  if (!clip || clip.source !== "generate") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (clip.generationJobId) {
    return NextResponse.json({ error: "This clip has already started generating" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const sceneDraft = body?.sceneDraft as SceneDraft | undefined;
  if (!sceneDraft?.scene || typeof sceneDraft.characterRefs !== "object") {
    return NextResponse.json({ error: "sceneDraft: {scene, characterRefs} is required" }, { status: 400 });
  }
  // characterRefs values are R2 storage keys at this point (not yet
  // presigned - that happens at actual dispatch time, same as the
  // standalone flow's VideoJobInput) - verify ownership now, not later,
  // so a bad reference fails the save instead of surfacing much later
  // inside advanceProject's dispatch.
  for (const key of Object.values(sceneDraft.characterRefs)) {
    assertOwnsKey(userId, key);
  }

  await db
    .update(projectClips)
    .set({ sceneDraft, updatedAt: new Date() })
    .where(eq(projectClips.id, clipId));

  await tryAdvanceProject(projectId);

  return NextResponse.json({ ok: true });
}
