import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { VideoToolClient } from "@/components/console/create/video-tool-client";

export default async function VideoToolPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const jobs = await db
    .select({ id: generationJobs.id, status: generationJobs.status, createdAt: generationJobs.createdAt })
    .from(generationJobs)
    .where(and(eq(generationJobs.userId, userId), eq(generationJobs.type, "video")))
    .orderBy(desc(generationJobs.createdAt))
    .limit(30);

  return (
    <div className="flex h-full flex-col">
      <VideoToolClient jobs={jobs} />
    </div>
  );
}
