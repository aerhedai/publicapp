"use client";

import { useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { ComingSoon } from "./reference-panels";
import { ImageCreateForm } from "./image-create-form";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

const SUB_MODES: SubMode[] = [
  {
    key: "create",
    label: "Create Image",
    icon: (
      <path
        d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "artwork",
    label: "Create Artwork",
    icon: (
      <path
        d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

interface JobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
}

export function ImageToolClient({ jobs }: { jobs: JobRow[] }) {
  const [subMode, setSubMode] = useState("create");

  return (
    <>
      <CreationsTabs
        jobs={jobs}
        extraTabs={[
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
        greeting="Want to describe an image?"
      />

      <div className="px-8 pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <ToolSelector subModes={SUB_MODES} activeSubMode={subMode} onSubModeChange={setSubMode} />

          <div className="rounded-3xl border border-border bg-card p-4">
            {subMode === "create" ? <ImageCreateForm /> : <ComingSoon label="Create Artwork" />}
          </div>
        </div>
      </div>
    </>
  );
}
