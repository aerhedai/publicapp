import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";

function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error("APP_BASE_URL is not set and VERCEL_URL is unavailable");
}

// Self-service upgrade/downgrade/cancel, per the stripe-best-practices
// skill's explicit recommendation over hand-building that UI - Stripe's own
// Customer Portal handles proration, payment method updates, and invoice
// history for free.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(expensiveActionLimit, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (!sub) {
    return NextResponse.json({ error: "No subscription on file" }, { status: 404 });
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${getAppBaseUrl()}/console/account/plan`,
  });

  return NextResponse.json({ url: session.url });
}
