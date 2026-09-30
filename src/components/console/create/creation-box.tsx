"use client";

import { useRef, useState } from "react";
import { ImageCreateForm } from "./image-create-form";
import { VideoChat } from "./video-chat";
import { ReferenceUploadPanel, type ReferenceSlot } from "./reference-panels";
import { registerCharacterReference } from "@/lib/upload-file";
import type { Mode } from "./types";

const MAX_REFERENCES = 9;

// The primary creation UI on Home - mode-switchable between Image and Video.
// Reuses the exact same components the dedicated Tools pages render
// (ImageCreateForm, VideoChat) rather than a parallel lookalike copy, so
// switching modes here really does "pop up the same exact thing" as
// visiting Tools > Image / Tools > Video directly.
export function CreationBox({ initialMode = "image" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [videoReferences, setVideoReferences] = useState<ReferenceSlot[]>([]);
  const registeredIds = useRef(new Set<string>());

  async function handleVideoReferencesChange(next: ReferenceSlot[]) {
    setVideoReferences(next);
    for (const slot of next) {
      if (slot.storageKey && !registeredIds.current.has(slot.id)) {
        registeredIds.current.add(slot.id);
        try {
          await registerCharacterReference(slot.label, slot.storageKey);
        } catch {
          registeredIds.current.delete(slot.id);
        }
      }
    }
  }

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

      {mode === "image" ? (
        <div className="rounded-3xl border border-border bg-card p-4">
          <ImageCreateForm />
        </div>
      ) : (
        <VideoChat
          referencesPanel={
            <ReferenceUploadPanel
              subtitle="Use images as character references"
              slots={videoReferences}
              onChange={(next) => void handleVideoReferencesChange(next)}
              maxSlots={MAX_REFERENCES}
              showLabels
            />
          }
        />
      )}
    </div>
  );
}
