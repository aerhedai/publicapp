import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { uploads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createPresignedUpload, InvalidUploadError } from "@/storage/r2";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { ensureUserRow } from "@/lib/ensure-user";

// Client asks for a presigned URL, uploads directly to R2, then the app
// records the resulting key - the server never proxies the file bytes
// itself and never lets the client choose its own storage key.
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
  if (!body || typeof body.filename !== "string" || typeof body.contentType !== "string" || typeof body.sizeBytes !== "number") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureUserRow(userId);

    const { key, uploadUrl } = await createPresignedUpload({
      userId,
      filename: body.filename,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });

    await db.insert(uploads).values({
      userId,
      storageKey: key,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
    });

    return NextResponse.json({ key, uploadUrl });
  } catch (err) {
    if (err instanceof InvalidUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(desc(uploads.createdAt));

  return NextResponse.json({ uploads: rows });
}
