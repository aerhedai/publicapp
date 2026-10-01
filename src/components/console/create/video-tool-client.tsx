"use client";

import { useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { ComingSoon } from "./reference-panels";
import { VideoChat } from "./video-chat";
import { useLiveJobs, type LiveJobRow } from "@/lib/use-live-jobs";

const SUB_MODES: SubMode[] = [
  {
    key: "create",
    label: "Create Video",
    icon: (
      <path
        d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM21 8l-4 2.5v3L21 16V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "edit",
    label: "Edit Video",
    icon: (
      <path
        d="M4 20l4-1 10-10-3-3L5 16l-1 4zM13 6l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "extend",
    label: "Extend Video",
    icon: (
      <path
        d="M4 12h10M10 8l4 4-4 4M18 6v12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "motion",
    label: "Motion Control",
    icon: (
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function VideoToolClient({ jobs: initialJobs }: { jobs: LiveJobRow[] }) {
  const [subMode, setSubMode] = useState("create");
  const { jobs, addOptimistic, removeJob, notices, dismissNotice } = useLiveJobs(initialJobs, "video");

  return (
    <div className="relative h-full">
      <CreationsTabs
        jobs={jobs}
        onDeleteJob={removeJob}
        notices={notices}
        onDismissNotice={dismissNotice}
        contentBottomPadding
        extraTabs={[
          {
            key: "motion-library",
            label: "Motion Library",
            icon: (
              <path
                d="M4 5h16v14H4V5zM4 10h16M9 5v14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          },
          {
            key: "templates",
            label: "Templates",
            icon: (
              <path
                d="M4 5h16v14H4V5zM4 10h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          },
        ]}
        greeting="Want to describe a video?"
      />

      {/* Floating, not a docked panel - see image-tool-client.tsx's own
          note for the reasoning (no shared background, pointer-events pass
          through everywhere except the real controls). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-8 pb-4">
        <div className="pointer-events-auto flex w-full max-w-4xl flex-col gap-3">
          <ToolSelector subModes={SUB_MODES} activeSubMode={subMode} onSubModeChange={setSubMode} />

          {subMode === "create" ? (
            <VideoChat onJobCreated={addOptimistic} />
          ) : (
            <div className="rounded-3xl border border-border bg-card p-4">
              <ComingSoon label={SUB_MODES.find((s) => s.key === subMode)?.label ?? subMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
