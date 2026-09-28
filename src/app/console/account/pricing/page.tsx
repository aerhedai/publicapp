// Same 3-tier structure as the landing page's pricing section
// (src/components/landing/pricing.tsx) - credit costs mirror
// src/lib/credits.ts's CREDIT_COST_BY_TYPE. Buttons are disabled here since
// billing/plan upgrades aren't wired up yet - this is a real user already
// signed in, so showing a working-looking "Get Started" would be dishonest.
const TIERS = [
  {
    name: "Starter",
    price: 9,
    credits: 50,
    popular: false,
    features: ["~50 images or ~10 videos", "Character reference uploads", "Standard queue"],
  },
  {
    name: "Creator",
    price: 29,
    credits: 200,
    popular: true,
    features: [
      "~200 images or ~40 videos",
      "Character reference uploads",
      "Cinematic camera control",
      "Priority queue",
    ],
  },
  {
    name: "Studio",
    price: 79,
    credits: 600,
    popular: false,
    features: [
      "~600 images or ~120 videos",
      "Character reference uploads",
      "Cinematic camera control",
      "Priority queue",
      "Scene continuity chaining",
    ],
  },
];

export default function PricingPlansPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Pricing &amp; Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Billing isn&apos;t wired up yet - these are the planned tiers.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={
              tier.popular
                ? "relative rounded-2xl p-[1px] [background:linear-gradient(135deg,var(--accent-from),var(--accent-to))]"
                : ""
            }
          >
            <div
              className={`flex h-full flex-col rounded-2xl border p-6 ${
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
                <span className="text-3xl font-semibold">${tier.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tier.credits} credits</p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-foreground">
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
                disabled
                title="Billing isn't wired up yet - coming soon"
                className="mt-6 w-full cursor-not-allowed rounded-full border border-border px-5 py-2.5 text-center text-sm font-medium text-muted-foreground"
              >
                Coming soon
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
