import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { projects, projectClips, generationJobs } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { createPresignedDownload } from "@/storage/r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership baked into the query, same pattern as api/jobs/[id] - a
  // foreign project id 404s identically to a nonexistent one.
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clips = await db
    .select()
    .from(projectClips)
    .where(eq(projectClips.projectId, id))
    .orderBy(asc(projectClips.orderIndex));

  const jobIds = [
    ...clips.map((c) => c.generationJobId).filter((j): j is string => !!j),
    ...(project.stitchJobId ? [project.stitchJobId] : []),
  ];
  const jobs = jobIds.length > 0 ? await db.select().from(generationJobs).where(inArray(generationJobs.id, jobIds)) : [];
  const jobsById = new Map(jobs.map((j) => [j.id, j]));

  // Presigned inline, here, rather than a separate per-clip route - keeps
  // the storyboard UI to one fetch per poll instead of N+1.
  async function previewUrlFor(outputStorageKey: string | null | undefined): Promise<string | null> {
    if (!outputStorageKey) return null;
    return createPresignedDownload(outputStorageKey, 600);
  }

  const stitchJob = project.stitchJobId ? (jobsById.get(project.stitchJobId) ?? null) : null;

  return NextResponse.json({
    project: {
      ...project,
      stitchJob,
      previewUrl: await previewUrlFor(stitchJob?.outputStorageKey),
    },
    clips: await Promise.all(
      clips.map(async (clip) => {
        const generationJob = clip.generationJobId ? (jobsById.get(clip.generationJobId) ?? null) : null;
        const outputKey = clip.source === "existing" ? clip.existingOutputStorageKey : generationJob?.outputStorageKey;
        return { ...clip, generationJob, previewUrl: await previewUrlFor(outputKey) };
      })
    ),
  });
}
