import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { characterReferences } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { assertOwnsKey, createPresignedDownload } from "@/storage/r2";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { ensureUserRow } from "@/lib/ensure-user";

// Registers an already-uploaded R2 object (via the existing presigned-upload
// flow in /api/uploads) as a reusable media reference - the picker modal's
// persistent "Uploads" library (src/components/console/create/media-picker-modal.tsx).
// `label` is now just a display caption (defaults to the storage key's own
// filename segment) - matching a specific reference happens via @Image1/
// @Audio1 tags resolved against the current compose session's attachment
// order (src/lib/scene-validation.ts's resolveReferenceTags), never by name.
// Generated references (from a "mint a portrait" job) are inserted directly
// by src/lib/apply-job-result.ts instead - this route is the upload-side path only.
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
  if (!body || typeof body.storageKey !== "string" || !body.storageKey.trim()) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (body.label !== undefined && typeof body.label !== "string") {
    return NextResponse.json({ error: "label must be a string" }, { status: 400 });
  }
  if (body.mediaType !== undefined && body.mediaType !== "image" && body.mediaType !== "audio") {
    return NextResponse.json({ error: 'mediaType must be "image" or "audio"' }, { status: 400 });
  }

  try {
    assertOwnsKey(userId, body.storageKey);
  } catch {
    return NextResponse.json({ error: "storageKey does not belong to this user" }, { status: 403 });
  }

  await ensureUserRow(userId);

  const label = (typeof body.label === "string" ? body.label.trim() : "") || body.storageKey.split("/").pop() || "Untitled";

  const [reference] = await db
    .insert(characterReferences)
    .values({
      userId,
      label,
      mediaType: body.mediaType ?? "image",
      storageKey: body.storageKey,
      source: "uploaded",
    })
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

  // Eagerly presigned (not lazily per-card like output-preview.tsx) - this
  // is the picker modal's "Uploads" tab, a small personal library, not a
  // paginated feed, so one response with every thumbnail ready is simpler
  // than N lazy per-card fetches.
  const references = await Promise.all(
    rows.map(async (row) => ({ ...row, url: await createPresignedDownload(row.storageKey, 600) }))
  );

  return NextResponse.json({ references });
}
