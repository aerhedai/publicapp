import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { deleteUserObjects } from "@/storage/r2";
import { checkRateLimit, generalApiLimit } from "@/lib/rate-limit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership is part of the WHERE clause, not a check after the fact - a
  // job that exists but belongs to someone else returns exactly the same
  // 404 as one that doesn't exist at all, so this endpoint can't be used
  // to enumerate other users' job ids.
  const [job] = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.userId, userId)));

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ job });
}

// Deletes a creation permanently - the Creations grid's hover-overlay
// delete button (creations-tabs.tsx). Only ever offered in the UI for a
// "done" tile, and enforced here too: an in-flight job's row must never be
// deleted out from under a dispatch that's still going to call back
// (the webhook/sweep would have nothing to apply its result to).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(generalApiLimit, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;

  const [job] = await db
    .select()
    .from(generationJobs)
    .where(and(eq(generationJobs.id, id), eq(generationJobs.userId, userId)));

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (job.status !== "done" && job.status !== "failed") {
    return NextResponse.json({ error: "Job is still in progress" }, { status: 409 });
  }

  if (job.outputStorageKey) {
    await deleteUserObjects(userId, [job.outputStorageKey]);
  }
  await db.delete(generationJobs).where(eq(generationJobs.id, id));

  return new NextResponse(null, { status: 204 });
}
