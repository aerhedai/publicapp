import { redis } from "@/lib/rate-limit";

// Global concurrency ceiling - separate from the per-user request-rate
// limiter and the per-user in-flight-job count in POST /api/jobs. This one
// bounds total simultaneous RunPod dispatches across every user, so the
// dispatcher self-throttles instead of firing every queued row at RunPod
// regardless of capacity (RunPod's own configured max-workers is a second,
// independent backstop, not a substitute for this - the dispatcher
// shouldn't rely on RunPod to reject work it could have avoided sending).
const GLOBAL_INFLIGHT_KEY = "runpod:global-inflight";

function getMaxConcurrentJobs(): number {
  return Number(process.env.RUNPOD_MAX_CONCURRENT_JOBS ?? "2");
}

/**
 * Atomically claims one global dispatch slot. INCR is atomic in Redis, so
 * concurrent callers can never both believe they got the same slot number -
 * exactly one caller sees `current` cross the limit, and only that caller
 * rolls its own increment back. Returns false (slot not acquired) if the
 * ceiling is already reached; the caller should leave the job "queued" and
 * retry on the next cron tick rather than dispatch anyway.
 */
export async function tryAcquireGlobalSlot(): Promise<boolean> {
  const max = getMaxConcurrentJobs();
  const current = await redis.incr(GLOBAL_INFLIGHT_KEY);
  if (current > max) {
    await redis.decr(GLOBAL_INFLIGHT_KEY);
    return false;
  }
  return true;
}

/** Releases a slot acquired by tryAcquireGlobalSlot - call this exactly
 * once per successful acquire, whenever that job reaches a terminal state
 * (done/failed), from the webhook handler or the stale-job sweep. */
export async function releaseGlobalSlot(): Promise<void> {
  await redis.decr(GLOBAL_INFLIGHT_KEY);
}
