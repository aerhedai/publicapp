import { db } from "@/db/client";
import { creditLedger, generationJobs, jobType } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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

// Flat per-type estimate, reserved at dispatch time and refined later once
// actualCostCents data exists (see schema.ts's own comment on that column).
export const CREDIT_COST_BY_TYPE: Record<(typeof jobType.enumValues)[number], number> = {
  image: 1,
  video: 5,
};

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
  type: (typeof jobType.enumValues)[number];
}): Promise<ReserveResult> {
  const cost = CREDIT_COST_BY_TYPE[params.type];
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
