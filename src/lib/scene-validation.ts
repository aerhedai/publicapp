// The LLM controller's video schema (src/lib/openrouter.ts) - deliberately
// narrower than the pipeline's full story.json scene shape. No `dialogue`
// field exists here at all (not just "must be empty") - a standalone public
// scene is always silent for v1, per the decision to never infer speech from
// prose; if dialogue support is wanted later it needs its own explicit UI
// field, not inference. No beats/continuity-chaining fields either - those
// only mean something in a curated multi-scene story, not a single ad-hoc
// public job. No "characters" field either - which references are used is
// decided entirely by @Image1/@Audio1 tags in the user's own message
// (resolveReferenceTags below), never by the LLM.
export interface VideoSceneDraft {
  cameraCustom: string;
  duration: number;
  action: string;
  audioTag: string;
}

// One reference attached to the current compose session (the picker modal's
// selection), numbered by attachment order within that session - this
// ordering is what "@Image1"/"@Audio1" refer to. Not persisted as-is; each
// slot's storageKey may itself come from a persistent character_references
// row (Uploads tab / Creations tab) or a brand new upload.
export interface ReferenceTagSlot {
  type: "image" | "audio";
  index: number; // 1-based, matches the tag's numeric suffix
  storageKey: string;
}

export interface UnresolvedTag {
  tag: string; // e.g. "Image3"
}

// The exact scene JSON shape graph_builder.py's build_scene_graph consumes
// (pipeline/graph_builder.py) - kept in this one place so nothing downstream
// has to know how a draft becomes a dispatchable scene.
export interface PublicVideoScene {
  id: string;
  camera: "custom";
  camera_custom: string;
  characters: string[];
  audio_refs: string[];
  continue_from_previous: false;
  continuity: string;
  duration: number;
  action: string;
  dialogue: [];
  audio_tag: string;
  // Consumed by graph_builder.py's build_scene_graph as a per-job override
  // of config.ASPECT_RATIO (falls back to that default there if unset) -
  // set here from the chat UI's video settings popover, never inferred by
  // the LLM. "Auto" means "let the worker use its own default."
  aspect_ratio: string;
  // Consumed by graph_builder.py as ResolutionSelector's `megapixels` param
  // (node 115 in the base workflow) - "480p"/"768p" map to 0.4/1.0 megapixels
  // there, chosen to match real 16:9 pixel counts for those tiers. Set here
  // from the video settings popover, same as aspect_ratio/duration - the LLM
  // never decides this either.
  resolution: string;
}

export type TagResolutionResult =
  | { ok: true; characterRefs: Record<string, string>; audioRefs: Record<string, string> }
  | { ok: false; unresolved: UnresolvedTag[] };

const TAG_PATTERN = /@(Image|Audio)(\d+)\b/g;

/**
 * Parses every @Image1/@Audio1-style tag out of the raw message text (in
 * order of first appearance) and resolves each against the current compose
 * session's attached slots. This fully replaces the old LLM/label-based
 * character matching: which references a job uses is now decided
 * deterministically by which tags the user actually typed, not by the LLM
 * inferring intent from prose. A tag with no matching attached slot (e.g.
 * "@Image3" when only 2 images are attached) is reported as unresolved -
 * callers should surface this before ever calling the LLM, not after.
 */
export function resolveReferenceTags(text: string, slots: ReferenceTagSlot[]): TagResolutionResult {
  const bySlot = new Map(slots.map((s) => [`${s.type}:${s.index}`, s.storageKey]));
  const characterRefs: Record<string, string> = {};
  const audioRefs: Record<string, string> = {};
  const unresolved: UnresolvedTag[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(TAG_PATTERN)) {
    const kind = match[1].toLowerCase() as "image" | "audio";
    const index = Number(match[2]);
    const tag = `${match[1]}${match[2]}`;
    if (seen.has(tag)) continue;
    seen.add(tag);

    const storageKey = bySlot.get(`${kind}:${index}`);
    if (!storageKey) {
      unresolved.push({ tag });
      continue;
    }
    if (kind === "image") characterRefs[tag] = storageKey;
    else audioRefs[tag] = storageKey;
  }

  if (unresolved.length > 0) {
    return { ok: false, unresolved };
  }
  return { ok: true, characterRefs, audioRefs };
}

/**
 * The deterministic gate that runs after every "draft" response from the LLM
 * controller, before any confirm-card/dispatch. The LLM only ever drafts
 * cameraCustom/duration/action/audioTag now - characterRefs/audioRefs come
 * entirely from resolveReferenceTags, called separately (see
 * src/app/api/chat/route.ts) before this runs. `characterRefs`/`audioRefs`
 * keys (e.g. "Image1", "Audio1") become both the scene's characters/
 * audio_refs entries and the worker's <Picture i>/<Audio i> prompt labels.
 */
export function validateVideoSceneDraft(
  draft: VideoSceneDraft,
  characterRefs: Record<string, string>,
  audioRefs: Record<string, string>
): { ok: true; scene: PublicVideoScene } | { ok: false; otherIssues: string[] } {
  const otherIssues: string[] = [];
  if (!draft.action?.trim()) {
    otherIssues.push("Scene has no description.");
  }
  if (!draft.duration || draft.duration <= 0) {
    otherIssues.push("Scene duration must be a positive number of seconds.");
  }

  if (otherIssues.length > 0) {
    return { ok: false, otherIssues };
  }

  return {
    ok: true,
    scene: {
      id: "001",
      camera: "custom",
      camera_custom: draft.cameraCustom ?? "",
      characters: Object.keys(characterRefs),
      audio_refs: Object.keys(audioRefs),
      continue_from_previous: false,
      continuity: "",
      duration: draft.duration,
      action: draft.action,
      dialogue: [],
      audio_tag: draft.audioTag ?? "",
      // Overwritten client-side from the video settings popover right
      // before dispatch (see video-chat.tsx) - these defaults only matter
      // if that step is ever skipped.
      aspect_ratio: "Auto",
      resolution: "480p",
    },
  };
}
