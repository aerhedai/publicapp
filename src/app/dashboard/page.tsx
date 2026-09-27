import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs, jobStatus } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Human labels + explanatory copy per status - "warming" specifically needs
// its own copy so a real cold start (RunPod dispatch -> container boot,
// realistically 30-90s, worst case a couple of minutes) doesn't read as a
// stuck/broken job to someone watching this page.
const STATUS_CONFIG: Record<
  (typeof jobStatus.enumValues)[number],
  { label: string; className: string; detail?: string }
> = {
  queued: {
    label: "Queued",
    // Not bg-muted/text-muted-foreground - those tokens aren't actually
    // defined in globals.css (confirmed by reading it), so bg-muted
    // silently renders as no background at all - an invisible pill.
    className: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    detail: "Waiting for a free GPU slot.",
  },
  warming: {
    label: "Starting up",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    detail: "Spinning up a GPU worker - can take up to a couple of minutes on a cold start.",
  },
  processing: {
    label: "Generating",
    className: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  },
  done: {
    label: "Done",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  },
};

// This route has no explicit auth check of its own because src/proxy.ts
// already default-denies everything not on its public allowlist - but the
// data fetch below still filters by userId itself, so this page is safe
// even if the proxy were ever misconfigured (defense in depth, not
// reliance on a single layer).
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return null; // proxy should have redirected before this ever renders
  }

  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(20);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserButton />
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Recent jobs
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs yet. This is where the video-generation flow will plug in.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => {
              const config = STATUS_CONFIG[job.status];
              return (
                <li key={job.id} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{job.id}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                  {job.status === "warming" && config.detail && (
                    <p className="text-xs text-muted-foreground">{config.detail}</p>
                  )}
                  {job.status === "failed" && job.error && (
                    <p className="text-xs text-red-700 dark:text-red-400">{job.error}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
