import type { characterReferences } from "@/db/schema";

// The LLM controller's video schema (src/lib/openrouter.ts) - deliberately
// narrower than the pipeline's full story.json scene shape. No `dialogue`
// field exists here at all (not just "must be empty") - a standalone public
// scene is always silent for v1, per the decision to never infer speech from
// prose; if dialogue support is wanted later it needs its own explicit UI
// field, not inference. No beats/continuity-chaining fields either - those
// only mean something in a curated multi-scene story, not a single ad-hoc
// public job.
export interface VideoSceneDraft {
  cameraCustom: string;
  characters: { label: string; referenceId?: string }[];
  duration: number;
  action: string;
  audioTag: string;
}

export interface MissingCharacter {
  label: string;
  reason: "no_reference_id" | "reference_not_owned";
}

// The exact scene JSON shape graph_builder.py's build_scene_graph consumes
// (pipeline/graph_builder.py) - kept in this one place so nothing downstream
// has to know how a draft becomes a dispatchable scene.
export interface PublicVideoScene {
  id: string;
  camera: "custom";
  camera_custom: string;
  characters: string[];
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
}

export type SceneValidationResult =
  | { ok: true; scene: PublicVideoScene; characterRefs: Record<string, string> }
  | { ok: false; missingCharacters: MissingCharacter[]; otherIssues: string[] };

/**
 * Fills in any `referenceId` the LLM left unset (or set to an empty string)
 * by matching the character's `label` against the user's existing
 * references by exact, case-insensitive label - confirmed live that the
 * model doesn't reliably self-match even when the exact reference is right
 * there in its own context, so this is done deterministically rather than
 * trusted to the model.
 */
export function resolveReferencesByLabel(
  draft: VideoSceneDraft,
  referenceRows: { id: string; label: string }[]
): VideoSceneDraft {
  const byLabel = new Map(referenceRows.map((row) => [row.label.trim().toLowerCase(), row.id]));
  return {
    ...draft,
    characters: draft.characters.map((character) => {
      if (character.referenceId) return character;
      const matchId = byLabel.get(character.label.trim().toLowerCase());
      return matchId ? { ...character, referenceId: matchId } : character;
    }),
  };
}

/**
 * The deterministic gate that runs after every "draft" response from the LLM
 * controller, before any confirm-card/dispatch. The LLM never decides
 * "inputs are satisfied" - it only proposes a draft (optionally matching a
 * mentioned character against `existingReferences` it was given as context);
 * this function is the only place that actually checks ownership.
 */
export function validateVideoSceneDraft(
  draft: VideoSceneDraft,
  ownedReferences: Map<string, typeof characterReferences.$inferSelect>
): SceneValidationResult {
  const otherIssues: string[] = [];
  if (!draft.action?.trim()) {
    otherIssues.push("Scene has no description.");
  }
  if (!draft.duration || draft.duration <= 0) {
    otherIssues.push("Scene duration must be a positive number of seconds.");
  }

  const missingCharacters: MissingCharacter[] = [];
  const characterRefs: Record<string, string> = {};
  for (const character of draft.characters) {
    if (!character.referenceId) {
      missingCharacters.push({ label: character.label, reason: "no_reference_id" });
      continue;
    }
    const row = ownedReferences.get(character.referenceId);
    if (!row) {
      missingCharacters.push({ label: character.label, reason: "reference_not_owned" });
      continue;
    }
    characterRefs[character.label] = row.storageKey;
  }

  if (missingCharacters.length > 0 || otherIssues.length > 0) {
    return { ok: false, missingCharacters, otherIssues };
  }

  return {
    ok: true,
    scene: {
      id: "001",
      camera: "custom",
      camera_custom: draft.cameraCustom ?? "",
      characters: draft.characters.map((character) => character.label),
      continue_from_previous: false,
      continuity: "",
      duration: draft.duration,
      action: draft.action,
      dialogue: [],
      audio_tag: draft.audioTag ?? "",
      // Overwritten client-side from the video settings popover right
      // before dispatch (see video-chat.tsx) - this default only matters
      // if that step is ever skipped.
      aspect_ratio: "Auto",
    },
    characterRefs,
  };
}
