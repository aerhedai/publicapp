"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ReferenceUploadPanel, type ReferenceSlot } from "./reference-panels";
import { ImageSettingsPopover } from "./settings-popover";
import { DEFAULT_IMAGE_SETTINGS, IMAGE_ASPECT_RATIOS, type ImageSettings } from "./types";
import { computeImageDimensions } from "@/lib/pixel-presets";

// Flux.2 Klein's own cap on multi-reference composition (see
// comfyui-flux2-klein-worker/graph_builder.py's MAX_REF_IMAGES) - kept in
// sync manually since the two repos don't share a build.
const MAX_REFERENCES = 9;

// Tight interval, not the shared pollJobUntilDone's 4s - Klein generates in
// ~5-11s on a warm worker (measured live), so a snappier poll is what makes
// the placeholder-to-image swap actually feel immediate instead of laggy.
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type GenerationState =
  | { phase: "idle" }
  | { phase: "generating"; jobId: string; startedAt: number; aspectRatio: number }
  | { phase: "done"; url: string }
  | { phase: "failed"; message: string };

/**
 * The actual image-generation form: references + prompt + model/settings +
 * Generate, wired straight to POST /api/jobs. Shared by the Tools > Image
 * page (image-tool-client.tsx) and the home page's create box
 * (creation-box.tsx) so both are literally the same logic, not two copies
 * that can drift.
 *
 * Shows a blank placeholder tile the moment Generate is pressed and swaps it
 * for the real image in place once the job completes - no navigation, no
 * waiting for the Creations grid to refresh. POST /api/jobs now attempts an
 * immediate inline dispatch (src/lib/dispatch-one-job.ts) instead of waiting
 * for the next cron tick, so on a warm worker this is genuinely a few
 * seconds end to end, not a queue-latency-dependent guess.
 */
export function ImageCreateForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_IMAGE_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceSlot[]>([]);
  const [generation, setGeneration] = useState<GenerationState>({ phase: "idle" });
  const [elapsedS, setElapsedS] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  // Ticks the elapsed-seconds readout while generating - purely cosmetic
  // (so a slow cold-start doesn't look frozen), not what drives polling.
  useEffect(() => {
    if (generation.phase !== "generating") return;
    const id = setInterval(() => setElapsedS(Math.round((Date.now() - generation.startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [generation]);

  const attachedRefs = references.filter((r) => r.storageKey);
  const uploading = references.some((r) => r.uploading);
  const canGenerate = prompt.trim().length > 0 && !uploading && generation.phase !== "generating";

  async function pollAndSwap(jobId: string) {
    const start = Date.now();
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const { job } = await res.json();
        if (job.status === "done") {
          const outputRes = await fetch(`/api/jobs/${jobId}/output`);
          if (outputRes.ok) {
            const { url } = await outputRes.json();
            setGeneration({ phase: "done", url });
            router.refresh();
            return;
          }
          setGeneration({ phase: "failed", message: "Generated, but couldn't load the result - check Creations." });
          return;
        }
        if (job.status === "failed") {
          setGeneration({ phase: "failed", message: job.error ?? "That generation failed." });
          router.refresh();
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    setGeneration({ phase: "failed", message: "Still working - check Creations shortly." });
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setElapsedS(0);
    try {
      const { width, height } = computeImageDimensions(settings.aspectRatio, settings.resolution);
      const characterRefs = Object.fromEntries(attachedRefs.map((r) => [r.label, r.storageKey as string]));
      const ratioEntry = IMAGE_ASPECT_RATIOS.find((a) => a.label === settings.aspectRatio);
      const placeholderRatio = ratioEntry?.ratio ?? width / height;

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
      setGeneration({ phase: "generating", jobId: job.id, startedAt: Date.now(), aspectRatio: placeholderRatio });
      router.refresh();
      await pollAndSwap(job.id);
    } catch (err) {
      setGeneration({ phase: "failed", message: (err as Error).message });
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

      {generation.phase === "generating" && (
        <div
          className="mx-auto mt-3 flex w-full max-w-xs flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-white/5"
          style={{ aspectRatio: generation.aspectRatio }}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          <p className="text-xs text-muted-foreground">Generating... {elapsedS}s</p>
        </div>
      )}

      {generation.phase === "done" && (
        // eslint-disable-next-line @next/next/no-img-element -- a short-lived R2 presigned URL, not a static asset Next's image optimizer can handle
        <img
          src={generation.url}
          alt={prompt}
          className="mx-auto mt-3 w-full max-w-xs rounded-2xl border border-border object-cover"
        />
      )}

      {generation.phase === "failed" && (
        <p className="mt-3 text-center text-xs text-red-400">{generation.message}</p>
      )}

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
          {generation.phase === "generating" ? "Generating..." : "Generate"}
        </button>
      </div>
    </>
  );
}
