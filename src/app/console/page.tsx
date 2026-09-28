import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";

const QUICK_ACTIONS = [
  {
    href: "/console/generate",
    title: "Generate",
    description: "Create a video or image from a prompt and character references.",
    icon: (
      <path
        d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/chat",
    title: "Chat",
    description: "Talk through an idea before turning it into a scene.",
    icon: (
      <path
        d="M4 5h16v10H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export default async function ConsoleHome() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(5);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a tool to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-foreground">
              {action.icon}
            </svg>
            <h2 className="mt-4 font-display text-lg font-medium">{action.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
            <span className="mt-4 flex items-center gap-1 text-sm font-medium text-gradient-accent">
              Open
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 text-foreground">
                <path
                  d="M4 10h12M11 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
          <Link
            href="/console/library"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing yet - your generations will show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const config = JOB_STATUS_CONFIG[job.status];
              return (
                <li key={job.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {job.type === "video" ? "Video" : "Image"} &middot;{" "}
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
                    {config.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
