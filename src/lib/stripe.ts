import Stripe from "stripe";

// Lazy singleton, same reasoning as src/db/client.ts/src/storage/r2.ts -
// never touch env vars at module-import time. STRIPE_SECRET_KEY comes from
// Vercel's native Stripe marketplace integration (provisioned via `vercel
// integration add stripe`), not a hand-created key.
let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set - run `vercel env pull` after provisioning Stripe");
  }
  // Always an explicit client instance, never the deprecated global
  // `stripe.api_key = ...` pattern (stripe-best-practices skill).
  cachedClient = new Stripe(key);
  return cachedClient;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return secret;
}
