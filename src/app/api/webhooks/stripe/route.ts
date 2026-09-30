import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db/client";
import { creditLedger } from "@/db/schema";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

// Verifies the request actually came from Stripe before touching the
// database - same shape as the existing Clerk webhook (src/app/api/webhooks/
// clerk/route.ts), just Stripe's own signature scheme instead of svix.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Fulfillment lives here, not on the success page - a customer isn't
  // guaranteed to ever load it (stripe-best-practices skill). Handle both
  // completed and the delayed-notification async-success event, and gate
  // on payment_status so a not-yet-paid "completed" session (some payment
  // methods notify async) never grants credits early.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "unpaid") {
      const userId = session.metadata?.userId ?? session.client_reference_id;
      const credits = Number(session.metadata?.credits ?? 0);
      if (userId && credits > 0) {
        // externalRef = session.id + the unique index on it (schema.ts) is
        // what makes this safe against Stripe's at-least-once webhook
        // redelivery - a duplicate delivery for the same session is a
        // silent no-op, never a double credit.
        await db
          .insert(creditLedger)
          .values({ userId, delta: credits, reason: "stripe_checkout", externalRef: session.id })
          .onConflictDoNothing({ target: creditLedger.externalRef });
      }
    }
  }
  // checkout.session.async_payment_failed: nothing to do - credits were
  // never granted (only completed/async_payment_succeeded grant them), so
  // there's nothing to reverse.

  return NextResponse.json({ received: true });
}
