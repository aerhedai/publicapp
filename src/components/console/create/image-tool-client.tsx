"use client";

import { useEffect, useRef, useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { AddReferencesPanel, ComingSoon } from "./reference-panels";
import { ImageSettingsPopover } from "./settings-popover";
import { DEFAULT_IMAGE_SETTINGS, type ImageSettings } from "./types";
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
}

export function ImageToolClient({ jobs }: { jobs: JobRow[] }) {
  const [subMode, setSubMode] = useState("create");
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
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
            {subMode === "create" ? (
              <>
                <div className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="border-r border-border pr-4">
                    <AddReferencesPanel subtitle="Use images as references" />
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe your image"
                    className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
                    >
                      Nano Banana 2
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
                        {`${settings.aspectRatio} · ${settings.outputs} Image${settings.outputs > 1 ? "s" : ""} · ${settings.resolution}`}
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
                          <ImageSettingsPopover settings={settings} onChange={setSettings} />
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
              <ComingSoon label="Create Artwork" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
