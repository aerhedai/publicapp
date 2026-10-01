"use client";

import { useEffect } from "react";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { useJobOutputUrl } from "@/lib/use-job-output-url";
import type { JobNotice } from "@/lib/use-live-jobs";

export interface JobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
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

/**
 * A completed creation's tile: the media fills the entire fixed-size tile
 * (no surrounding card chrome), with a hover overlay for download/delete.
 * Shared by the Tools pages (creations-tabs.tsx), Home, and Explore - one
 * "what a finished job looks like" design, not three.
 */
export function DoneTile({ job, onDelete }: { job: JobRow; onDelete?: (jobId: string) => void }) {
  const { url, error } = useJobOutputUrl(job.id);

  if (error) return null;

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

      {url && (
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/0 opacity-0 transition-all duration-150 ease-out group-hover:bg-black/55 group-hover:opacity-100">
          <a
            href={url}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors duration-150 ease-out hover:bg-white/25 active:scale-[0.95]"
            title="Download"
          >
            <DownloadIcon />
          </a>
          {onDelete && <DeleteButton jobId={job.id} onDelete={onDelete} />}
        </div>
      )}
    </div>
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
