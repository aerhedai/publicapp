import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExploreClient } from "@/components/console/create/explore-client";

// Named "Explore" to match the requested nav structure - in practice this
// shows your own generation history, not a community feed (there's no
// public-content pipeline to draw from yet). Same real data as the old
// /console/library page it replaces.
export default async function ExplorePage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

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
    .limit(50);

  return <ExploreClient jobs={jobs} />;
}
