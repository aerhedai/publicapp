"use client";

import { useEffect, useState } from "react";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { ComingSoon } from "./reference-panels";
import type { JobNotice } from "@/lib/use-live-jobs";

interface JobRow {
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
 * (no surrounding card chrome - status pill/date used to sit above a small
 * preview, now the media itself IS the tile), with a hover overlay for
 * download/delete. Fetches its own presigned URL once (same mechanism the
 * old output-preview.tsx used), never rendered for an active or failed job.
 */
function DoneTile({ job, onDelete }: { job: JobRow; onDelete: (jobId: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs/${job.id}/output`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setUrl(data.url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (res.ok) onDelete(job.id);
    } finally {
      setDeleting(false);
    }
  }

  if (error) return null;

  return (
    <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card">
      {!url ? (
        <div className="h-full w-full animate-pulse bg-white/5" />
      ) : job.type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <video src={url} className="h-full w-full object-cover" muted loop playsInline onMouseEnter={(e) => void e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
      )}

      {url && (
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/55 group-hover:opacity-100">
          <a
            href={url}
            download
            onClick={(e) => e.stopPropagation()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            title="Download"
          >
            <DownloadIcon />
          </a>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-red-500/80 disabled:opacity-50"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

function ActiveTile({ job }: { job: JobRow }) {
  const config = JOB_STATUS_CONFIG[job.status];
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>{config.label}</span>
      {config.detail && <p className="text-center text-[11px] text-muted-foreground">{config.detail}</p>}
    </div>
  );
}

function NoticeStack({ notices, onDismiss }: { notices: JobNotice[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (notices.length === 0) return;
    const timers = notices.map((n) => setTimeout(() => onDismiss(n.id), 5000));
    return () => timers.forEach(clearTimeout);
  }, [notices, onDismiss]);

  if (notices.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {notices.map((n) => (
        <div key={n.id} className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-neutral-900 px-4 py-2.5 text-sm text-red-300 shadow-lg">
          {n.message}
          <button type="button" onClick={() => onDismiss(n.id)} className="text-red-300/60 hover:text-red-300">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// The top tab bar seen on every Tools page (Creations/Templates/...).
// "Creations" shows real generation history for this tool's type - the
// same underlying data as /console/explore, just pre-filtered server-side
// by the page that renders this. Every other tab is an honest placeholder;
// there's no templates/motion-library/voices content to show yet.
export function CreationsTabs({
  jobs,
  extraTabs,
  greeting,
  contentBottomPadding,
  onDeleteJob,
  notices = [],
  onDismissNotice,
}: {
  jobs: JobRow[];
  extraTabs: { key: string; label: string; icon: React.ReactNode }[];
  greeting: string;
  // Extra bottom padding on the scrollable content, for pages that float a
  // borderless compose area over the bottom of the grid (image-tool-client.tsx
  // etc.) - without it the last row of tiles would sit hidden underneath it.
  contentBottomPadding?: boolean;
  onDeleteJob?: (jobId: string) => void;
  notices?: JobNotice[];
  onDismissNotice?: (id: string) => void;
}) {
  const [tab, setTab] = useState("creations");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {onDismissNotice && <NoticeStack notices={notices} onDismiss={onDismissNotice} />}

      {/* Static - shrink-0, not part of the scrolling region below, so it
          never moves regardless of how far the grid is scrolled. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-8 py-3">
        <button
          type="button"
          onClick={() => setTab("creations")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "creations" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M4 6h6v6H4V6zM14 6h6v6h-6V6zM4 16h6v2H4v-2zM14 16h6v2h-6v-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Creations
        </button>
        {extraTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty state stays centered (a welcoming hero moment) - once there's
          real content it starts flush at the top-left like a normal list,
          not centered as one block in the middle of the page (matches how
          Linear/Notion/Vercel's own dashboards lay out content). */}
      <div
        className={`flex flex-1 flex-col overflow-y-auto px-8 pt-10 ${contentBottomPadding ? "pb-64" : "pb-10"} ${
          tab !== "creations" || jobs.length === 0 ? "items-center justify-center" : "items-start"
        }`}
      >
        {tab === "creations" ? (
          jobs.length === 0 ? (
            <div className="text-center">
              <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Hello,</p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-muted-foreground sm:text-4xl">
                {greeting}
              </p>
            </div>
          ) : (
            <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
              {jobs.map((job) => {
                const isActive = job.status === "queued" || job.status === "warming" || job.status === "processing";
                if (isActive) return <ActiveTile key={job.id} job={job} />;
                return <DoneTile key={job.id} job={job} onDelete={(id) => onDeleteJob?.(id)} />;
              })}
            </div>
          )
        ) : (
          <ComingSoon label={extraTabs.find((t) => t.key === tab)?.label ?? tab} />
        )}
      </div>
    </div>
  );
}
