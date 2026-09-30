import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { createGenerationJob } from "@/lib/create-job";
import { dispatchOneJob } from "@/lib/dispatch-one-job";

// `input` is intentionally untyped/generic here (see schema.ts) - the
// video-generation side of the app owns what shape it needs; this route
// just persists it and stamps ownership + status.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(expensiveActionLimit, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.input !== "object" || body.input === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (body.type !== "image" && body.type !== "video") {
    return NextResponse.json({ error: "type must be \"image\" or \"video\"" }, { status: 400 });
  }
  // Optional: marks this job as minting a new character reference rather
  // than (or in addition to) producing a normal user-facing output - see
  // src/lib/apply-job-result.ts, which inserts into character_references
  // when this is set and the job later completes successfully.
  if (body.createsReferenceLabel !== undefined && (typeof body.createsReferenceLabel !== "string" || !body.createsReferenceLabel.trim())) {
    return NextResponse.json({ error: "createsReferenceLabel must be a non-empty string" }, { status: 400 });
  }

  const result = await createGenerationJob({
    userId,
    type: body.type,
    input: body.input,
    createsReferenceLabel: body.createsReferenceLabel,
  });
  if (!result.ok) {
    const status = result.reason === "concurrent_limit" ? 429 : 400;
    return NextResponse.json({ error: result.reason, message: result.message }, { status });
  }

  // Best-effort immediate dispatch, right in this request - the common case
  // (no other job in flight, a global RunPod slot free) starts generating
  // within this same request instead of waiting for the next cron tick, so
  // "press generate" reflects real elapsed time instead of queue latency.
  // Never lets a dispatch hiccup fail the request: on any outcome other
  // than a clean dispatch the row is simply left as createGenerationJob set
  // it ("queued"), which /api/cron/dispatch's batch loop retries normally -
  // this call is an optimization, not something the client depends on.
  let job = result.job;
  try {
    const outcome = await dispatchOneJob(job);
    if (outcome.outcome === "dispatched" || outcome.outcome === "insufficient_credits") {
      const [fresh] = await db.select().from(generationJobs).where(eq(generationJobs.id, job.id));
      if (fresh) job = fresh;
    }
  } catch (err) {
    console.error(`[api/jobs] inline dispatch attempt threw for job ${job.id}:`, err);
  }

  return NextResponse.json({ job });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt));

  return NextResponse.json({ jobs: rows });
}
