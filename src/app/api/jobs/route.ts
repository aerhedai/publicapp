import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { ensureUserRow } from "@/lib/ensure-user";
import { checkContentPolicy } from "@/lib/content-policy";

// A user's own in-flight statuses - not a mutable "balance" style flag,
// just the set of rows that count against their concurrency cap.
const IN_FLIGHT_STATUSES = ["queued", "warming", "processing"] as const;
const MAX_CONCURRENT_JOBS_PER_USER = 1;

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

  // Rejected here, before ensureUserRow/insert, so a policy-violating
  // request never occupies a queued slot or risks being billed.
  const policy = checkContentPolicy(body.input);
  if (!policy.allowed) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  // Distinct from the request-rate limit above - this counts the user's own
  // not-yet-finished rows (a WHERE-clause filter, same ownership style as
  // every other query here), not requests-per-minute. A different error
  // code than the generic rate-limit 429 so the frontend can show a
  // different message ("you already have a generation running" vs "slow down").
  const inFlight = await db
    .select({ id: generationJobs.id })
    .from(generationJobs)
    .where(and(eq(generationJobs.userId, userId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)));
  if (inFlight.length >= MAX_CONCURRENT_JOBS_PER_USER) {
    return NextResponse.json(
      { error: "concurrent_limit", message: "You already have a generation in progress" },
      { status: 429 }
    );
  }

  await ensureUserRow(userId);

  const [job] = await db
    .insert(generationJobs)
    .values({
      userId,
      type: body.type,
      input: body.input,
      createsReferenceLabel: body.createsReferenceLabel?.trim() ?? null,
    })
    .returning();

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
