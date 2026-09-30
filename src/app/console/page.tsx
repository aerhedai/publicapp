import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { CreationBox } from "@/components/console/create/creation-box";
import { OutputPreview } from "@/components/console/create/output-preview";

export default async function ConsoleHome() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(5);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-8 py-14">
      <h1 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        What do you want to create today?
      </h1>

      <CreationBox />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
          <Link
            href="/console/explore"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet - your generations will show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const config = JOB_STATUS_CONFIG[job.status];
              return (
                <li key={job.id} className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {job.type === "video" ? "Video" : job.type === "stitch" ? "Stitched video" : "Image"} &middot;{" "}
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                  {job.status === "done" && job.outputStorageKey && (
                    <OutputPreview jobId={job.id} type={job.type === "stitch" ? "video" : job.type} />
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
