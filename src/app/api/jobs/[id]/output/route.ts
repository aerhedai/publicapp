import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { assertOwnsKey, createPresignedDownload } from "@/storage/r2";

// Returns a short-lived presigned GET URL for a completed job's output -
// never the raw outputStorageKey (the bucket is private). Same
// ownership-baked-into-the-query pattern as api/jobs/[id]/route.ts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [job] = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.userId, userId)));

  if (!job || job.status !== "done" || !job.outputStorageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  assertOwnsKey(userId, job.outputStorageKey);
  const url = await createPresignedDownload(job.outputStorageKey, 600);

  return NextResponse.json({ url, type: job.type });
}
