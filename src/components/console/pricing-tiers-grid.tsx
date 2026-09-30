"use client";

import { useState } from "react";
import { PRICING_TIERS } from "@/lib/pricing-tiers";

type BillingMode = "subscription" | "one_time";

// Pulled out of the component so the React Compiler's purity check for
// memoized event handlers doesn't flag the navigation as an in-render
// mutation of `window`.
function redirectTo(url: string) {
  window.location.href = url;
}

// Both modes grant the same tier.credits into the same balance - the only
// difference is whether Stripe re-runs the charge automatically next month
// (subscription, via the invoice.paid webhook) or just once (one_time, via
// checkout.session.completed). See src/app/api/webhooks/stripe/route.ts.
export function PricingTiersGrid({ hasActiveSubscription }: { hasActiveSubscription: boolean }) {
  // A user who already has a Stripe subscription can't start a second one
  // through Checkout without ending up with two separate Subscription
  // objects billing them in parallel (our subscriptions table only tracks
  // one per user, keyed uniquely on userId - a 2nd Checkout subscription
  // would silently orphan the first, still billing, just untracked here).
  // Changing tiers on an existing subscription belongs in the Customer
  // Portal instead (see the "Manage subscription" button above this grid on
  // the plan page), so the toggle is locked to top-ups only in that case.
  const [mode, setMode] = useState<BillingMode>(hasActiveSubscription ? "one_time" : "subscription");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(tierId: string, billingMode: BillingMode) {
    setLoadingTier(tierId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, billingMode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't start checkout");
      }
      const { url } = await res.json();
      redirectTo(url);
    } catch (err) {
      setError((err as Error).message);
      setLoadingTier(null);
    }
  }

  return (
    <div>
      {hasActiveSubscription ? (
        <p className="text-center text-sm text-muted-foreground">
          You already have an active subscription - buy an extra one-time top-up below, or use{" "}
          <span className="text-foreground">Manage subscription</span> above to change or cancel your plan.
        </p>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              {(
                [
                  { id: "subscription" as const, label: "Monthly" },
                  { id: "one_time" as const, label: "One-time top-up" },
                ]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === opt.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {mode === "subscription" ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Bills every month, automatically refills your balance. Cancel anytime.
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              One charge, credits added once. No recurring billing.
            </p>
          )}
        </>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.id}
            className={
              tier.popular
                ? "relative rounded-3xl p-[1px] [background:linear-gradient(135deg,var(--accent-from),var(--accent-to))]"
                : ""
            }
          >
            <div
              className={`flex h-full flex-col rounded-3xl border p-6 ${
                tier.popular ? "border-transparent bg-card" : "border-border bg-card"
              }`}
            >
              {tier.popular && (
                <span className="mb-4 inline-block w-fit rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-3 py-1 text-xs font-medium text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-lg font-medium">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">${(tier.priceCents / 100).toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">{mode === "subscription" ? "/mo" : " once"}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.credits.toLocaleString()} credits</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 shrink-0 text-foreground">
                      <path
                        d="M16 6L8.5 14 4 9.5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loadingTier !== null}
                onClick={() => void handleBuy(tier.id, mode)}
                className={`mt-6 w-full rounded-full px-5 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
                  tier.popular ? "bg-foreground text-background" : "border border-border text-foreground"
                }`}
              >
                {loadingTier === tier.id
                  ? "Redirecting..."
                  : mode === "subscription"
                    ? "Subscribe"
                    : "Buy credits"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
