import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * The `users` table is normally kept in sync by the Clerk webhook
 * (src/app/api/webhooks/clerk/route.ts), but webhook delivery isn't
 * instant or guaranteed - and locally it won't fire at all until you've
 * configured a webhook endpoint Clerk can reach. Any route that inserts a
 * row referencing users.id (uploads, generation_jobs) needs that row to
 * exist first, so call this before those inserts rather than assuming
 * the webhook already ran.
 *
 * Cheap in the common case: one indexed SELECT once the row already
 * exists, and only falls back to a Clerk API call + insert the first
 * time a given user is seen.
 */
export async function ensureUserRow(userId: string): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (existing) return;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  await db.insert(users).values({ id: userId, email }).onConflictDoNothing();
}
