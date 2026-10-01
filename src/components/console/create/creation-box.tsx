"use client";

import { useState } from "react";
import { ImageCreateForm } from "./image-create-form";
import { VideoChat } from "./video-chat";
import type { Mode } from "./types";

// The primary creation UI on Home - mode-switchable between Image and Video.
// Reuses the exact same components the dedicated Tools pages render
// (ImageCreateForm, VideoChat) rather than a parallel lookalike copy, so
// switching modes here really does "pop up the same exact thing" as
// visiting Tools > Image / Tools > Video directly.
export function CreationBox({ initialMode = "image" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5">
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

      {mode === "image" ? <ImageCreateForm /> : <VideoChat />}
    </div>
  );
}
