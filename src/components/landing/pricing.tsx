"use client";

import { AuthTrigger } from "@/components/auth/auth-trigger";
import { PRICING_TIERS, type PricingTier } from "@/lib/pricing-tiers";
import { imageCreditCost, videoCreditCost, VIDEO_MIN_DURATION_SECONDS } from "@/lib/pricing-math";
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";

/** Rises + settles into place with a per-card stagger, triggered once as
 * the grid scrolls into view - a confident, orderly motion (not playful),
 * since this is where someone's deciding whether to pay. Deliberately
 * different from scroll-showcase.tsx's continuous scrub and
 * capabilities.tsx's flip - each section here gets its own distinct
 * motion language rather than one reveal style reused everywhere. */
function PricingCard({ tier, index }: { tier: PricingTier; index: number }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={
        tier.popular
          ? "relative rounded-3xl p-[1px] [background:linear-gradient(135deg,var(--accent-from),var(--accent-to))]"
          : ""
      }
      style={{
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        transitionDelay: `${index * 120}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.96)",
      }}
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
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {tier.credits.toLocaleString()} credits - or buy as a one-time top-up
        </p>

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

        <AuthTrigger
          mode="sign-up"
          className={`mt-6 w-full rounded-full px-5 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 ${
            tier.popular ? "bg-foreground text-background" : "border border-border text-foreground"
          }`}
        >
          Get Started
        </AuthTrigger>
      </div>
    </div>
  );
}

export function Pricing() {
  return (
    <section className="border-t border-border bg-muted/40 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, credit-based pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            {/* Was a stale flat "80 credits = 1 video" from before this
                session's resolution/duration-aware repricing - video cost
                now depends on what you pick (pricing-math.ts), so this
                states the real cheapest-tier numbers instead of a single
                number that's wrong most of the time. */}
            Monthly subscription or one-time top-up - both add to the same credit balance. Images start at{" "}
            {imageCreditCost("480p")} credit, videos start at {videoCreditCost("480p", VIDEO_MIN_DURATION_SECONDS)}{" "}
            credits - more for higher resolution or longer duration.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {PRICING_TIERS.map((tier, i) => (
            <PricingCard key={tier.id} tier={tier} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
