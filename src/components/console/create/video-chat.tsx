"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicVideoScene } from "@/lib/scene-validation";
import { VideoSettingsPopover } from "./settings-popover";
import { DEFAULT_VIDEO_SETTINGS, type VideoSettings } from "./types";
import { MentionTextarea } from "./mention-textarea";
import { MediaPickerModal, type PickedMedia } from "./media-picker-modal";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// One attached item for the current compose session, numbered by
// attachment order within this session (resets every fresh VideoChat
// instance/remount) - this is exactly what "@Image1"/"@Audio1" refer to.
// Not persisted as this shape; storageKey may itself come from a brand new
// upload, the Uploads library, or a past Creation (media-picker-modal.tsx).
interface Slot {
  type: "image" | "audio";
  index: number;
  storageKey: string;
  previewUrl: string | null;
}

type ReadyState = {
  scene: PublicVideoScene;
  characterRefs: Record<string, string>;
  audioRefs: Record<string, string>;
  estimatedCredits: number;
};

type ChatApiResponse =
  | { type: "question"; message: string }
  | { type: "unresolved_tags"; tags: string[] }
  | {
      type: "ready";
      scene: PublicVideoScene;
      characterRefs: Record<string, string>;
      audioRefs: Record<string, string>;
      estimatedCredits: number;
    }
  | { type: "error"; message: string };

const TAG_PATTERN = /@(Image|Audio)(\d+)\b/g;

/** Client-side mirror of src/lib/scene-validation.ts's resolveReferenceTags -
 * duplicated rather than imported because that module is also imported by
 * API routes with server-only context; this half just needs the same regex
 * to validate before ever calling /api/chat (the server re-validates too,
 * never trusting the client). */
function findUnresolvedTags(text: string, slots: Slot[]): string[] {
  const bySlot = new Set(slots.map((s) => `${s.type}:${s.index}`));
  const unresolved: string[] = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const key = `${match[1].toLowerCase()}:${Number(match[2])}`;
    if (!bySlot.has(key)) unresolved.push(`${match[1]}${match[2]}`);
  }
  return unresolved;
}

