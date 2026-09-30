import { db } from "@/db/client";
import { generationJobs, type jobType } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureUserRow } from "@/lib/ensure-user";
import { checkContentPolicy } from "@/lib/content-policy";

// A user's own in-flight statuses - not a mutable "balance" style flag,
// just the set of rows that count against their concurrency cap.
const IN_FLIGHT_STATUSES = ["queued", "warming", "processing"] as const;
const MAX_CONCURRENT_JOBS_PER_USER = 1;

export type CreateJobResult =
  | { ok: true; job: typeof generationJobs.$inferSelect }
  | { ok: false; reason: "content_policy"; message: string }
  | { ok: false; reason: "concurrent_limit"; message: string };

/**
 * The one place a generation_jobs row gets created - shared by
 * POST /api/jobs (a live user request) and advanceProject
 * (src/lib/projects.ts, triggered from the job-completion path, not a
 * request). Both need the same invariants: a policy-violating input never
 * occupies a slot, and MAX_CONCURRENT_JOBS_PER_USER is never exceeded -
 * credits.ts's reserve/release flow is only safe (not wrapped in a real
 * transaction - neon-http doesn't support them) because this cap holds for
 * every code path that can insert a job, not just the HTTP one.
 */
export async function createGenerationJob(params: {
  userId: string;
  type: (typeof jobType.enumValues)[number];
  input: unknown;
  createsReferenceLabel?: string | null;
  projectClipId?: string | null;
}): Promise<CreateJobResult> {
  const policy = checkContentPolicy(params.input);
  if (!policy.allowed) {
    return { ok: false, reason: "content_policy", message: policy.reason ?? "Rejected by content policy" };
  }

  const inFlight = await db
    .select({ id: generationJobs.id })
    .from(generationJobs)
    .where(and(eq(generationJobs.userId, params.userId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)));
  if (inFlight.length >= MAX_CONCURRENT_JOBS_PER_USER) {
    return { ok: false, reason: "concurrent_limit", message: "You already have a generation in progress" };
  }

  await ensureUserRow(params.userId);

  const [job] = await db
    .insert(generationJobs)
    .values({
      userId: params.userId,
      type: params.type,
      input: params.input as object,
      createsReferenceLabel: params.createsReferenceLabel?.trim() || null,
      projectClipId: params.projectClipId ?? null,
    })
    .returning();

  return { ok: true, job };
}
