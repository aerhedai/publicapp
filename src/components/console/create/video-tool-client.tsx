"use client";

import { useEffect, useRef, useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { AddReferencesPanel, ComingSoon, LabeledImageSlot } from "./reference-panels";
import { VideoSettingsPopover } from "./settings-popover";
import { DEFAULT_VIDEO_SETTINGS, type VideoSettings } from "./types";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

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

interface JobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
}

export function VideoToolClient({ jobs }: { jobs: JobRow[] }) {
  const [subMode, setSubMode] = useState("create");
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  return (
    <>
      <CreationsTabs
        jobs={jobs}
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

      <div className="px-8 pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <ToolSelector subModes={SUB_MODES} activeSubMode={subMode} onSubModeChange={setSubMode} />

          <div className="rounded-3xl border border-border bg-card p-4">
            {subMode === "create" ? (
              <>
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex flex-col gap-4 border-r border-border pr-4">
                    <div className="flex gap-2">
                      <LabeledImageSlot
                        label="Start Image"
                        icon={
                          <path
                            d="M4 5h16v14H4V5zM4 16l4-4 3 3 5-5 4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        }
                      />
                      <LabeledImageSlot
                        label="End Image"
                        icon={
                          <path
                            d="M4 5h16v14H4V5zM4 16l4-4 3 3 5-5 4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        }
                      />
                    </div>
                    <AddReferencesPanel />
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Describe your video"
                    className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                    >
                      Seedance 2.0 Fast
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

                    <div className="relative" ref={popoverRef}>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((v) => !v)}
                        className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                      >
                        {`${settings.aspectRatio} · ${settings.durationSeconds} Sec · ${settings.resolution}`}
                        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                          <path
                            d={settingsOpen ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4"}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {settingsOpen && (
                        <div className="absolute bottom-full right-0 z-20 mb-2">
                          <VideoSettingsPopover settings={settings} onChange={setSettings} />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    title="Generation isn't wired up yet - coming soon"
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
