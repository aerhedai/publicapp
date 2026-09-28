import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

export default async function LibraryPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(50);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&apos;ve generated.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs yet. This is where the video-generation flow will plug in.
          </p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const config = JOB_STATUS_CONFIG[job.status];
              return (
                <li key={job.id} className="flex flex-col gap-1 border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {job.type === "video" ? "Video" : "Image"} &middot;{" "}
                      <span className="font-mono text-xs">{job.id}</span>
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                  {job.status === "warming" && config.detail && (
                    <p className="text-xs text-muted-foreground">{config.detail}</p>
                  )}
                  {job.status === "failed" && job.error && (
                    <p className="text-xs text-red-400">{job.error}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
