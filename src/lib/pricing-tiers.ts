// Single source of truth for the 3 tiers - previously duplicated verbatim
// between src/components/landing/pricing.tsx and
// src/app/console/account/plan/page.tsx, which is exactly how "Scene
// continuity chaining" ended up listed as a paid feature with nothing behind
// it in two places at once. Both pages now import this.
//
// Each tier is purchasable two ways, both adding to the same credit
// balance: a recurring monthly subscription (auto-grants `credits` every
// billing cycle - see the invoice.paid handler in
// src/app/api/webhooks/stripe/route.ts) or a one-time top-up (grants
// `credits` once, never expires). Real Stripe Products/Prices were created
// for both modes on every tier (not inline price_data) - see
// stripePriceIdMonthly/stripePriceIdOneTime below; the Product/Price
// metadata mirrors credits/appTierId so the webhook can resolve either
// without trusting Checkout Session metadata alone.
//
// priceCents/credits are not placeholders - computed from this session's
// own live-measured worker costs (src/lib/credits.ts's own comment has the
// real numbers) at roughly a 10x gross margin over raw compute cost.
export interface PricingTier {
  id: "starter" | "creator" | "studio";
  name: string;
  priceCents: number;
  credits: number;
  popular: boolean;
  features: string[];
  stripePriceIdMonthly: string;
  stripePriceIdOneTime: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceCents: 900,
    credits: 640,
    popular: false,
    features: ["~640 images or ~8 videos a month", "Character reference uploads", "Standard queue"],
    stripePriceIdMonthly: "price_1ULPQeCgqolNE5ECwbuSouuJ",
    stripePriceIdOneTime: "price_1ULPQfCgqolNE5ECollc9mYc",
  },
  {
    id: "creator",
    name: "Creator",
    priceCents: 2900,
    credits: 2000,
    popular: true,
    features: [
      "~2,000 images or ~25 videos a month",
      "Character reference uploads",
      "Priority queue",
    ],
    stripePriceIdMonthly: "price_1ULPQfCgqolNE5ECZ56UMTKC",
    stripePriceIdOneTime: "price_1ULPQfCgqolNE5ECdCiwSCcC",
  },
  {
    id: "studio",
    name: "Studio",
    priceCents: 7900,
    credits: 5600,
    popular: false,
    features: [
      "~5,600 images or ~70 videos a month",
      "Character reference uploads",
      "Priority queue",
      "Multi-scene storyboards with automatic stitching",
    ],
    stripePriceIdMonthly: "price_1ULPQgCgqolNE5ECjQHD9KTW",
    stripePriceIdOneTime: "price_1ULPQgCgqolNE5ECbEl27aIc",
  },
];

export function getPricingTier(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}
