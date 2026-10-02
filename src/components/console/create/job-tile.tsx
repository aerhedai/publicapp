"use client";

import { useEffect, useState } from "react";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { useJobOutputUrl } from "@/lib/use-job-output-url";
import type { JobNotice } from "@/lib/use-live-jobs";

const FREE_REGEN_WINDOW_MS = 30_000; // mirrors src/lib/credits.ts's FREE_REGENERATION_WINDOW_MS - UI display only, server is the real authority on whether a given click actually lands free

function getPrompt(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const prompt = (input as Record<string, unknown>).prompt;
  return typeof prompt === "string" ? prompt : null;
}

export interface JobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
  updatedAt?: Date;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
  input?: unknown;
  seed?: number | null;
  regeneratedFromJobId?: string | null;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 10a8 8 0 0114-5.3M20 4v5h-5M20 14a8 8 0 01-14 5.3M4 20v-5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Live "Free for Ns" hint shown only on an original (non-regenerated) done
 * tile while it's still inside the free-regen window - purely informative,
 * the server (credits.ts) is what actually decides whether a click lands
 * free. Renders nothing once expired, and never starts ticking at all for a
 * tile that's already outside the window (the common case for anything but
 * a just-finished generation). */
function FreeRegenBadge({ updatedAt }: { updatedAt?: Date }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    updatedAt ? FREE_REGEN_WINDOW_MS - (Date.now() - updatedAt.getTime()) : -1
  );

  useEffect(() => {
    if (!updatedAt || remainingMs <= 0) return;
    const id = setInterval(() => {
      setRemainingMs(FREE_REGEN_WINDOW_MS - (Date.now() - updatedAt.getTime()));
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt, remainingMs]);

  if (!updatedAt || remainingMs <= 0) return null;
  return (
    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
      Free for {Math.ceil(remainingMs / 1000)}s
    </span>
  );
}

/**
 * A completed creation's tile: the media fills the entire fixed-size tile
 * (no surrounding card chrome), with a hover overlay for download/delete.
 * Shared by the Tools pages (creations-tabs.tsx), Home, and Explore - one
 * "what a finished job looks like" design, not three.
 */
export function DoneTile({ job, onDelete }: { job: JobRow; onDelete?: (jobId: string) => void }) {
  const { url, error } = useJobOutputUrl(job.id);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(() => getPrompt(job.input) ?? "");

  if (error) return null;

  const canRegenerate = job.type === "image" || job.type === "video";
  const canEdit = job.type === "image" && getPrompt(job.input) !== null;

  return (
    <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-150 ease-out">
      {!url ? (
        <div className="h-full w-full animate-pulse bg-white/5" />
      ) : job.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          src={url}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          onMouseEnter={(e) => void e.currentTarget.play()}
          onMouseLeave={(e) => e.currentTarget.pause()}
        />
      )}

      {url && !job.regeneratedFromJobId && <FreeRegenBadge updatedAt={job.updatedAt} />}

      {url && editing ? (
        <div
          className="absolute inset-0 flex flex-col gap-2 bg-black/70 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="flex-1 resize-none rounded-lg border border-white/15 bg-black/40 p-2 text-xs text-white focus:outline-none"
            placeholder="Edit prompt..."
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/25 active:scale-[0.95]"
              title="Cancel"
            >
              <CloseIcon />
            </button>
            <EditConfirmButton job={job} prompt={editPrompt} onDone={() => setEditing(false)} />
          </div>
        </div>
      ) : (
        url && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-150 ease-out group-hover:bg-black/55 group-hover:opacity-100">
            <a
              href={url}
              download
              onClick={(e) => e.stopPropagation()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/25 active:scale-[0.95]"
              title="Download"
            >
              <DownloadIcon />
            </a>
            {canRegenerate && <RegenerateButton job={job} />}
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditPrompt(getPrompt(job.input) ?? "");
                  setEditing(true);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/25 active:scale-[0.95]"
                title="Edit"
              >
                <EditIcon />
              </button>
            )}
            {onDelete && <DeleteButton jobId={job.id} onDelete={onDelete} />}
          </div>
        )
      )}
    </div>
  );
}

