"use client";

import { useEffect, useState } from "react";

interface JobOption {
  id: string;
  createdAt: string;
}

export function ExistingClipPicker({ onPick, onClose }: { onPick: (jobId: string) => void; onClose: () => void }) {
  const [options, setOptions] = useState<JobOption[] | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        const videos = (data.jobs ?? []).filter(
          (j: { type: string; status: string; outputStorageKey: string | null }) =>
            j.type === "video" && j.status === "done" && j.outputStorageKey
        );
        setOptions(videos);
      })
      .catch(() => setOptions([]));
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Pick a completed video</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      {options === null ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed videos yet - generate one first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {options.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => onPick(job.id)}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
              >
                {new Date(job.createdAt).toLocaleString()} <span className="font-mono text-xs text-muted-foreground">{job.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
