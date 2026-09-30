"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicVideoScene } from "@/lib/scene-validation";
import { VideoSettingsPopover } from "./settings-popover";
import { DEFAULT_VIDEO_SETTINGS, type VideoSettings } from "./types";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

type ReadyState = { scene: PublicVideoScene; characterRefs: Record<string, string>; estimatedCredits: number };
type MissingState = { missing: { label: string }[]; generateCostCredits: number };

type ChatApiResponse =
  | { type: "question"; message: string }
  | { type: "missing_references"; missing: { label: string }[]; generateCostCredits: number }
  | { type: "ready"; scene: PublicVideoScene; characterRefs: Record<string, string>; estimatedCredits: number }
  | { type: "error"; message: string };

async function uploadFile(file: File): Promise<string> {
  const presign = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
  });
  if (!presign.ok) throw new Error("Couldn't get an upload URL");
  const { key, uploadUrl } = await presign.json();

  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Upload to storage failed");

  return key as string;
}

async function registerReference(label: string, storageKey: string): Promise<void> {
  const res = await fetch("/api/character-references", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, storageKey }),
  });
  if (!res.ok) throw new Error("Couldn't save that reference");
}

async function pollJobUntilDone(jobId: string, timeoutMs = 5 * 60 * 1000): Promise<"done" | "failed" | "timeout"> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (res.ok) {
      const { job } = await res.json();
      if (job.status === "done") return "done";
      if (job.status === "failed") return "failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return "timeout";
}

