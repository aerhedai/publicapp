"use client";

import { useEffect, useState } from "react";

/**
 * Given a completed job, fetches a short-lived presigned URL
 * (GET /api/jobs/[id]/output) and renders a player/thumbnail plus a
 * download link. Nothing in the codebase rendered a <video>/<img> for a
 * finished job before this - outputStorageKey (the raw R2 key) is never
 * exposed to the client, only ever this presigned URL.
 */
export function OutputPreview({ jobId, type }: { jobId: string; type: "image" | "video" | "stitch" }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs/${jobId}/output`)
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
  }, [jobId]);

  if (error) return null;
  if (!url) {
    return <div className="mt-2 aspect-video w-full animate-pulse rounded-lg bg-white/5" />;
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
        <img src={url} alt="" className="aspect-video w-full rounded-lg object-cover" />
      ) : (
        <video src={url} controls className="aspect-video w-full rounded-lg bg-black" />
      )}
      <a href={url} download className="text-xs text-muted-foreground hover:text-foreground hover:underline">
        Download
      </a>
    </div>
  );
}
