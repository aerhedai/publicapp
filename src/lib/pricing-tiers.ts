// Single source of truth for the 3 credit-pack tiers - previously duplicated
// verbatim between src/components/landing/pricing.tsx and
// src/app/console/account/pricing/page.tsx, which is exactly how "Scene
// continuity chaining" ended up listed as a paid feature with nothing behind
// it in two places at once. Both pages now import this.
//
// These are one-time credit-pack purchases, not subscriptions (see the
// stripe-best-practices skill: Checkout Sessions for one-time payments,
// not the Billing/subscription APIs) - priceCents is what a single Stripe
// Checkout Session charges once, not a recurring amount.
//
// Credit costs mirror src/lib/credits.ts's CREDIT_COST_BY_TYPE exactly
// (image=1, video=5, stitch=1). Dollar amounts are placeholders, not a
// pricing decision - swap once real numbers are set.
export interface PricingTier {
  id: "starter" | "creator" | "studio";
  name: string;
  priceCents: number;
  credits: number;
  popular: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceCents: 900,
    credits: 50,
    popular: false,
    features: ["~50 images or ~10 videos", "Character reference uploads", "Standard queue"],
  },
  {
    id: "creator",
    name: "Creator",
    priceCents: 2900,
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
    id: "studio",
    name: "Studio",
    priceCents: 7900,
    credits: 600,
    popular: false,
    features: [
      "~600 images or ~120 videos",
      "Character reference uploads",
      "Cinematic camera control",
      "Priority queue",
      "Multi-scene storyboards with automatic stitching",
    ],
  },
];

export function getPricingTier(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}
