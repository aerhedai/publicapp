import { db } from "@/db/client";
import { creditLedger, generationJobs, jobType } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
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

export const FREE_REGENERATIONS_PER_ORIGINAL = 2;
export const FREE_REGENERATION_WINDOW_MS = 30_000;

/**
 * Wraps computeJobCost with the free-regeneration allowance: a job whose
 * `regeneratedFromJobId` points at a root job costs nothing if (a) fewer
 * than FREE_REGENERATIONS_PER_ORIGINAL other jobs already share that same
 * root, AND (b) the root itself finished within the last
 * FREE_REGENERATION_WINDOW_MS - "regenerate" is a quick instant-redo right
 * after seeing a result, not a standing free-retry button discovered a day
 * later. Both checked fresh here, at reservation time (dispatch-one-job.ts)
 * - same "compute once, from current state" rule computeJobCost itself
 * documents - rather than decided once at job-creation time, so a dispatch
 * delayed behind a global-slot wait is judged by its real elapsed time, not
 * the moment the user clicked.
 *
 * A job with no regeneratedFromJobId (the overwhelming majority - any
 * normal, non-regenerated generation) always costs the real computed
 * price; this only ever makes a regeneration *cheaper*, never a normal job
 * more expensive.
 */
export async function computeJobCostWithFreeRegen(
  job: Pick<typeof generationJobs.$inferSelect, "id" | "type" | "input" | "regeneratedFromJobId">
): Promise<number> {
  const realCost = computeJobCost(job.type, job.input);
  if (!job.regeneratedFromJobId) return realCost;

  const [root] = await db
    .select({ updatedAt: generationJobs.updatedAt })
    .from(generationJobs)
    .where(eq(generationJobs.id, job.regeneratedFromJobId));
  if (!root || Date.now() - root.updatedAt.getTime() > FREE_REGENERATION_WINDOW_MS) {
    return realCost;
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generationJobs)
    .where(and(eq(generationJobs.regeneratedFromJobId, job.regeneratedFromJobId), sql`${generationJobs.id} != ${job.id}`));

  return count < FREE_REGENERATIONS_PER_ORIGINAL ? 0 : realCost;
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
 * links it to the job - as ONE writable-CTE statement (Postgres supports a
 * data-modifying CTE natively), not two sequential round trips. Without
 * this, a crash between the insert and the update would leave the user
 * genuinely charged (the ledger row exists) but the job's
 * `reserveLedgerId` never recorded - which apply-job-result.ts's own atomic
 * write would later persist as a literal `null` into `settleLedgerId`,
 * permanently defeating its idempotency guard for that job. Confirmed as a
 * real failure class this session (the same gap, just on the success-path
 * write, got a user's job stuck "settled" with no way to ever finish it).
 * Does NOT wrap the balance check itself in this atomicity - relies on the
 * caller having already ensured only one of this user's jobs can reach
 * this point at a time (see the module-level note on why that's safe here).
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

  const result = await db.execute<{ reserve_ledger_id: string }>(sql`
    WITH new_ledger AS (
      INSERT INTO credit_ledger (user_id, delta, reason)
      VALUES (${params.userId}, ${-cost}, 'generation_reserve')
      RETURNING id
    )
    UPDATE generation_jobs
    SET estimated_credits = ${cost}, reserve_ledger_id = (SELECT id FROM new_ledger)
    WHERE id = ${params.jobId}
    RETURNING reserve_ledger_id
  `);
  const reserveLedgerId = result.rows[0]?.reserve_ledger_id;
  if (!reserveLedgerId) {
    throw new Error(`reserveCredits: no row returned for job ${params.jobId} - does it exist?`);
  }

  return { ok: true, reserveLedgerId };
}

/**
 * Refunds a reserved job on failure/timeout - an explicit compensating
 * positive-delta row (never mutates or deletes the original reserve row),
 * so "reserved N, refunded N" is always auditable in the ledger's own
 * history. Same single-writable-CTE atomicity as reserveCredits above, for
 * the same reason - this function is called from 5+ places (dispatch
 * failure, output-moderation rejection, the stale-job sweep's own recovery
 * paths), so a crash between a plain insert+update here would leave a user
 * correctly refunded but the job permanently stuck non-terminal - the exact
 * user-visible symptom this session's whole incident started from, just
 * triggered from the refund side instead of the confirm side.
 */
export async function releaseCredits(params: {
  jobId: string;
  userId: string;
  estimatedCredits: number;
  error: string;
}): Promise<void> {
  await db.execute(sql`
    WITH new_ledger AS (
      INSERT INTO credit_ledger (user_id, delta, reason)
      VALUES (${params.userId}, ${params.estimatedCredits}, 'generation_refund')
      RETURNING id
    )
    UPDATE generation_jobs
    SET status = 'failed', error = ${params.error}, settle_ledger_id = (SELECT id FROM new_ledger)
    WHERE id = ${params.jobId}
  `);
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
