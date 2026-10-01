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
// STRIPE_IDS_LIVE/STRIPE_IDS_TEST below; the Product/Price metadata mirrors
// credits/appTierId so the webhook can resolve either without trusting
// Checkout Session metadata alone.
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

type StripeIdPair = { monthly: string; oneTime: string };

// Live keys are scoped to Vercel's Production environment only (Preview/
// Development keep running against the Stripe sandbox) - VERCEL_ENV is the
// exact signal Vercel sets for that, so it's what picks which ID table
// applies rather than sniffing the key string itself. Local `next dev` has
// no VERCEL_ENV at all, which correctly falls through to test IDs too.
const IS_LIVE_ENVIRONMENT = process.env.VERCEL_ENV === "production";

// Test-mode Products/Prices (Stripe sandbox, see stripe-best-practices
// skill) - what Preview/Development/local always use.
const STRIPE_IDS_TEST: Record<PricingTier["id"], StripeIdPair> = {
  starter: { monthly: "price_1ULPQeCgqolNE5ECwbuSouuJ", oneTime: "price_1ULPQfCgqolNE5ECollc9mYc" },
  creator: { monthly: "price_1ULPQfCgqolNE5ECZ56UMTKC", oneTime: "price_1ULPQfCgqolNE5ECdCiwSCcC" },
  studio: { monthly: "price_1ULPQgCgqolNE5ECjQHD9KTW", oneTime: "price_1ULPQgCgqolNE5ECbEl27aIc" },
};

// Live-mode Products/Prices (real Stripe account) - created 2026-10-01,
// same amounts/credits/metadata as the test-mode set above. Only ever used
// when IS_LIVE_ENVIRONMENT is true, i.e. only in Production.
const STRIPE_IDS_LIVE: Record<PricingTier["id"], StripeIdPair> = {
  starter: { monthly: "price_1ULme9CgLbz1dYRkRaqVnOaf", oneTime: "price_1ULme9CgLbz1dYRkn10L4K2n" },
  creator: { monthly: "price_1ULmeACgLbz1dYRksiXI4NZr", oneTime: "price_1ULmeACgLbz1dYRkb0j0yxcH" },
  studio: { monthly: "price_1ULmeBCgLbz1dYRkx69lhILn", oneTime: "price_1ULmeBCgLbz1dYRkP46Elkj3" },
};

function resolveStripeIds(id: PricingTier["id"]): StripeIdPair {
  return IS_LIVE_ENVIRONMENT ? STRIPE_IDS_LIVE[id] : STRIPE_IDS_TEST[id];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceCents: 900,
    credits: 640,
    popular: false,
    features: ["~640 images or ~8 videos a month", "Character reference uploads", "Standard queue"],
    stripePriceIdMonthly: resolveStripeIds("starter").monthly,
    stripePriceIdOneTime: resolveStripeIds("starter").oneTime,
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
    stripePriceIdMonthly: resolveStripeIds("creator").monthly,
    stripePriceIdOneTime: resolveStripeIds("creator").oneTime,
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
    stripePriceIdMonthly: resolveStripeIds("studio").monthly,
    stripePriceIdOneTime: resolveStripeIds("studio").oneTime,
  },
];

export function getPricingTier(id: string): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === id);
}
