"use client";

import { useState } from "react";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { ComingSoon } from "./reference-panels";

interface JobRow {
  id: string;
  status: keyof typeof JOB_STATUS_CONFIG;
  createdAt: Date;
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
}: {
  jobs: JobRow[];
  extraTabs: { key: string; label: string; icon: React.ReactNode }[];
  greeting: string;
}) {
  const [tab, setTab] = useState("creations");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-8 py-3">
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

      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10">
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
                const config = JOB_STATUS_CONFIG[job.status];
                return (
                  <div key={job.id} className="rounded-2xl border border-border bg-card p-4">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {job.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                );
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
