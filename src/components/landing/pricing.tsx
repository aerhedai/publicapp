import { AuthTrigger } from "@/components/auth/auth-trigger";
import { PRICING_TIERS } from "@/lib/pricing-tiers";

export function Pricing() {
  return (
    <section className="border-t border-border bg-muted/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, credit-based pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            One-time credit packs. Pay for what you generate, buy more any time.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
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
                  tier.popular
                    ? "border-transparent bg-card"
                    : "border-border bg-card"
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.credits} credits
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="mt-0.5 h-5 w-5 shrink-0 text-foreground"
                      >
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

                <AuthTrigger
                  mode="sign-up"
                  className={`mt-6 w-full rounded-full px-5 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
                    tier.popular
                      ? "bg-foreground text-background"
                      : "border border-border text-foreground"
                  }`}
                >
                  Get Started
                </AuthTrigger>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
