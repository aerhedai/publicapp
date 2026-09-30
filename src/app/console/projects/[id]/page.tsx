import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ProjectDetailClient } from "@/components/console/projects/project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders
  const { id } = await params;

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  if (!project) notFound();

  return <ProjectDetailClient projectId={id} />;
}
