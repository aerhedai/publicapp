"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-file";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export interface ReferenceSlot {
  /** Stable per-slot key, not shown to the user - only "label" is. */
  id: string;
  label: string;
  storageKey: string | null;
  previewUrl: string | null;
  uploading: boolean;
}

export function makeEmptySlot(id: string, label: string): ReferenceSlot {
  return { id, label, storageKey: null, previewUrl: null, uploading: false };
}

/**
 * Real (not decorative) reference-image upload panel: click a slot to pick a
 * file, it uploads to R2 immediately and shows a thumbnail. Used by both the
 * image tool (generic, unlabeled references -> Flux.2 Klein's characterRefs)
 * and the video tool (labeled, since MiniMax H3's scene.characters array
 * needs a name per reference - see graph_builder.py's <Picture i> tagging).
 *
 * `showLabels` renders an editable text input per filled slot instead of a
 * fixed caption; the caller owns validating/deduping labels (video-chat.tsx
 * does, since labels there also drive character_references lookups).
 */
export function ReferenceUploadPanel({
  title = "Add References",
  subtitle,
  slots,
  onChange,
  maxSlots = 4,
  showLabels = false,
  accept = "image/png,image/jpeg,image/webp",
}: {
  title?: string;
  subtitle?: string;
  slots: ReferenceSlot[];
  onChange: (next: ReferenceSlot[]) => void;
  maxSlots?: number;
  showLabels?: boolean;
  accept?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startUpload(slotId: string) {
    pendingSlotId.current = slotId;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slotId = pendingSlotId.current;
    e.target.value = "";
    if (!file || !slotId) return;

    setError(null);
    const previewUrl = URL.createObjectURL(file);
    onChange(slots.map((s) => (s.id === slotId ? { ...s, previewUrl, uploading: true } : s)));

    try {
      const storageKey = await uploadFile(file);
      onChange(slots.map((s) => (s.id === slotId ? { ...s, storageKey, uploading: false } : s)));
    } catch {
      setError("Upload failed - try again.");
      onChange(slots.map((s) => (s.id === slotId ? { ...s, previewUrl: null, uploading: false } : s)));
    }
  }

  function removeSlot(slotId: string) {
    onChange(slots.filter((s) => s.id !== slotId));
  }

  function addSlot() {
    const n = slots.length + 1;
    onChange([...slots, makeEmptySlot(crypto.randomUUID(), `Reference ${n}`)]);
  }

  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFileChosen} />
      <div className="mt-3 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <div key={slot.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => startUpload(slot.id)}
                disabled={slot.uploading}
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-60"
                title={slot.previewUrl ? "Click to replace" : "Click to upload"}
              >
                {slot.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL, not a remote asset Next's optimizer can handle
                  <img src={slot.previewUrl} alt={slot.label} className="h-full w-full object-cover" />
                ) : (
                  <PlusIcon />
                )}
              </button>
              {slot.uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-[10px] text-white">
                  ...
                </div>
              )}
              {slot.previewUrl && !slot.uploading && (
                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-neutral-700"
                  title="Remove"
                >
                  <XIcon />
                </button>
              )}
            </div>
            {showLabels ? (
              <input
                value={slot.label}
                onChange={(e) =>
                  onChange(slots.map((s) => (s.id === slot.id ? { ...s, label: e.target.value } : s)))
                }
                className="w-16 rounded bg-transparent text-center text-[11px] text-muted-foreground focus:outline-none focus:text-foreground"
              />
            ) : null}
          </div>
        ))}
        {slots.length < maxSlots && (
          <button
            type="button"
            onClick={addSlot}
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-white/35 hover:text-foreground"
            title="Add another reference"
          >
            <PlusIcon />
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Isn&apos;t wired up yet - coming soon.</p>
    </div>
  );
}
