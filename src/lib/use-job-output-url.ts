"use client";

import { useEffect, useState } from "react";

// Presigned GET URLs from /api/jobs/[id]/output are valid for 600s
// (src/app/api/jobs/[id]/output/route.ts) - cached here in sessionStorage
// keyed by job id with that same expiry, so remounting an already-seen
// tile (switching tabs, revisiting Home, scrolling a long feed in and out
// of view) skips the fetch + loading-skeleton flash entirely instead of
// re-requesting a URL for bytes that haven't changed. Falls back to a
// fresh fetch once the cached entry is missing or expired. No library
// (no SWR/React Query anywhere in this app) - this is deliberately the
// smallest cache that actually fixes the complaint ("thumbnails
// reload/flash"), not a general data-fetching layer.
const TTL_MS = 600_000;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

function readCache(jobId: string): string | null {
  try {
    const raw = sessionStorage.getItem(`job-output:${jobId}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.expiresAt <= Date.now()) return null;
    return entry.url;
  } catch {
    return null; // private-browsing/storage-disabled - fall through to a fetch
  }
}

function writeCache(jobId: string, url: string): void {
  try {
    const entry: CacheEntry = { url, expiresAt: Date.now() + TTL_MS };
    sessionStorage.setItem(`job-output:${jobId}`, JSON.stringify(entry));
  } catch {
    // Storage full/disabled - the tile still works, just without caching.
  }
}

export function useJobOutputUrl(jobId: string): { url: string | null; error: boolean } {
  const [url, setUrl] = useState<string | null>(() => readCache(jobId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (url) return; // already satisfied from cache, nothing to fetch
    let cancelled = false;
    fetch(`/api/jobs/${jobId}/output`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setUrl(data.url);
        writeCache(jobId, data.url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // `url` is a real dependency (the early-return guard reads it), just a
    // harmless one to re-run on - once it's set the effect immediately
    // no-ops via that same guard, it never fetches twice.
  }, [jobId, url]);

  return { url, error };
}
