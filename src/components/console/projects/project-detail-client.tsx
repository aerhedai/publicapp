"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JOB_STATUS_CONFIG } from "@/lib/job-status-ui";
import { VideoChat } from "@/components/console/create/video-chat";
import type { PublicVideoScene } from "@/lib/scene-validation";
import { ExistingClipPicker } from "./existing-clip-picker";

type ClipSource = "generate" | "existing";

interface Clip {
  id: string;
  orderIndex: number;
  source: ClipSource;
  sceneDraft: { scene: PublicVideoScene; characterRefs: Record<string, string> } | null;
  generationJobId: string | null;
  generationJob: { status: keyof typeof JOB_STATUS_CONFIG; error: string | null } | null;
  previewUrl: string | null;
}

interface ProjectDetail {
  id: string;
  title: string;
  status: "draft" | "generating" | "stitching" | "done" | "failed";
  previewUrl: string | null;
}

const TERMINAL_STATUSES = new Set(["done", "failed"]);
const POLL_MS = 4000;

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [addingExisting, setAddingExisting] = useState(false);
  const [writingClipId, setWritingClipId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    setProject(data.project);
    setClips(data.clips);
  }, [projectId]);

  useEffect(() => {
    // refresh's setState calls happen after its internal `await fetch(...)`,
    // not synchronously in this effect body - a legitimate mount-time fetch
    // (same pattern as output-preview.tsx), the lint rule just can't see
    // through the named useCallback to tell the two cases apart.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!project || TERMINAL_STATUSES.has(project.status)) return;
    pollRef.current = setTimeout(() => void refresh(), POLL_MS);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [project, refresh]);

  async function addClip(source: ClipSource, existingJobId?: string) {
    const res = await fetch(`/api/projects/${projectId}/clips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, existingJobId }),
    });
    if (res.ok) await refresh();
    setAddingExisting(false);
  }

  async function saveSceneDraft(clipId: string, sceneDraft: { scene: PublicVideoScene; characterRefs: Record<string, string> }) {
    const res = await fetch(`/api/projects/${projectId}/clips/${clipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneDraft }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Couldn't save that scene");
    }
  }

  if (!project) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.status === "draft" && "Add scenes below, in the order they should play."}
          {project.status === "generating" && "Generating scenes, one at a time..."}
          {project.status === "stitching" && "All scenes are ready - stitching your final video..."}
          {project.status === "done" && "Done."}
          {project.status === "failed" && "Something went wrong - see the failed scene below."}
        </p>
      </div>

      {project.status === "done" && project.previewUrl && (
        <video src={project.previewUrl} controls className="aspect-video w-full rounded-2xl bg-black" />
      )}

      <ol className="flex flex-col gap-3">
        {clips.map((clip, i) => (
          <li key={clip.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Scene {i + 1}</span>
              {clip.generationJob && (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${JOB_STATUS_CONFIG[clip.generationJob.status].className}`}>
                  {JOB_STATUS_CONFIG[clip.generationJob.status].label}
                </span>
              )}
            </div>

            {clip.previewUrl ? (
              <video src={clip.previewUrl} controls className="aspect-video w-full rounded-lg bg-black" />
            ) : clip.source === "existing" ? (
              <p className="text-sm text-muted-foreground">Reused clip - preview unavailable.</p>
            ) : clip.generationJob?.status === "failed" ? (
              <p className="text-sm text-red-400">{clip.generationJob.error ?? "Generation failed."}</p>
            ) : clip.sceneDraft ? (
              <p className="text-sm text-muted-foreground">
                {clip.generationJobId ? "Waiting for its turn to generate..." : "Queued - will generate once it's this scene's turn."}
              </p>
            ) : writingClipId === clip.id ? (
              <VideoChat
                dispatchOverride={async (params) => {
                  await saveSceneDraft(clip.id, params);
                  setWritingClipId(null);
                }}
                onDispatched={() => void refresh()}
              />
            ) : (
              <button
                type="button"
                onClick={() => setWritingClipId(clip.id)}
                className="rounded-full bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10"
              >
                Write this scene
              </button>
            )}
          </li>
        ))}
      </ol>

      {project.status === "draft" || project.status === "generating" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void addClip("generate")}
            className="rounded-full bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10"
          >
            + Add AI-generated scene
          </button>
          <button
            type="button"
            onClick={() => setAddingExisting(true)}
            className="rounded-full bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10"
          >
            + Add an existing clip
          </button>
        </div>
      ) : null}

      {addingExisting && (
        <ExistingClipPicker onPick={(jobId) => void addClip("existing", jobId)} onClose={() => setAddingExisting(false)} />
      )}
    </div>
  );
}
