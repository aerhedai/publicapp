import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Exported so other modules (src/lib/concurrency.ts) can reuse the same
// client instead of opening a second connection to the same Redis instance.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

// Two tiers: a tight limit on expensive/mutating actions (starting a job,
// requesting an upload URL), a looser one for general API traffic. Keyed by
// Clerk user id, never by IP - IPs are shared/spoofable, user ids aren't.
export const expensiveActionLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:expensive",
});

export const generalApiLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:general",
});

export async function checkRateLimit(limiter: Ratelimit, userId: string) {
  const { success, remaining, reset } = await limiter.limit(userId);
  return { allowed: success, remaining, reset };
}
