"use client";

import { useEffect, useRef, useState } from "react";
import type { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

export interface LiveJobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
}

export interface JobNotice {
  id: string;
  message: string;
}

const POLL_INTERVAL_MS = 2500;
const FETCH_LIMIT = 30;

const TERMINAL = new Set(["done", "failed"]);

/**
 * Owns the job list a Creations tab renders (src/components/console/create/
 * creations-tabs.tsx and now Home/Explore too), seeded from the
 * server-rendered `initialJobs` prop. `type` is optional - omit it for a
 * combined feed across every job type (Home), or pass "image"/"video" for a
 * single Tools page, same as before. Responsibilities, all driven from here
 * rather than from whatever compose form triggered a job, per the "chat box
 * is never touched, only the Creations tab shows progress" rule:
 *
 *   - addOptimistic: called the instant POST /api/jobs returns, so a new
 *     job's loading tile appears in the grid immediately - not on the next
 *     poll tick, and not by waiting on router.refresh() to re-run the
 *     server component.
 *   - a polling effect that re-fetches GET /api/jobs (server-side filtered
 *     to `type` + a bounded `limit` - see api/jobs/route.ts) every ~2.5s for
 *     as long as anything in the list is non-terminal, so a tile's
 *     status/output updates in place until it reaches done/failed, then
 *     stops polling entirely.
 *   - a failed job is never rendered as a tile at all (the returned `jobs`
 *     list excludes them) - the first poll tick that newly observes a job
 *     as "failed" instead raises a one-time, dismissible notice, so a
 *     failure is surfaced without permanently cluttering the grid with a
 *     dead tile. A job already failed in the server-rendered seed (e.g. a
 *     page reload) does NOT raise a notice - only a failure genuinely
 *     observed during this session does.
 *   - removeJob: optimistic local removal after a successful DELETE
 *     (creations-tabs.tsx's hover-overlay delete button).
 */
export function useLiveJobs(initialJobs: LiveJobRow[], type?: "image" | "video") {
  const [jobs, setJobs] = useState<LiveJobRow[]>(initialJobs);
  const [notices, setNotices] = useState<JobNotice[]>([]);
  const knownFailedIds = useRef(new Set(initialJobs.filter((j) => j.status === "failed").map((j) => j.id)));

  useEffect(() => {
    // Re-evaluated every time `jobs` changes (it's a dependency below), so
    // polling stops right after the last active job turns terminal instead
    // of running one interval too long.
    const hasActive = jobs.some((j) => !TERMINAL.has(j.status));
    if (!hasActive) return;

    const query = new URLSearchParams({ limit: String(FETCH_LIMIT) });
    if (type) query.set("type", type);

    const id = setInterval(async () => {
      const res = await fetch(`/api/jobs?${query}`);
      if (!res.ok) return;
      const { jobs: all } = await res.json();
      // JSON has no Date type - createdAt comes back as an ISO string here,
      // unlike the initial server-rendered prop (RSC serialization DOES
      // preserve real Date objects). Without this conversion,
      // creations-tabs.tsx's job.createdAt.toLocaleDateString() throws the
      // moment a poll tick lands - which is almost immediately after
      // generating anything, since a fresh job is always non-terminal.
      const filtered = (all as (Omit<LiveJobRow, "createdAt"> & { createdAt: string })[]).map((j) => ({
        ...j,
        createdAt: new Date(j.createdAt),
      }));

      for (const j of filtered) {
        if (j.status === "failed" && !knownFailedIds.current.has(j.id)) {
          knownFailedIds.current.add(j.id);
          setNotices((prev) => [...prev, { id: j.id, message: "A generation failed." }]);
        }
      }
      setJobs(filtered);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [jobs, type]);

  function addOptimistic(job: { id: string; status: string; type?: "image" | "video" }) {
    setJobs((prev) => [
      {
        id: job.id,
        status: job.status as LiveJobRow["status"],
        createdAt: new Date(),
        type: job.type ?? type,
        outputStorageKey: null,
      },
      ...prev,
    ]);
  }

  function removeJob(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  function dismissNotice(noticeId: string) {
    setNotices((prev) => prev.filter((n) => n.id !== noticeId));
  }

  return {
    jobs: jobs.filter((j) => j.status !== "failed"),
    addOptimistic,
    removeJob,
    notices,
    dismissNotice,
  };
}
