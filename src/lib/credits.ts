import { db } from "@/db/client";
import { creditLedger, generationJobs, jobType } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { imageCreditCost, videoCreditCost } from "@/lib/pricing-math";
export { IMAGE_CREDIT_COST_BY_RESOLUTION, VIDEO_BASE_PRICE_USD, VIDEO_PER_SECOND_USD, VIDEO_RESOLUTION_PRICE_MULTIPLIER, PRICE_PER_CREDIT_USD, videoPriceUSD, videoCreditCost, imageCreditCost } from "@/lib/pricing-math";

// NOTE ON ATOMICITY: this app's DB client uses drizzle-orm/neon-http, which
// genuinely does not support multi-statement transactions - `db.transaction()`
// throws "No transactions support in neon-http driver" (confirmed by reading
// node_modules/drizzle-orm/neon-http/session.js directly, not assumed). The
// reserve/release flow below is therefore a sequence of individually-atomic
// single statements, not one wrapped transaction. This is an acceptable gap
// specifically because POST /api/jobs already caps each user at one
// in-flight job (see MAX_CONCURRENT_JOBS_PER_USER there) - the race this
// would otherwise close (the same user's balance being checked twice before
// either reserve lands) can't happen when only one of their jobs can ever be
// mid-dispatch at once. A genuinely concurrent-safe balance check across
// multiple simultaneous jobs for the same user would need a real
// transactional driver (e.g. neon-serverless's pooled/websocket client)
// instead of neon-http - noted here, not silently assumed away.

// Only stitch actually reaches this - image and video both have a real
// resolution/(duration)-aware cost computed below (imageCreditCost/
// videoCreditCost, from pricing-math.ts) and never fall through to here.
// Stitch has no resolution/duration dimension at all - it's CPU-only ffmpeg
// concatenation, seconds of work, negligible real cost, flat placeholder is
// fine.
export const CREDIT_COST_BY_TYPE: Record<(typeof jobType.enumValues)[number], number> = {
  image: 1, // unreachable in computeJobCost - kept only as this Record's required shape
  video: 1, // unreachable in computeJobCost - kept only as this Record's required shape
  stitch: 1,
};

function isImageResolution(value: unknown): value is "480p" | "768p" {
  return value === "480p" || value === "768p";
}

/**
 * The single place a job's real credit cost is computed, from its own
 * stored `input` (the same jsonb blob dispatch-one-job.ts already has in
 * hand) rather than a flat per-type constant. Called once, at reservation
 * time (dispatch-one-job.ts) - the result is stored on the job as
 * `estimatedCredits` and that stored value, not a re-computation, is what
 * every later step (confirm/refund) uses, so a mid-flight pricing change
 * can never retroactively affect an already-reserved job.
 *
 * Falls back to the cheaper resolution tier (never the pricier one) when
 * resolution/duration is missing or malformed in input - should never
 * happen for a job created through the real UI (which only ever sends
 * valid values), but a legacy/malformed row should never cost a user more
 * than the floor price, only ever less in that edge case. Duration itself
 * needs no validation beyond the number coercion videoPriceUSD's own
 * clamping already does (pricing-math.ts).
 */
export function computeJobCost(type: (typeof jobType.enumValues)[number], input: unknown): number {
  if (type === "image") {
    const resolution = (input as { resolution?: unknown } | null)?.resolution;
    return imageCreditCost(isImageResolution(resolution) ? resolution : "480p");
  }
  if (type === "video") {
    const scene = (input as { scene?: { resolution?: unknown; duration?: unknown } } | null)?.scene;
    const resolution = isImageResolution(scene?.resolution) ? scene.resolution : "480p";
    const duration = typeof scene?.duration === "number" ? scene.duration : 4;
    return videoCreditCost(resolution, duration);
  }
  return CREDIT_COST_BY_TYPE[type];
}

export async function getCreditBalance(userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<string>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return Number(row?.balance ?? 0);
}

export type ReserveResult = { ok: true; reserveLedgerId: string } | { ok: false; reason: "insufficient_credits" };

/**
 * Checks balance, and if sufficient, inserts a negative-delta ledger row and
 * links it to the job. Call this before dispatching to RunPod - never call
 * dispatchJob if this returns ok:false. Does NOT wrap the check+insert in a
 * transaction (see the module-level note on why) - relies on the caller
 * having already ensured only one of this user's jobs can reach this point
 * at a time.
 */
export async function reserveCredits(params: {
  jobId: string;
  userId: string;
  cost: number;
}): Promise<ReserveResult> {
  const cost = params.cost;
  const balance = await getCreditBalance(params.userId);
  if (balance < cost) {
    return { ok: false, reason: "insufficient_credits" };
  }

  const [ledgerRow] = await db
    .insert(creditLedger)
    .values({ userId: params.userId, delta: -cost, reason: "generation_reserve" })
    .returning({ id: creditLedger.id });

  await db
    .update(generationJobs)
    .set({ estimatedCredits: cost, reserveLedgerId: ledgerRow.id })
    .where(eq(generationJobs.id, params.jobId));

  return { ok: true, reserveLedgerId: ledgerRow.id };
}

/**
 * Marks a job's credit outcome as finalized on success - the reserve stands
 * as the charge, no new ledger row needed. `settleLedgerId` being non-null
 * is the idempotency guard the webhook handler and stale-job sweep both
 * check before processing a job's completion, so a duplicate delivery is a
 * no-op instead of re-applying a result.
 */
export async function confirmCredits(jobId: string, reserveLedgerId: string): Promise<void> {
  await db.update(generationJobs).set({ settleLedgerId: reserveLedgerId }).where(eq(generationJobs.id, jobId));
}

/**
 * Refunds a reserved job on failure/timeout - an explicit compensating
 * positive-delta row (never mutates or deletes the original reserve row),
 * so "reserved N, refunded N" is always auditable in the ledger's own
 * history.
 */
export async function releaseCredits(params: {
  jobId: string;
  userId: string;
  estimatedCredits: number;
  error: string;
}): Promise<void> {
  const [refundRow] = await db
    .insert(creditLedger)
    .values({ userId: params.userId, delta: params.estimatedCredits, reason: "generation_refund" })
    .returning({ id: creditLedger.id });

  await db
    .update(generationJobs)
    .set({ status: "failed", error: params.error, settleLedgerId: refundRow.id })
    .where(eq(generationJobs.id, params.jobId));
}

/**
 * Refunds a reserve without ending the job - used by the dispatch cron when
 * a *transient* RunPod error (network/5xx) sends a job back to "queued" for
 * retry on the next tick, rather than failing it outright. Unlike
 * releaseCredits, this never touches status/settleLedgerId - the job isn't
 * at a terminal state, so the webhook/sweep idempotency guard must stay
 * untouched for whenever it eventually does land.
 */
export async function refundReservedCredits(params: {
  userId: string;
  estimatedCredits: number;
}): Promise<void> {
  await db
    .insert(creditLedger)
    .values({ userId: params.userId, delta: params.estimatedCredits, reason: "generation_refund_retry" });
}
