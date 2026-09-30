"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReferenceUploadPanel, type ReferenceSlot } from "./reference-panels";
import { ImageSettingsPopover } from "./settings-popover";
import { DEFAULT_IMAGE_SETTINGS, type ImageSettings } from "./types";
import { computeImageDimensions } from "@/lib/pixel-presets";
import { pollJobUntilDone } from "@/lib/poll-job";

// Flux.2 Klein's own cap on multi-reference composition (see
// comfyui-flux2-klein-worker/graph_builder.py's MAX_REF_IMAGES) - kept in
// sync manually since the two repos don't share a build.
const MAX_REFERENCES = 9;

/**
 * The actual image-generation form: references + prompt + model/settings +
 * Generate, wired straight to POST /api/jobs. Shared by the Tools > Image
 * page (image-tool-client.tsx) and the home page's create box
 * (creation-box.tsx) so both are literally the same logic, not two copies
 * that can drift.
 */
export function ImageCreateForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceSlot[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  const attachedRefs = references.filter((r) => r.storageKey);
  const uploading = references.some((r) => r.uploading);
  const canGenerate = prompt.trim().length > 0 && !uploading && !dispatching;

  async function handleGenerate() {
    if (!canGenerate) return;
    setDispatching(true);
    setStatusMessage(null);
    try {
      const { width, height } = computeImageDimensions(settings.aspectRatio, settings.resolution);
      const characterRefs = Object.fromEntries(attachedRefs.map((r) => [r.label, r.storageKey as string]));

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          input: {
            mode: attachedRefs.length > 0 ? "storyboard" : "environment",
            prompt: prompt.trim(),
            characterRefs: attachedRefs.length > 0 ? characterRefs : undefined,
            width,
            height,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? "Couldn't start that generation");
      }
      const { job } = await res.json();
      setStatusMessage("Queued - it'll show up below once it's ready.");
      router.refresh();

      const outcome = await pollJobUntilDone(job.id);
      setStatusMessage(
        outcome === "done"
          ? "Done - see it below."
          : outcome === "failed"
            ? "That generation failed."
            : "Still working - check back shortly."
      );
      router.refresh();
    } catch (err) {
      setStatusMessage((err as Error).message);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-[auto_1fr] gap-4">
        <div className="border-r border-border pr-4">
          <ReferenceUploadPanel
            subtitle="Use images as references"
            slots={references}
            onChange={setReferences}
            maxSlots={MAX_REFERENCES}
          />
        </div>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image"
          className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {statusMessage && <p className="mt-2 text-xs text-muted-foreground">{statusMessage}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300">Flux.2 Klein</span>

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
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dispatching ? "Generating..." : "Generate"}
        </button>
      </div>
    </>
  );
}