export function VideoChat({
  dispatchOverride,
  onDispatched,
  onJobCreated,
}: {
  // When provided, called instead of POSTing to /api/jobs directly - used by
  // the storyboard wrapper (src/app/console/projects/**) to save a scene
  // onto its project clip instead of dispatching it immediately (a project's
  // "generate" clips are dispatched one at a time, in order, by
  // advanceProject - see src/lib/projects.ts). The standalone Tools > Video
  // page passes neither prop and keeps today's behavior exactly.
  dispatchOverride?: (params: {
    scene: PublicVideoScene;
    characterRefs: Record<string, string>;
    audioRefs: Record<string, string>;
  }) => Promise<void>;
  onDispatched?: () => void;
  // Called with the freshly-created job right after a non-override dispatch
  // succeeds, so the Tools > Video page can show its loading tile in the
  // Creations grid immediately (src/lib/use-live-jobs.ts) - never rendered
  // here, this chat stays exactly as it was regardless of what happens to
  // the job afterward.
  onJobCreated?: (job: { id: string; status: string }) => void;
} = {}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unresolvedTags, setUnresolvedTags] = useState<string[] | null>(null);
  const [readyState, setReadyState] = useState<ReadyState | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  function addPicked(picked: PickedMedia[]) {
    setSlots((prev) => {
      let nextImageIndex = prev.filter((s) => s.type === "image").length + 1;
      let nextAudioIndex = prev.filter((s) => s.type === "audio").length + 1;
      const added: Slot[] = picked.map((p) => {
        if (p.storageKey && prev.some((s) => s.storageKey === p.storageKey)) {
          return null as unknown as Slot; // filtered below - already attached
        }
        const slot: Slot = {
          type: p.type,
          index: p.type === "image" ? nextImageIndex : nextAudioIndex,
          storageKey: p.storageKey,
          previewUrl: p.previewUrl,
        };
        if (p.type === "image") nextImageIndex++;
        else nextAudioIndex++;
        return slot;
      });
      return [...prev, ...added.filter(Boolean)];
    });
    setPickerOpen(false);
  }

  function removeSlot(storageKey: string) {
    // Removing a slot does NOT renumber the remaining ones - a tag the user
    // already typed (e.g. "@Image2") must keep meaning the same attachment
    // until they remove or retype it, otherwise an in-progress message's
    // tags would silently point at something else.
    setSlots((prev) => prev.filter((s) => s.storageKey !== storageKey));
  }

  const mentionOptions = slots.map((s) => ({ tag: `${s.type === "image" ? "Image" : "Audio"}${s.index}` }));

  async function sendTurn(nextMessages: ChatTurn[]) {
    setSending(true);
    setUnresolvedTags(null);
    setReadyState(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "video",
          messages: nextMessages,
          slots: slots.map((s) => ({ type: s.type, index: s.index, storageKey: s.storageKey })),
        }),
      });
      const data = (await res.json()) as ChatApiResponse;

      if (data.type === "question") {
        setMessages([...nextMessages, { role: "assistant", content: data.message }]);
      } else if (data.type === "unresolved_tags") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `These tags don't match anything attached: ${data.tags.map((t) => `@${t}`).join(", ")}` },
        ]);
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
        setReadyState({
          scene,
          characterRefs: data.characterRefs,
          audioRefs: data.audioRefs,
          estimatedCredits: data.estimatedCredits,
        });
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

    const unresolved = findUnresolvedTags(input, slots);
    if (unresolved.length > 0) {
      setUnresolvedTags(unresolved);
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    void sendTurn(nextMessages);
  }

  async function handleGenerateVideo() {
    if (!readyState) return;
    setDispatching(true);
    try {
      if (dispatchOverride) {
        await dispatchOverride({
          scene: readyState.scene,
          characterRefs: readyState.characterRefs,
          audioRefs: readyState.audioRefs,
        });
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "video",
            input: { scene: readyState.scene, characterRefs: readyState.characterRefs, audioRefs: readyState.audioRefs },
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
      <MediaPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} allowAudio onConfirm={addPicked} />

      {messages.length > 0 && (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end rounded-2xl bg-white/10 px-3 py-2 text-sm" : "self-start rounded-2xl bg-white/5 px-3 py-2 text-sm text-zinc-300"}>
              {m.content}
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
            className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white transition-transform duration-150 ease-out disabled:opacity-50 active:scale-[0.97]"
          >
            {dispatching ? "Starting..." : "Generate"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/12 text-muted-foreground backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/20 hover:text-foreground active:scale-[0.97]"
          title="Add reference media"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {slots.map((s) => (
          <div key={s.storageKey} className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {s.type === "image" && s.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned/blob URL, not a static asset
              <img src={s.previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[9px] text-zinc-400">Audio</span>
            )}
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[8px] text-white">
              {s.type === "image" ? "Image" : "Audio"}
              {s.index}
            </span>
            <button
              type="button"
              onClick={() => removeSlot(s.storageKey)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors duration-150 ease-out hover:bg-neutral-700 active:scale-[0.95]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {unresolvedTags && (
        <p className="text-xs text-red-400">
          These tags don&apos;t match anything attached: {unresolvedTags.map((t) => `@${t}`).join(", ")}. Attach the
          media first or remove the tag.
        </p>
      )}

      <MentionTextarea
        value={input}
        onChange={(v) => {
          setInput(v);
          if (unresolvedTags) setUnresolvedTags(null);
        }}
        options={mentionOptions}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={dispatched ? "Describe another video (@ to reference attached media)" : "Describe your video (@ to reference attached media)"}
        className="w-full resize-none rounded-2xl border border-white/10 bg-card/70 px-4 py-3 text-sm placeholder:text-muted-foreground backdrop-blur-md focus:outline-none"
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/12 px-3 py-1.5 text-sm text-zinc-200 backdrop-blur-md">MiniMax H3</span>
          <div className="relative" ref={settingsPopoverRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm text-zinc-200 backdrop-blur-md transition-colors duration-150 ease-out hover:bg-white/20 active:scale-[0.97]"
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
              <div className="animate-popover-in absolute bottom-full left-0 z-20 mb-2">
                <VideoSettingsPopover settings={videoSettings} onChange={setVideoSettings} compact />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={!input.trim() || sending}
          onClick={handleSend}
          className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white transition-transform duration-150 ease-out disabled:opacity-50 active:scale-[0.97]"
        >
          {sending ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}
