import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { projects, projectClips, generationJobs } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { tryAdvanceProject } from "@/lib/projects";
import { checkRateLimit, generalApiLimit } from "@/lib/rate-limit";

// Adds one clip to the end of a project - either a slot to author a new
// scene into later (source="generate", PATCH .../clips/[clipId] fills it
// in), or a clip reusing one of the user's own past completed video jobs
// (source="existing", copies its outputStorageKey now so the clip doesn't
// depend on that job continuing to exist/be unclaimed by another project).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(generalApiLimit, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (body?.source !== "generate" && body?.source !== "existing") {
    return NextResponse.json({ error: 'source must be "generate" or "existing"' }, { status: 400 });
  }

  let existingOutputStorageKey: string | null = null;
  if (body.source === "existing") {
    const existingJobId = body.existingJobId;
    if (typeof existingJobId !== "string") {
      return NextResponse.json({ error: "existingJobId is required for source=\"existing\"" }, { status: 400 });
    }
    const [existingJob] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.id, existingJobId), eq(generationJobs.userId, userId)));
    if (!existingJob || existingJob.type !== "video" || existingJob.status !== "done" || !existingJob.outputStorageKey) {
      return NextResponse.json({ error: "That job isn't a completed video you own" }, { status: 400 });
    }
    existingOutputStorageKey = existingJob.outputStorageKey;
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${projectClips.orderIndex}), -1) + 1` })
    .from(projectClips)
    .where(eq(projectClips.projectId, projectId));

  const [clip] = await db
    .insert(projectClips)
    .values({
      projectId,
      orderIndex: next,
      source: body.source,
      existingOutputStorageKey,
    })
    .returning();

  if (body.source === "existing") {
    await tryAdvanceProject(projectId); // might already be the last piece needed to stitch
  }

  return NextResponse.json({ clip });
}
