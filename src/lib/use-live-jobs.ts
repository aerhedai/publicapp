"use client";

import { useEffect, useState } from "react";
import type { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

export interface LiveJobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
  type?: "image" | "video" | "stitch";
  outputStorageKey?: string | null;
}

const POLL_INTERVAL_MS = 2500;

const TERMINAL = new Set(["done", "failed"]);

/**
 * Owns the job list a Creations tab renders (src/components/console/create/
 * creations-tabs.tsx), seeded from the server-rendered `initialJobs` prop.
 * Two responsibilities, both driven from here rather than from whatever
 * compose form triggered a job, per the "chat box is never touched, only
 * the Creations tab shows progress" rule:
 *
 *   - addOptimistic: called the instant POST /api/jobs returns, so a new
 *     job's loading tile appears in the grid immediately - not on the next
 *     poll tick, and not by waiting on router.refresh() to re-run the
 *     server component.
 *   - a polling effect that re-fetches GET /api/jobs (filtered to `type`)
 *     every ~2.5s for as long as anything in the list is non-terminal, so a
 *     tile's status/output updates in place until it reaches done/failed,
 *     then stops polling entirely.
 */
export function useLiveJobs(initialJobs: LiveJobRow[], type: "image" | "video") {
  const [jobs, setJobs] = useState<LiveJobRow[]>(initialJobs);

  useEffect(() => {
    // Re-evaluated every time `jobs` changes (it's a dependency below), so
    // polling stops right after the last active job turns terminal instead
    // of running one interval too long.
    const hasActive = jobs.some((j) => !TERMINAL.has(j.status));
    if (!hasActive) return;

    const id = setInterval(async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) return;
      const { jobs: all } = await res.json();
      const filtered = (all as LiveJobRow[])
        .filter((j) => j.type === type)
        .slice(0, 30);
      setJobs(filtered);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [jobs, type]);

  function addOptimistic(job: { id: string; status: string }) {
    setJobs((prev) => [
      { id: job.id, status: job.status as LiveJobRow["status"], createdAt: new Date(), type, outputStorageKey: null },
      ...prev,
    ]);
  }

  return { jobs, addOptimistic };
}
