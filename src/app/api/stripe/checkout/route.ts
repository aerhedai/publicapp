import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

  const body = (await req.json().catch(() => null)) as { tierId?: string } | null;
  const tier = body?.tierId ? getPricingTier(body.tierId) : undefined;
  if (!tier) {
    return NextResponse.json({ error: "Unknown pricing tier" }, { status: 400 });
  }

  const baseUrl = getAppBaseUrl();
  const stripe = getStripeClient();

  // One-time payment (a credit-pack purchase, not a subscription) - Checkout
  // Sessions with inline price_data, no pre-created Stripe Product/Price
  // needed since pricing-tiers.ts is already the single source of truth.
  // payment_method_types intentionally omitted (stripe-best-practices skill:
  // never pass it, dynamic payment methods is the correct default).
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: userId,
    metadata: { userId, tierId: tier.id, credits: String(tier.credits) },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: tier.priceCents,
          product_data: {
            name: `${tier.name} - ${tier.credits} credits`,
          },
        },
      },
    ],
    success_url: `${baseUrl}/console/account/pricing?checkout=success`,
    cancel_url: `${baseUrl}/console/account/pricing?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
