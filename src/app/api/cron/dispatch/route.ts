import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs, projects } from "@/db/schema";
import { verifyCronSecret } from "@/lib/cron";
import { dispatchOneJob, type DispatchOutcome } from "@/lib/dispatch-one-job";
import { advanceProject } from "@/lib/projects";

// Generous upper bound on rows considered per tick - dispatchOneJob's own
// global-slot check is what actually gates how many get dispatched; jobs
// beyond available headroom are simply left "queued" for the next tick.
const BATCH_SIZE = 10;

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Non-terminal projects get a poll every tick, before the main dispatch
  // loop below - advanceProject is otherwise only triggered reactively
  // (a job completing, a scene draft being saved), so a project blocked
  // purely on some OTHER job occupying this user's one in-flight slot
  // (create-job.ts's MAX_CONCURRENT_JOBS_PER_USER) would never resume on
  // its own once that slot frees up. Cheap: most calls are a no-op (the
  // project is already waiting on something real, like an unfinished
  // scene draft) and any job this creates is picked up by the very same
  // tick's `candidates` query right below.
  const activeProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.status, ["draft", "generating", "stitching"]));
  for (const p of activeProjects) {
    await advanceProject(p.id);
  }

  const candidates = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.status, "queued"))
    .orderBy(asc(generationJobs.createdAt))
    .limit(BATCH_SIZE);

  const results: DispatchOutcome[] = [];

  for (const job of candidates) {
    const outcome = await dispatchOneJob(job);
    results.push(outcome);
    if (outcome.outcome === "no_global_slot") {
      console.log("[cron/dispatch] global concurrency ceiling reached, stopping this tick");
      break;
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