export function VideoChat({
  dispatchOverride,
  onDispatched,
  onJobCreated,
  referencesPanel,
}: {
  // When provided, called instead of POSTing to /api/jobs directly - used by
  // the storyboard wrapper (src/app/console/projects/**) to save a scene
  // onto its project clip instead of dispatching it immediately (a project's
  // "generate" clips are dispatched one at a time, in order, by
  // advanceProject - see src/lib/projects.ts). The standalone Tools > Video
  // page passes neither prop and keeps today's behavior exactly.
  dispatchOverride?: (params: { scene: PublicVideoScene; characterRefs: Record<string, string> }) => Promise<void>;
  onDispatched?: () => void;
  // Called with the freshly-created job right after a non-override dispatch
  // succeeds, so the Tools > Video page can show its loading tile in the
  // Creations grid immediately (src/lib/use-live-jobs.ts) - never rendered
  // here, this chat stays exactly as it was regardless of what happens to
  // the job afterward.
  onJobCreated?: (job: { id: string; status: string }) => void;
  // Rendered inside the same bordered textarea box, in a grid-cols-[auto_1fr]
  // layout matching the image tool's format exactly (see video-tool-client.tsx,
  // which owns the actual upload/registration state) - the whole reason this
  // exists is so references can be attached up front instead of only via the
  // LLM asking mid-conversation.
  referencesPanel?: React.ReactNode;
} = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [missingState, setMissingState] = useState<MissingState | null>(null);
  const [readyState, setReadyState] = useState<ReadyState | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null); // which missing-character action is in flight
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadLabel = useRef<string | null>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsOpen]);

  async function sendTurn(nextMessages: ChatTurn[]) {
    setSending(true);
    setMissingState(null);
    setReadyState(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "video", messages: nextMessages }),
      });
      const data = (await res.json()) as ChatApiResponse;

      if (data.type === "question") {
        setMessages([...nextMessages, { role: "assistant", content: data.message }]);
      } else if (data.type === "missing_references") {
        const summary = `I need a reference photo for: ${data.missing.map((m) => m.label).join(", ")}.`;
        setMessages([...nextMessages, { role: "assistant", content: summary }]);
        setMissingState({ missing: data.missing, generateCostCredits: data.generateCostCredits });
      } else if (data.type === "ready") {
        // The LLM never decides duration/aspect ratio/resolution - these are
        // the settings the worker actually reads per-job (graph_builder.py's
        // build_scene_graph), so the popover's current values always
        // override whatever the draft defaulted to, right before the user
        // ever sees a number.
        const scene: PublicVideoScene = {
          ...data.scene,
          duration: videoSettings.durationSeconds,
          aspect_ratio: videoSettings.aspectRatio,
          resolution: videoSettings.resolution,
        };
        const summary = `Ready to generate: ${scene.action} (${scene.duration}s, ${data.estimatedCredits} credits).`;
        setMessages([...nextMessages, { role: "assistant", content: summary }]);
        setReadyState({ scene, characterRefs: data.characterRefs, estimatedCredits: data.estimatedCredits });
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.message }]);
      }
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    if (!input.trim() || sending) return;
    const nextMessages = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    void sendTurn(nextMessages);
  }

  function startUpload(label: string) {
    pendingUploadLabel.current = label;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const label = pendingUploadLabel.current;
    e.target.value = "";
    if (!file || !label) return;

    setBusyLabel(label);
    try {
      const key = await uploadFile(file);
      await registerReference(label, key);
      // Same conversation, resent unchanged - the server rebuilds its
      // "existing references" context fresh from the DB each call, so the
      // LLM now sees this reference and can match it by label this time.
      await sendTurn(messages);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: `Couldn't save that photo for ${label}. Try again.` }]);
    } finally {
      setBusyLabel(null);
    }
  }

  async function generateReference(label: string) {
    setBusyLabel(label);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          input: { mode: "environment", prompt: `A clear, well-lit portrait photo of ${label}.`, width: 768, height: 1344 },
          createsReferenceLabel: label,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? "Couldn't start generating that reference");
      }
      const { job } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: `Generating a reference photo for ${label}...` }]);

      const outcome = await pollJobUntilDone(job.id);
      if (outcome === "done") {
        await sendTurn(messages);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              outcome === "failed"
                ? `Generating a reference for ${label} failed. Try uploading a photo instead.`
                : `Still working on ${label}'s reference photo - send another message once it's ready.`,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: (err as Error).message }]);
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleGenerateVideo() {
    if (!readyState) return;
    setDispatching(true);
    try {
      if (dispatchOverride) {
        await dispatchOverride({ scene: readyState.scene, characterRefs: readyState.characterRefs });
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "video",
            input: { scene: readyState.scene, characterRefs: readyState.characterRefs },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? body.error ?? "Couldn't start that generation");
        }
        const { job } = await res.json();
        onJobCreated?.(job);
      }
      setDispatched(true);
      setReadyState(null);
      setMessages((prev) => [...prev, { role: "assistant", content: "Queued - it'll show up in Creations once it's ready." }]);
      if (onDispatched) {
        onDispatched();
      } else {
        router.refresh();
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: (err as Error).message }]);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChosen} />

      {messages.length > 0 && (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end rounded-2xl bg-white/10 px-3 py-2 text-sm" : "self-start rounded-2xl bg-white/5 px-3 py-2 text-sm text-zinc-300"}>
              {m.content}
            </div>
          ))}
        </div>
      )}

      {missingState && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          {missingState.missing.map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-3">
              <span className="text-sm">{m.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyLabel === m.label}
                  onClick={() => startUpload(m.label)}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
                >
                  Upload a photo
                </button>
                <button
                  type="button"
                  disabled={busyLabel === m.label}
                  onClick={() => void generateReference(m.label)}
                  className="rounded-full bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
                >
                  Generate ({missingState.generateCostCredits} credit{missingState.generateCostCredits === 1 ? "" : "s"})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {readyState && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-zinc-300">
            <p className="font-medium text-foreground">{readyState.estimatedCredits} credits</p>
            <p>{readyState.scene.duration}s, silent</p>
          </div>
          <button
            type="button"
            disabled={dispatching}
            onClick={() => void handleGenerateVideo()}
            className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {dispatching ? "Starting..." : "Generate"}
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-4">
        {referencesPanel ? (
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="border-r border-border pr-4">{referencesPanel}</div>
            <textarea
              rows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={dispatched ? "Describe another video" : "Describe your video"}
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        ) : (
          <textarea
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={dispatched ? "Describe another video" : "Describe your video"}
            className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300">MiniMax H3</span>
          <div className="relative" ref={settingsPopoverRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
            >
              {`${videoSettings.aspectRatio} · ${videoSettings.durationSeconds}s · ${videoSettings.resolution}`}
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d={settingsOpen ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {settingsOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-2">
                <VideoSettingsPopover settings={videoSettings} onChange={setVideoSettings} compact />
              </div>
            )}
          </div>
          </div>

          <button
            type="button"
            disabled={!input.trim() || sending}
            onClick={handleSend}
            className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
