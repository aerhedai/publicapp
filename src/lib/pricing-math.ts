// Pure pricing math - no imports from db/client or anything else server-only,
// specifically so this can be imported directly from a "use client" settings
// popover (for a live price readout as the user drags the duration slider)
// as well as from credits.ts server-side. Keep it that way - importing
// credits.ts itself from a client component would pull in @/db/client.

// Image has no continuous dimension (just two resolution tiers), so a flat
// lookup table is exact - no formula needed. Real measured cost ratio
// between tiers is ~2.5x (confirmed live 2026-10-01); 768p costs 3 credits
// vs 480p's 1 to keep the two tiers meaningfully distinct at whole-credit
// granularity (credits are an integer column - see db/schema.ts).
export const IMAGE_CREDIT_COST_BY_RESOLUTION: Record<"480p" | "768p", number> = {
  "480p": 1,
  "768p": 3,
};

// Video duration is a continuous slider again (1-10s), not the discrete
// 4s/8s this briefly shipped as - per explicit instruction, priced as a
// real dollar formula instead of a fixed lookup table so every whole-second
// value in range has a defined price: base rate is pinned at 0 seconds
// ($0.01), +$0.06 for every second from there (so a 4s video's base price
// is $0.01 + $0.06*4 = $0.25 - consistent with the ~$0.25 target already
// used to set the 18-credit price this session shipped earlier for 480p/4s).
// Resolution is a flat 3x multiplier on top (the real measured ratio
// between 480p and 768p at the same duration averaged ~3x across the two
// durations actually tested live - 3.17x at 4s, 2.75x at 8s).
export const VIDEO_BASE_PRICE_USD = 0.01;
export const VIDEO_PER_SECOND_USD = 0.06;
export const VIDEO_MIN_DURATION_SECONDS = 1;
export const VIDEO_MAX_DURATION_SECONDS = 10;
export const VIDEO_RESOLUTION_PRICE_MULTIPLIER: Record<"480p" | "768p", number> = {
  "480p": 1,
  "768p": 3,
};

// This app's own sell price per credit is ~$0.014 (see pricing-tiers.ts -
// $9/640, $29/2000, $79/5600 all land within a cent of this). Used only to
// convert a real dollar target into a whole-credit charge, never shown to
// the user directly.
export const PRICE_PER_CREDIT_USD = 0.014;

export function videoPriceUSD(resolution: "480p" | "768p", durationSeconds: number): number {
  const clampedDuration = Math.min(
    VIDEO_MAX_DURATION_SECONDS,
    Math.max(VIDEO_MIN_DURATION_SECONDS, durationSeconds)
  );
  const basePrice = VIDEO_BASE_PRICE_USD + VIDEO_PER_SECOND_USD * clampedDuration;
  return basePrice * VIDEO_RESOLUTION_PRICE_MULTIPLIER[resolution];
}

/** Whole credits never below 1 - this is what's actually charged. */
export function videoCreditCost(resolution: "480p" | "768p", durationSeconds: number): number {
  return Math.max(1, Math.round(videoPriceUSD(resolution, durationSeconds) / PRICE_PER_CREDIT_USD));
}

export function imageCreditCost(resolution: "480p" | "768p"): number {
  return IMAGE_CREDIT_COST_BY_RESOLUTION[resolution];
}
