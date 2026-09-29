import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { characterReferences } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertOwnsKey } from "@/storage/r2";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { ensureUserRow } from "@/lib/ensure-user";

// Registers an already-uploaded R2 object (via the existing presigned-upload
// flow in /api/uploads) as a labeled, reusable character reference. Generated
// references (from a "mint a portrait" job) are inserted directly by
// src/lib/apply-job-result.ts instead - this route is the upload-side path only.
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
  if (!body || typeof body.label !== "string" || !body.label.trim() || typeof body.storageKey !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    assertOwnsKey(userId, body.storageKey);
  } catch {
    return NextResponse.json({ error: "storageKey does not belong to this user" }, { status: 403 });
  }

  await ensureUserRow(userId);

  const [reference] = await db
    .insert(characterReferences)
    .values({ userId, label: body.label.trim(), storageKey: body.storageKey, source: "uploaded" })
    .returning();

  return NextResponse.json({ reference });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(characterReferences)
    .where(eq(characterReferences.userId, userId))
    .orderBy(desc(characterReferences.createdAt));

  return NextResponse.json({ references: rows });
}
