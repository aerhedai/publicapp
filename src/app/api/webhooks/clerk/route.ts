import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users, uploads, generationJobs } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { deleteUserObjects } from "@/storage/r2";

// Verifies the request actually came from Clerk before touching the
// database - this endpoint is public (see src/proxy.ts's public-route
// allowlist) precisely because it authenticates itself this way instead
// of via a user session.
export async function POST(req: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(signingSecret);

  try {
    // svix's verify() only validates and throws on failure - it does not
    // return the parsed payload (confirmed by reading node_modules/svix's
    // source; its return type is literally `undefined`), so the body has
    // to be parsed separately once verification succeeds.
    wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  const event = JSON.parse(body) as WebhookEvent;

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses } = event.data;
      const email = email_addresses[0]?.email_address ?? "";
      await db.insert(users).values({ id, email }).onConflictDoNothing();
      break;
    }
    case "user.updated": {
      const { id, email_addresses } = event.data;
      const email = email_addresses[0]?.email_address ?? "";
      await db.update(users).set({ email }).where(eq(users.id, id));
      break;
    }
    case "user.deleted": {
      const userId = event.data.id;
      if (userId) {
        // Collect every R2 key this user owns BEFORE the DB delete below -
        // once the users row is gone, the cascade takes uploads/generationJobs
        // with it and there'd be no record left of what to clean up in R2.
        const [ownedUploads, ownedJobOutputs] = await Promise.all([
          db.select({ key: uploads.storageKey }).from(uploads).where(eq(uploads.userId, userId)),
          db
            .select({ key: generationJobs.outputStorageKey })
            .from(generationJobs)
            .where(and(eq(generationJobs.userId, userId), isNotNull(generationJobs.outputStorageKey))),
        ]);

        const keys = [
          ...ownedUploads.map((u) => u.key),
          ...ownedJobOutputs.map((j) => j.key).filter((k): k is string => k !== null),
        ];

        if (keys.length > 0) {
          await deleteUserObjects(userId, keys);
        }

        await db.delete(users).where(eq(users.id, userId));
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
