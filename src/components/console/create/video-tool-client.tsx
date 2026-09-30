"use client";

import { useRef, useState } from "react";
import { CreationsTabs } from "./creations-tabs";
import { ToolSelector, type SubMode } from "./tool-selector";
import { ComingSoon, ReferenceUploadPanel, type ReferenceSlot } from "./reference-panels";
import { VideoChat } from "./video-chat";
import { registerCharacterReference } from "@/lib/upload-file";
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

// MiniMax H3's own cap on reference images (see the video worker's
// graph_builder.py MAX_REF_IMAGES) - kept in sync manually since the two
// repos don't share a build.
const MAX_REFERENCES = 9;

export function VideoToolClient({ jobs: initialJobs }: { jobs: LiveJobRow[] }) {
  const [subMode, setSubMode] = useState("create");
  const [references, setReferences] = useState<ReferenceSlot[]>([]);
  const registeredIds = useRef(new Set<string>());
  const { jobs, addOptimistic } = useLiveJobs(initialJobs, "video");

  // Upfront character-reference upload, matching the image tool's format -
  // registers each upload as a named character_reference the moment it
  // finishes (same mechanism the chat's own mid-conversation upload uses,
  // src/lib/upload-file.ts's registerCharacterReference), so the LLM already
  // knows about it by label the next time the user sends a message. This is
  // the actual fix for "no way to add references up front" - previously the
  // only path was answering the LLM's own mid-chat prompt for a missing
  // character.
  async function handleReferencesChange(next: ReferenceSlot[]) {
    setReferences(next);
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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-y-auto">
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
      </div>

      {/* Fixed, not part of the scrolling content above - stays on screen
          regardless of how far the Creations grid is scrolled. */}
      <div className="shrink-0 border-t border-border bg-background px-8 py-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <ToolSelector subModes={SUB_MODES} activeSubMode={subMode} onSubModeChange={setSubMode} />

          {subMode === "create" ? (
            <VideoChat
              onJobCreated={addOptimistic}
              referencesPanel={
                <ReferenceUploadPanel
                  subtitle="Use images as character references"
                  slots={references}
                  onChange={(next) => void handleReferencesChange(next)}
                  maxSlots={MAX_REFERENCES}
                  showLabels
                />
              }
            />
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
