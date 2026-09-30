import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, users } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe";
import { getPricingTier } from "@/lib/pricing-tiers";

function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error("APP_BASE_URL is not set and VERCEL_URL is unavailable");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { tierId?: string; billingMode?: string } | null;
  const tier = body?.tierId ? getPricingTier(body.tierId) : undefined;
  if (!tier) {
    return NextResponse.json({ error: "Unknown pricing tier" }, { status: 400 });
  }
  // Both purchase paths add to the same credit balance - subscription
  // renews it monthly (via the invoice.paid webhook handler), one_time
  // grants it once (via checkout.session.completed, unchanged from before).
  const billingMode = body?.billingMode === "subscription" ? "subscription" : "one_time";

  const baseUrl = getAppBaseUrl();
  const stripe = getStripeClient();

  // Reuse an existing Stripe customer if this user already has one (from a
  // prior subscription), so re-subscribing after a cancellation doesn't
  // fragment their billing history across two Customer objects.
  const [existing] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  let customerEmail: string | undefined;
  if (!existing) {
    const [userRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
    customerEmail = userRow?.email;
  }

  // Reference the real pre-created Stripe Prices (not inline price_data) -
  // required for the subscription path (a recurring Price is what defines
  // renewal terms going forward, including for Customer Portal
  // upgrade/downgrade), and used for one-time too for consistency: every
  // Price already carries {appTierId, credits, mode} metadata set at
  // creation, which the webhook reads directly off invoice line items
  // instead of trusting Checkout Session metadata alone.
  const priceId = billingMode === "subscription" ? tier.stripePriceIdMonthly : tier.stripePriceIdOneTime;

  const session = await stripe.checkout.sessions.create({
    mode: billingMode === "subscription" ? "subscription" : "payment",
    client_reference_id: userId,
    customer: existing?.stripeCustomerId,
    customer_email: existing ? undefined : customerEmail,
    metadata: { userId, tierId: tier.id, credits: String(tier.credits) },
    // Only meaningful for mode:"subscription" - Checkout Session metadata
    // isn't copied onto the Subscription object, but customer.subscription.*
    // webhooks need userId/tierId to upsert the subscriptions table, so it's
    // set explicitly here too.
    subscription_data:
      billingMode === "subscription" ? { metadata: { userId, tierId: tier.id } } : undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/console/account/plan?checkout=success`,
    cancel_url: `${baseUrl}/console/account/plan?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
