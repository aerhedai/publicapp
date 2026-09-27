import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { ensureUserRow } from "@/lib/ensure-user";
import { checkContentPolicy } from "@/lib/content-policy";

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

  // Rejected here, before ensureUserRow/insert, so a policy-violating
  // request never occupies a queued slot or risks being billed.
  const policy = checkContentPolicy(body.input);
  if (!policy.allowed) {
    return NextResponse.json({ error: policy.reason }, { status: 400 });
  }

  await ensureUserRow(userId);

  const [job] = await db
    .insert(generationJobs)
    .values({ userId, type: body.type, input: body.input })
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
