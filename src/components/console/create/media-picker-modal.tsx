"use client";

import { useEffect, useRef, useState } from "react";
import { uploadFile, registerCharacterReference } from "@/lib/upload-file";
import { useJobOutputUrl } from "@/lib/use-job-output-url";

export interface PickedMedia {
  type: "image" | "audio";
  storageKey: string;
  previewUrl: string | null;
}

interface JobRow {
  id: string;
  status: string;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
}

interface LibraryRow {
  id: string;
  label: string;
  mediaType: "image" | "audio";
  storageKey: string;
  url: string;
}

function CreationThumb({ job, selected, onPick }: { job: JobRow; selected: boolean; onPick: (storageKey: string, url: string) => void }) {
  const { url } = useJobOutputUrl(job.id);

  if (!url) return <div className="aspect-square w-full animate-pulse rounded-xl bg-white/5" />;

  return (
    <button
      type="button"
      onClick={() => onPick(job.outputStorageKey as string, url)}
      className={`relative aspect-square w-full overflow-hidden rounded-xl border transition-colors duration-150 ease-out ${
        selected ? "border-white" : "border-transparent hover:border-white/30"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset */}
      <img src={url} alt="" className="h-full w-full object-cover" />
    </button>
  );
}

/**
 * "Upload or select media" modal - replaces reference-panels.tsx's old
 * direct-to-file-picker "+" tile. Left: past Creations (completed image
 * jobs only - video/stitch outputs aren't valid reference inputs) and a
 * persistent Uploads library. Right: fresh-upload tiles plus whatever's
 * already picked this time, each removable. "Use" commits the selection
 * back to the caller (video-chat.tsx's compose-session slots, or
 * image-create-form.tsx's attached references).
 */
export function MediaPickerModal({
  open,
  onClose,
  allowAudio,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  allowAudio: boolean;
  onConfirm: (picked: PickedMedia[]) => void;
}) {
  const [tab, setTab] = useState<"creations" | "uploads">("creations");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [picked, setPicked] = useState<PickedMedia[]>([]);
  const [uploading, setUploading] = useState<"image" | "audio" | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Resetting state during render in response to a prop change (React's own
  // recommended pattern - react.dev/learn/you-might-not-need-an-effect)
  // rather than setState inside the data-fetching effect below, which
  // would trigger an extra cascading render for no benefit.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPicked([]);
  }

  useEffect(() => {
    if (!open) return;
    fetch("/api/jobs?type=image&limit=50")
      .then((res) => (res.ok ? res.json() : { jobs: [] }))
      .then((data) => setJobs((data.jobs as JobRow[]).filter((j) => j.status === "done")))
      .catch(() => setJobs([]));
    fetch("/api/character-references")
      .then((res) => (res.ok ? res.json() : { references: [] }))
      .then((data) => setLibrary(data.references as LibraryRow[]))
      .catch(() => setLibrary([]));
  }, [open]);

  // The real keyboard equivalent to the backdrop's click-to-dismiss below -
  // a11y audit correctly flagged that div as having a click handler with no
  // keyboard path; making the backdrop itself focusable/tabbable would be
  // worse UX (an invisible full-screen tab stop), so Escape is the standard
  // modal pattern instead.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function togglePick(type: "image" | "audio", storageKey: string, previewUrl: string | null) {
    setPicked((prev) => {
      const exists = prev.some((p) => p.storageKey === storageKey);
      if (exists) return prev.filter((p) => p.storageKey !== storageKey);
      return [...prev, { type, storageKey, previewUrl }];
    });
  }

  async function handleUpload(file: File, type: "image" | "audio") {
    setUploading(type);
    try {
      const storageKey = await uploadFile(file);
      const previewUrl = type === "image" ? URL.createObjectURL(file) : null;
      setPicked((prev) => [...prev, { type, storageKey, previewUrl }]);
      // Also persists to the Uploads library (fire-and-forget - a failure
      // here shouldn't block using the file in this session).
      void registerCharacterReference(storageKey, type, file.name);
    } catch {
      // Swallowed - the picker's upload tile has no dedicated error slot;
      // the file simply doesn't appear in `picked`, which is self-evident.
    } finally {
      setUploading(null);
    }
  }

  return (
    // Click-to-dismiss backdrop; Escape (handled above) is its real keyboard
    // equivalent - this project's lint config doesn't enforce jsx-a11y, but
    // the fix (Escape support + role="dialog"/aria-modal/aria-label below)
    // is real regardless of whether a linter checks for it.
    <div className="animate-popover-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload or select media"
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-medium">Upload or select media</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors duration-150 ease-out hover:bg-white/20 active:scale-[0.95]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-2 divide-x divide-white/10 overflow-hidden">
          <div className="flex flex-col overflow-hidden">
            <div className="flex gap-2 border-b border-white/10 px-6 py-3">
              <button
                type="button"
                onClick={() => setTab("creations")}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-out ${tab === "creations" ? "bg-white/15" : "text-muted-foreground hover:bg-white/8"}`}
              >
                Creations
              </button>
              <button
                type="button"
                onClick={() => setTab("uploads")}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-out ${tab === "uploads" ? "bg-white/15" : "text-muted-foreground hover:bg-white/8"}`}
              >
                Uploads
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {tab === "creations" ? (
                jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed images yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {jobs.map((job) => (
                      <CreationThumb
                        key={job.id}
                        job={job}
                        selected={picked.some((p) => p.storageKey === job.outputStorageKey)}
                        onPick={(storageKey, url) => togglePick("image", storageKey, url)}
                      />
                    ))}
                  </div>
                )
              ) : library.filter((r) => allowAudio || r.mediaType === "image").length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {library
                    .filter((r) => allowAudio || r.mediaType === "image")
                    .map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => togglePick(r.mediaType, r.storageKey, r.mediaType === "image" ? r.url : null)}
                        className={`relative aspect-square w-full overflow-hidden rounded-xl border transition-colors duration-150 ease-out ${
                          picked.some((p) => p.storageKey === r.storageKey) ? "border-white" : "border-transparent hover:border-white/30"
                        } ${r.mediaType === "audio" ? "flex items-center justify-center bg-white/8" : ""}`}
                        title={r.label}
                      >
                        {r.mediaType === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
                          <img src={r.url} alt={r.label} className="h-full w-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-zinc-400">
                            <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void handleUpload(f, "image");
                  }}
                />
                <button
                  type="button"
                  disabled={uploading === "image"}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/15 hover:text-foreground disabled:opacity-50 active:scale-[0.98]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {uploading === "image" ? "Uploading..." : "Upload Image"}
                </button>

                {allowAudio && (
                  <>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp4"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void handleUpload(f, "audio");
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading === "audio"}
                      onClick={() => audioInputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 text-xs text-muted-foreground transition-colors duration-150 ease-out hover:bg-white/15 hover:text-foreground disabled:opacity-50 active:scale-[0.98]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                        <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      {uploading === "audio" ? "Uploading..." : "Upload Audio"}
                    </button>
                  </>
                )}

                {picked.map((p) => (
                  <div key={p.storageKey} className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10">
                    {p.type === "image" && p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- presigned/blob URL, not a static asset
                      <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/8 text-[10px] text-zinc-400">
                        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                          <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        Audio
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPicked((prev) => prev.filter((x) => x.storageKey !== p.storageKey))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-colors duration-150 ease-out hover:bg-red-400 active:scale-[0.95]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 p-4">
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={() => onConfirm(picked)}
                className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition-transform duration-150 ease-out disabled:opacity-40 active:scale-[0.97]"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