/** Re-dispatches `job` as a new generation, same input, same prompt - for
 * images, the stored seed is stripped so the worker picks a fresh random
 * one (a regenerate is explicitly "give me a different result," even if
 * the original happened to use a fixed seed). Free for the first
 * FREE_REGENERATIONS_PER_ORIGINAL attempts within FREE_REGENERATION_WINDOW_MS
 * of the original finishing (credits.ts) - this button never knows which
 * way that lands, it just fires the request and lets the normal credit
 * flow apply. */
function RegenerateButton({ job }: { job: JobRow }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleRegenerate(e: React.MouseEvent) {
    e.stopPropagation();
    if (submitting || !job.type || job.type === "stitch") return;
    setSubmitting(true);
    try {
      const input = { ...(job.input as Record<string, unknown>) };
      if (job.type === "image") delete input.seed;
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: job.type, input, regeneratedFromJobId: job.id }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleRegenerate(e)}
      disabled={submitting}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/25 active:scale-[0.95] disabled:opacity-50"
      title="Regenerate"
    >
      <RegenerateIcon />
    </button>
  );
}

/** Confirms an in-tile prompt edit: re-dispatches job.type="image" with the
 * edited prompt but the original job's own stored seed fixed in place
 * (falling back to whatever seed the original request specified, for a
 * job predating the seed column) - a normal, fully-priced generation, not
 * a free regenerate. */
function EditConfirmButton({ job, prompt, onDone }: { job: JobRow; prompt: string; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    if (submitting || !prompt.trim()) return;
    setSubmitting(true);
    try {
      const original = job.input as Record<string, unknown>;
      const input = { ...original, prompt: prompt.trim(), seed: job.seed ?? original.seed };
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", input }),
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleConfirm(e)}
      disabled={submitting}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-900 transition-colors duration-150 ease-out hover:bg-white/90 active:scale-[0.95] disabled:opacity-50"
      title="Regenerate with this prompt"
    >
      <CheckIcon />
    </button>
  );
}

function DeleteButton({ jobId, onDelete }: { jobId: string; onDelete: (jobId: string) => void }) {
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) onDelete(jobId);
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleDelete(e)}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-red-500/80 active:scale-[0.95]"
      title="Delete"
    >
      <TrashIcon />
    </button>
  );
}

export function ActiveTile({ job }: { job: JobRow }) {
  const config = JOB_STATUS_CONFIG[job.status];
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>{config.label}</span>
      {config.detail && <p className="text-center text-[11px] text-muted-foreground">{config.detail}</p>}
    </div>
  );
}

/** Renders a job as whichever tile fits its current status - the one place
 * every feed (Tools pages, Home, Explore) decides active vs. done, so they
 * can't drift out of sync on what counts as "in progress." Failed jobs are
 * expected to already be filtered out upstream (use-live-jobs.ts) - this
 * renders nothing for one defensively rather than assuming that always
 * held true. */
export function JobTile({ job, onDelete }: { job: JobRow; onDelete?: (jobId: string) => void }) {
  if (job.status === "failed") return null;
  const isActive = job.status === "queued" || job.status === "warming" || job.status === "processing";
  if (isActive) return <ActiveTile job={job} />;
  return <DoneTile job={job} onDelete={onDelete} />;
}

export function NoticeStack({ notices, onDismiss }: { notices: JobNotice[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (notices.length === 0) return;
    const timers = notices.map((n) => setTimeout(() => onDismiss(n.id), 5000));
    return () => timers.forEach(clearTimeout);
  }, [notices, onDismiss]);

  if (notices.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {notices.map((n) => (
        <div
          key={n.id}
          className="animate-popover-in flex items-center gap-3 rounded-xl border border-red-500/30 bg-neutral-900 px-4 py-2.5 text-sm text-red-300 shadow-lg"
        >
          {n.message}
          <button
            type="button"
            onClick={() => onDismiss(n.id)}
            className="text-red-300/60 transition-colors duration-150 ease-out hover:text-red-300"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
