"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaPickerModal, type PickedMedia } from "./media-picker-modal";
import { MentionTextarea } from "./mention-textarea";
import { ImageSettingsPopover } from "./settings-popover";
import { DEFAULT_IMAGE_SETTINGS, type ImageSettings } from "./types";
import { computeImageDimensions } from "@/lib/pixel-presets";

// Unlike the video worker, Flux.2 Klein's graph never gives the model a
// textual <Picture i>-style marker for each reference - every attached
// image is always composed in, purely by attachment order (see
// comfyui-flux2-klein-worker/graph_builder.py's own docstring). So
// @Image1/@Image2 here is only a UI authoring aid (e.g. "put @Image1's
// outfit on @Image2") - never a selection mechanism like the video tool's
// tags - and is stripped from the actual prompt text before dispatch, since
// the text encoder was never trained to understand these tokens.
const MENTION_TAG_PATTERN = /@Image\d+\b/g;

// Flux.2 Klein's own cap on multi-reference composition (see
// comfyui-flux2-klein-worker/graph_builder.py's MAX_REF_IMAGES) - kept in
// sync manually since the two repos don't share a build.
const MAX_REFERENCES = 9;

interface AttachedRef {
  storageKey: string;
  previewUrl: string | null;
}

/**
 * The actual image-generation form: references + prompt + model/settings +
 * Generate, wired straight to POST /api/jobs. Shared by the Tools > Image
 * page (image-tool-client.tsx) and the home page's create box
 * (creation-box.tsx) so both are literally the same logic, not two copies
 * that can drift.
 *
 * Unlike video-chat.tsx, this tool has no @Image1-style tagging - every
 * attached reference is always composed in (the Flux.2 Klein worker takes
 * an ordered list, not a selectively-referenced one; see
 * handler_image.py's own docstring), so there's no ambiguity to resolve and
 * no mention input needed. The picker modal (media-picker-modal.tsx) is
 * still used here for its Creations/Uploads reuse, just without the tagging
 * half of that feature.
 *
 * This form only ever composes and sends - it never shows a result or a
 * loading state itself (that lives in the Creations tab's grid, driven by
 * onJobCreated below + the live-polling list that owns it). Once dispatch
 * succeeds the box clears and is immediately ready for the next prompt,
 * same as a chat input - it is not touched by what happens to the job
 * afterward.
 */
export function ImageCreateForm({ onJobCreated }: { onJobCreated?: (job: { id: string; status: string }) => void }) {
  const router = useRouter();
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<AttachedRef[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  const canGenerate = prompt.trim().length > 0 && !dispatching;

  function addPicked(picked: PickedMedia[]) {
    setReferences((prev) => {
      const existing = new Set(prev.map((r) => r.storageKey));
      const additions = picked.filter((p) => !existing.has(p.storageKey)).map((p) => ({ storageKey: p.storageKey, previewUrl: p.previewUrl }));
      return [...prev, ...additions].slice(0, MAX_REFERENCES);
    });
    setPickerOpen(false);
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setDispatching(true);
    setErrorMessage(null);
    try {
      const { width, height } = computeImageDimensions(settings.aspectRatio, settings.resolution);
      const characterRefs = Object.fromEntries(references.map((r, i) => [`Image${i + 1}`, r.storageKey]));
      // Strip @Image1-style mention tags - purely a compose-box authoring
      // aid here (see MENTION_TAG_PATTERN's own comment), never sent to the
      // worker's text encoder.
      const cleanPrompt = prompt.replace(MENTION_TAG_PATTERN, "").replace(/\s+/g, " ").trim();

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          input: {
            mode: references.length > 0 ? "storyboard" : "environment",
            prompt: cleanPrompt,
            characterRefs: references.length > 0 ? characterRefs : undefined,
            width,
            height,
            // The resolution *label*, not just width/height - computeJobCost
            // (src/lib/credits.ts) reads this directly rather than
            // re-deriving a tier from raw pixel counts, so it has to survive
            // the trip from settings to the stored job input.
            resolution: settings.resolution,
            steps: settings.steps,
            seed: settings.seed ?? undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? "Couldn't start that generation");
      }
      const { job } = await res.json();
      onJobCreated?.(job);
      router.refresh();
      // Clears the box for the next prompt - the job's own progress lives
      // in the Creations tab from here, not here.
      setPrompt("");
      setReferences([]);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <MediaPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} allowAudio={false} onConfirm={addPicked} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={references.length >= MAX_REFERENCES}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-white/12 text-muted-foreground backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/20 hover:text-foreground disabled:opacity-50 active:scale-[0.97]"
          title="Add reference images"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {references.map((r) => (
          <div key={r.storageKey} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10">
            {r.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- presigned/blob URL, not a static asset
              <img src={r.previewUrl} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setReferences((prev) => prev.filter((x) => x.storageKey !== r.storageKey))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors duration-150 ease-out hover:bg-neutral-700 active:scale-[0.95]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <MentionTextarea
        rows={2}
        value={prompt}
        onChange={setPrompt}
        options={references.map((_, i) => ({ tag: `Image${i + 1}` }))}
        placeholder={references.length > 0 ? "Describe your image (@ to reference an attached image)" : "Describe your image"}
        className="w-full resize-none rounded-2xl border border-white/10 bg-card/70 px-4 py-3 text-sm placeholder:text-muted-foreground backdrop-blur-md focus:outline-none"
      />

      {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/12 px-3 py-1.5 text-sm text-zinc-200 backdrop-blur-md">Flux.2 Klein</span>

          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm text-zinc-200 backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/20 active:scale-[0.97]"
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
              <div className="animate-popover-in absolute bottom-full right-0 z-20 mb-2">
                <ImageSettingsPopover settings={settings} onChange={setSettings} />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white transition-transform duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
        >
          {dispatching ? "Starting..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
