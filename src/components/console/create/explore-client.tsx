"use client";

import { DayGroupedTiles } from "./creations-tabs";
import { NoticeStack } from "./job-tile";
import { useLiveJobs, type LiveJobRow } from "@/lib/use-live-jobs";

export function ExploreClient({ jobs: initialJobs }: { jobs: LiveJobRow[] }) {
  const { jobs, removeJob, notices, dismissNotice } = useLiveJobs(initialJobs);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-8 py-10">
      <NoticeStack notices={notices} onDismiss={dismissNotice} />
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything you&apos;ve generated.</p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No jobs yet. This is where the video-generation flow will plug in.</p>
      ) : (
        <DayGroupedTiles jobs={jobs} onDeleteJob={removeJob} />
      )}
    </div>
  );
}
