import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NewProjectButton } from "@/components/console/projects/new-project-button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  stitching: "Stitching",
  done: "Done",
  failed: "Failed",
};

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Storyboard projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan multiple scenes, mix in clips you&apos;ve already generated, and stitch them into one video.
          </p>
        </div>
        <NewProjectButton />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No storyboards yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/console/projects/${p.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-white/5"
              >
                <span className="text-sm font-medium">{p.title}</span>
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[p.status] ?? p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
