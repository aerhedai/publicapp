import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { getCreditBalance } from "@/lib/credits";
import { imageCreditCost, videoCreditCost, VIDEO_MIN_DURATION_SECONDS, VIDEO_MAX_DURATION_SECONDS } from "@/lib/pricing-math";
import { getPricingTier } from "@/lib/pricing-tiers";
import { PricingTiersGrid } from "@/components/console/pricing-tiers-grid";
import { ManageBillingButton } from "@/components/console/manage-billing-button";

// Pulled from the same tables the app actually charges against
// (src/lib/credits.ts) rather than hardcoded copies - a hardcoded number on
// this exact page (and on the Support page) is what drifted wrong the first
// time this was repriced. Cost now depends on resolution (and, for video,
// duration too) - not a single flat number - so the FAQ states the real
// range rather than one misleading figure.
const FAQ: { q: string; a: string }[] = [
  {
    q: "What's a credit actually worth?",
    a: `1 credit = 1 image at 480p (the cheapest, smallest option); 768p images cost ${imageCreditCost("768p")} credits. Videos are priced per second - from ${videoCreditCost("480p", VIDEO_MIN_DURATION_SECONDS)} credits (480p, ${VIDEO_MIN_DURATION_SECONDS}s) up to ${videoCreditCost("768p", VIDEO_MAX_DURATION_SECONDS)} credits (768p, ${VIDEO_MAX_DURATION_SECONDS}s) - longer and higher-resolution videos cost more, shown live as you adjust the slider.`,
  },
  {
    q: "Subscription vs one-time top-up - what's the actual difference?",
    a: "Both add the same number of credits to the same balance. A subscription bills every month and refills automatically; a top-up is a single charge with no recurring billing. Pick whichever fits how you use the app - there's no discount for choosing one over the other beyond the tier you pick.",
  },
  {
    q: "Do credits expire or reset each month?",
    a: "No. Credits never expire and never reset - a subscription's monthly grant simply adds to whatever you already have, it doesn't wipe unused credits first.",
  },
  {
    q: "Can I change or cancel my plan?",
    a: "Yes, anytime, from Manage subscription above. That opens Stripe's own billing portal where you can switch tiers, update your payment method, or cancel - cancelling stops future renewals but any credits you already have stay in your account.",
  },
  {
    q: "What happens if I run out of credits mid-project?",
    a: "New generations are simply blocked until you top up or your subscription renews - you're never charged beyond your credit balance, and nothing partially runs.",
  },
];

export default async function PlanPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const [credits, [sub]] = await Promise.all([
    getCreditBalance(userId),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);

  const activeSub = sub && sub.status !== "canceled" ? sub : undefined;
  const subTier = activeSub ? getPricingTier(activeSub.tierId) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Credits work the same everywhere - spend them on images or videos, in any mix. Cost depends on the
          resolution (and, for video, duration) you pick - see the real breakdown below.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Credit balance</h2>
          <p className="mt-2 text-2xl font-semibold">{credits.toLocaleString()}</p>
        </div>
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Subscription</h2>
            <p className="mt-2 text-lg font-semibold">
              {activeSub && subTier ? `${subTier.name} - $${(subTier.priceCents / 100).toFixed(0)}/mo` : "None"}
            </p>
            {activeSub && (
              <p className="mt-1 text-xs text-muted-foreground">
                {activeSub.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
                {activeSub.currentPeriodEnd.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {activeSub.status === "past_due" && (
                  <span className="ml-2 text-amber-400">payment past due</span>
                )}
              </p>
            )}
          </div>
          {activeSub && (
            <div className="mt-4">
              <ManageBillingButton />
            </div>
          )}
        </div>
      </div>

      <PricingTiersGrid hasActiveSubscription={Boolean(activeSub)} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-medium">Cost per generation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Execution times are real, measured from this app&apos;s own workers; pricing is per-second for video.
          Picked in the settings popover when you generate.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm font-medium">Image - Flux.2 Klein</p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">480p (~4s)</span>
                <span className="font-semibold">{imageCreditCost("480p")} credit</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">768p (~10s)</span>
                <span className="font-semibold">{imageCreditCost("768p")} credits</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4">
            <p className="text-sm font-medium">Video - MiniMax H3</p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">480p, 4s (~40s)</span>
                <span className="font-semibold">{videoCreditCost("480p", 4)} credits</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">480p, 8s (~94s)</span>
                <span className="font-semibold">{videoCreditCost("480p", 8)} credits</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">768p, 4s (~125s)</span>
                <span className="font-semibold">{videoCreditCost("768p", 4)} credits</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">768p, 8s (~257s)</span>
                <span className="font-semibold">{videoCreditCost("768p", 8)} credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-medium">Questions</h2>
        <div className="mt-4 divide-y divide-border rounded-3xl border border-border bg-card">
          {FAQ.map((item) => (
            <div key={item.q} className="p-6">
              <p className="text-sm font-medium">{item.q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
