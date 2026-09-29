"use client";

import { useEffect, useRef, useState } from "react";
import { ImageSettingsPopover, VideoSettingsPopover } from "./settings-popover";
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  type ImageSettings,
  type Mode,
  type VideoSettings,
} from "./types";

function summarize(mode: Mode, image: ImageSettings, video: VideoSettings): string {
  if (mode === "image") {
    return `${image.aspectRatio} · ${image.outputs} Image${image.outputs > 1 ? "s" : ""} · ${image.resolution}`;
  }
  return `${video.aspectRatio} · ${video.durationSeconds} Sec · ${video.resolution}`;
}

// The primary creation UI, shared by Home (mode switchable) and the
// dedicated Tools>Image/Tools>Video pages (mode preselected). Not wired to
// POST /api/jobs yet - pricing/usage gating for this flow isn't decided,
// see src/app/console/tools/image/page.tsx's own note.
export function CreationBox({ initialMode = "image" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [imageSettings, setImageSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <textarea
        rows={3}
        placeholder={mode === "image" ? "Describe your image" : "Describe your video"}
        className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("image")}
            aria-label="Image mode"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              mode === "image" ? "bg-white/15 text-white" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 5h16v14H4V5zM4 16l4-4 3 3 5-5 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setMode("video")}
            aria-label="Video mode"
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              mode === "video" ? "bg-white/15 text-white" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM21 8l-4 2.5v3L21 16V8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
          >
            {mode === "image" ? "Nano Banana 2" : "MiniMax H3"}
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
            >
              {summarize(mode, imageSettings, videoSettings)}
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
              <div className="absolute right-0 top-full z-20 mt-2">
                {mode === "image" ? (
                  <ImageSettingsPopover settings={imageSettings} onChange={setImageSettings} />
                ) : (
                  <VideoSettingsPopover settings={videoSettings} onChange={setVideoSettings} />
                )}
              </div>
            )}
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
      </div>
    </div>
  );
}
