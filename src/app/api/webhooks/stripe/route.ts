import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db/client";
import { creditLedger, subscriptions, subscriptionStatus } from "@/db/schema";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { getPricingTier } from "@/lib/pricing-tiers";

// Stripe's subscription.status has more values (trialing, incomplete_expired,
// unpaid) than this app's enum tracks - collapse anything not explicitly
// handled to the closest of our 4, so an upsert never fails on an unmapped
// value we don't currently distinguish in the UI.
function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): (typeof subscriptionStatus.enumValues)[number] {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}

// current_period_end lives on the Subscription's items, not the top-level
// object, as of this installed SDK's API version (confirmed by reading
// node_modules/stripe's own .d.ts - flexible billing mode moved it off
// Subscription itself since a subscription can now have items on different
// billing cycles).
function getCurrentPeriodEnd(sub: Stripe.Subscription): Date {
  const seconds = sub.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000) : new Date();
}

async function upsertSubscriptionRow(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  const tierId = sub.metadata?.tierId;
  if (!userId || !tierId) return; // not one of ours (e.g. created outside Checkout) - nothing to track

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      tierId,
      status: mapSubscriptionStatus(sub.status),
      currentPeriodEnd: getCurrentPeriodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        tierId,
        status: mapSubscriptionStatus(sub.status),
        currentPeriodEnd: getCurrentPeriodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });
}

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

  switch (event.type) {
    // Fulfillment lives here, not on the success page - a customer isn't
    // guaranteed to ever load it (stripe-best-practices skill). Handle both
    // completed and the delayed-notification async-success event, and gate
    // on payment_status so a not-yet-paid "completed" session (some payment
    // methods notify async) never grants credits early.
    //
    // Only the one_time path grants credits here - a subscription's first
    // cycle is fulfilled by invoice.paid below (same event that fires every
    // renewal), so granting here too would double-credit month 1.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && session.payment_status !== "unpaid") {
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
      // mode === "subscription": nothing to do here - customer.subscription.created
      // (below) creates the subscriptions row, invoice.paid grants the credits.
      break;
    }
    // checkout.session.async_payment_failed: nothing to do - credits were
    // never granted (only completed/async_payment_succeeded grant them), so
    // there's nothing to reverse.

    // Fires on every successful subscription invoice - the first one AND
    // every renewal - so this is the one place subscription credits are
    // granted, keyed idempotently on invoice.id (Stripe redelivers).
    //
    // invoice.lines.data[].pricing.price_details.price on this API version
    // is just a Price *id* string, not an expanded object (confirmed by
    // reading node_modules/stripe's own .d.ts), so credits can't be read off
    // a Price's metadata here without an extra API call. Instead this reads
    // `invoice.parent.subscription_details.metadata` - an immutable snapshot
    // of the *Subscription's* metadata (set via subscription_data.metadata
    // in the checkout route) - to get tierId, then resolves credits from
    // pricing-tiers.ts, this app's own single source of truth.
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionMetadata = invoice.parent?.subscription_details?.metadata;
      const userId = subscriptionMetadata?.userId;
      const tierId = subscriptionMetadata?.tierId;
      const credits = tierId ? getPricingTier(tierId)?.credits : undefined;
      if (userId && credits) {
        await db
          .insert(creditLedger)
          .values({ userId, delta: credits, reason: "stripe_subscription_renewal", externalRef: invoice.id })
          .onConflictDoNothing({ target: creditLedger.externalRef });
      }
      break;
    }

    // No credit action needed (nothing was granted for this cycle) -
    // customer.subscription.updated below reflects the resulting past_due
    // status for the account page to show.
    case "invoice.payment_failed":
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscriptionRow(sub);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
