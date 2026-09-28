"use client";

import { useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { ComingSoon } from "./reference-panels";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

const SUB_MODES: SubMode[] = [
  {
    key: "voiceover",
    label: "Voiceover",
    icon: (
      <path
        d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "music",
    label: "Music Generator",
    icon: (
      <path
        d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: "changer",
    label: "Voice Changer",
    icon: (
      <path
        d="M4 8l4 4-4 4M20 8l-4 4 4 4M12 4v16"
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
}

export function VoiceToolClient({ jobs }: { jobs: JobRow[] }) {
  const [subMode, setSubMode] = useState("voiceover");

  return (
    <>
      <CreationsTabs
        jobs={jobs}
        extraTabs={[
          {
            key: "voices",
            label: "Voices",
            icon: (
              <path
                d="M5 10v4M9 6v12M13 4v16M17 8v8M21 11v2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          },
        ]}
        greeting="Want to describe a voiceover?"
      />

      <div className="px-8 pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <ToolSelector subModes={SUB_MODES} activeSubMode={subMode} onSubModeChange={setSubMode} />

          <div className="rounded-3xl border border-border bg-card p-4">
            {subMode === "voiceover" ? (
              <>
                <textarea
                  rows={4}
                  placeholder="Describe your voiceover"
                  className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                    >
                      Bella
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                    >
                      English
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled
                    title="Voice generation isn't wired up yet - coming soon"
                    className="cursor-not-allowed rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </>
            ) : (
              <ComingSoon label={SUB_MODES.find((s) => s.key === subMode)?.label ?? subMode} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
