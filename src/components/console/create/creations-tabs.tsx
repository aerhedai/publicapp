"use client";

import { useState } from "react";
import { ComingSoon } from "./reference-panels";
import { JobTile, NoticeStack, type JobRow } from "./job-tile";
import { groupJobsByDay } from "@/lib/job-grouping";
import type { JobNotice } from "@/lib/use-live-jobs";

// Shared responsive column progression for every day-grouped tile grid in
// the app (this file, Home, Explore) - defined once so they can't drift.
export const TILE_GRID_CLASSES = "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/** Renders `jobs` (already sorted createdAt desc) as day-divided tile grids -
 * each day gets its own heading + its own grid container, so a new day
 * always starts a fresh row rather than continuing the previous day's. */
export function DayGroupedTiles({ jobs, onDeleteJob }: { jobs: JobRow[]; onDeleteJob?: (jobId: string) => void }) {
  const groups = groupJobsByDay(jobs);
  return (
    <div className="flex w-full flex-col gap-6">
      {groups.map((group) => (
        <div key={group.dayKey} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">{group.label}</h3>
          <div className={TILE_GRID_CLASSES}>
            {group.jobs.map((job) => (
              <JobTile key={job.id} job={job} onDelete={onDeleteJob} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The top tab bar seen on every Tools page (Creations/Templates/...).
// "Creations" shows real generation history for this tool's type - the
// same underlying data as /console/explore, just pre-filtered server-side
// by the page that renders this. Every other tab is an honest placeholder;
// there's no templates/motion-library/voices content to show yet.
export function CreationsTabs({
  jobs,
  extraTabs,
  greeting,
  contentBottomPadding,
  onDeleteJob,
  notices = [],
  onDismissNotice,
}: {
  jobs: JobRow[];
  extraTabs: { key: string; label: string; icon: React.ReactNode }[];
  greeting: string;
  // Extra bottom padding on the scrollable content, for pages that float a
  // borderless compose area over the bottom of the grid (image-tool-client.tsx
  // etc.) - without it the last row of tiles would sit hidden underneath it.
  contentBottomPadding?: boolean;
  onDeleteJob?: (jobId: string) => void;
  notices?: JobNotice[];
  onDismissNotice?: (id: string) => void;
}) {
  const [tab, setTab] = useState("creations");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {onDismissNotice && <NoticeStack notices={notices} onDismiss={onDismissNotice} />}

      {/* Static - shrink-0, not part of the scrolling region below, so it
          never moves regardless of how far the grid is scrolled. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-8 py-3">
        <button
          type="button"
          onClick={() => setTab("creations")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out ${
            tab === "creations" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M4 6h6v6H4V6zM14 6h6v6h-6V6zM4 16h6v2H4v-2zM14 16h6v2h-6v-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Creations
        </button>
        {extraTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out ${
              tab === t.key ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty state stays centered (a welcoming hero moment) - once there's
          real content it starts flush at the top-left like a normal list,
          not centered as one block in the middle of the page (matches how
          Linear/Notion/Vercel's own dashboards lay out content). */}
      <div
        className={`flex flex-1 flex-col overflow-y-auto px-8 pt-10 ${contentBottomPadding ? "pb-64" : "pb-10"} ${
          tab !== "creations" || jobs.length === 0 ? "items-center justify-center" : "items-start"
        }`}
      >
        {tab === "creations" ? (
          jobs.length === 0 ? (
            <div className="text-center">
              <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Hello,</p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-muted-foreground sm:text-4xl">
                {greeting}
              </p>
            </div>
          ) : (
            <DayGroupedTiles jobs={jobs} onDeleteJob={onDeleteJob} />
          )
        ) : (
          <ComingSoon label={extraTabs.find((t) => t.key === tab)?.label ?? tab} />
        )}
      </div>
    </div>
  );
}
