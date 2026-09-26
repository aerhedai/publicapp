import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// This route has no explicit auth check of its own because src/proxy.ts
// already default-denies everything not on its public allowlist - but the
// data fetch below still filters by userId itself, so this page is safe
// even if the proxy were ever misconfigured (defense in depth, not
// reliance on a single layer).
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return null; // proxy should have redirected before this ever renders
  }

  const jobs = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(20);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserButton />
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Recent jobs
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs yet. This is where the video-generation flow will plug in.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{job.id}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{job.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
