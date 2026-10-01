"use client";

import { CreationBox } from "./creation-box";
import { CapabilityCards } from "./capability-cards";
import { JobTile, NoticeStack } from "./job-tile";
import { groupJobsByDay } from "@/lib/job-grouping";
import { useLiveJobs, type LiveJobRow } from "@/lib/use-live-jobs";

/**
 * Home's own small feed column - deliberately not creations-tabs.tsx's
 * DayGroupedTiles (that one's responsive column count is tuned for the full
 * main content area on the Tools pages; this column is fixed-narrow
 * regardless of viewport, so it always wants exactly 2 small tiles per
 * row), but the same day-grouping util and the same JobTile component - one
 * "what a finished job looks like" design everywhere, just a narrower grid.
 */
function RecentFeed({ jobs, onDeleteJob }: { jobs: LiveJobRow[]; onDeleteJob: (jobId: string) => void }) {
  const groups = groupJobsByDay(jobs);
  return (
    <div className="flex w-full flex-col gap-5">
      {groups.map((group) => (
        <div key={group.dayKey} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">{group.label}</h3>
          <div className="grid grid-cols-2 gap-2">
            {group.jobs.map((job) => (
              <JobTile key={job.id} job={job} onDelete={onDeleteJob} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeClient({ jobs: initialJobs }: { jobs: LiveJobRow[] }) {
  const { jobs, addOptimistic, removeJob, notices, dismissNotice } = useLiveJobs(initialJobs);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-8 py-10">
      <NoticeStack notices={notices} onDismiss={dismissNotice} />

      <CapabilityCards />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-64">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent creations</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet - your generations will show up here.</p>
          ) : (
            <RecentFeed jobs={jobs} onDeleteJob={removeJob} />
          )}
        </div>

        <div className="order-1 flex w-full flex-col items-center gap-6 lg:order-2 lg:flex-1">
          <h1 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            What do you want to create today?
          </h1>
          <div className="w-full max-w-2xl">
            <CreationBox onJobCreated={addOptimistic} />
          </div>
        </div>
      </div>
    </div>
  );
}
