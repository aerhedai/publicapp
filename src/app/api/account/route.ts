import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Self-service account deletion - the GDPR/CCPA right-to-erasure path that
// was previously missing entirely (deletion only ever happened via a human
// manually removing the user from Clerk's own dashboard). Deletes the Clerk
// user directly; the existing user.deleted webhook
// (src/app/api/webhooks/clerk/route.ts) does the actual cleanup (R2 objects,
// then the cascading DB delete) - this route doesn't duplicate that logic,
// it just triggers it the same way a dashboard deletion already does.
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  await clerk.users.deleteUser(userId);

  return new NextResponse(null, { status: 204 });
}
