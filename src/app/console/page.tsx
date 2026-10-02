import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { HomeClient } from "@/components/console/create/home-client";

export default async function ConsoleHome() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  // Combined feed across every job type (not just 5, not type-filtered) -
  // Home shows one unified "everything you've made" column now, matching
  // the same shared tile/day-grouping design as the Tools pages and Explore.
  const jobs = await db
    .select({
      id: generationJobs.id,
      status: generationJobs.status,
      createdAt: generationJobs.createdAt,
      updatedAt: generationJobs.updatedAt,
      type: generationJobs.type,
      outputStorageKey: generationJobs.outputStorageKey,
      input: generationJobs.input,
      seed: generationJobs.seed,
      regeneratedFromJobId: generationJobs.regeneratedFromJobId,
    })
    .from(generationJobs)
    .where(eq(generationJobs.userId, userId))
    .orderBy(desc(generationJobs.createdAt))
    .limit(30);

  return <HomeClient jobs={jobs} />;
}
