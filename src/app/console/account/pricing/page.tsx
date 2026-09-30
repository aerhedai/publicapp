import { PRICING_TIERS } from "@/lib/pricing-tiers";
import { PricingCheckoutButton } from "@/components/console/pricing-checkout-button";

export default function PricingPlansPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Pricing &amp; Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">One-time credit packs - buy more any time, no subscription.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
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
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.credits} credits</p>

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

              <PricingCheckoutButton tier={tier} popular={tier.popular} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
