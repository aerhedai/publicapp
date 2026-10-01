import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { callOpenRouterJson, LLMError, type ChatTurn } from "@/lib/openrouter";
import {
  validateVideoSceneDraft,
  resolveReferenceTags,
  type VideoSceneDraft,
  type ReferenceTagSlot,
} from "@/lib/scene-validation";
import { assertOwnsKey } from "@/storage/r2";
import { CREDIT_COST_BY_TYPE } from "@/lib/credits";

// One narrow OpenRouter call per user turn - never an agentic tool-calling
// loop. The model's only job is proposing; it never decides "inputs are
// satisfied" - that's always the deterministic gate in scene-validation.ts,
// run here immediately after any "draft" response.

type Tool = "video" | "image";

// No "existing references"/matching context at all anymore - which
// references a scene uses is decided entirely by @Image1/@Audio1 tags in
// the user's own messages (resolved by resolveReferenceTags below, before
// this is ever called), not by the LLM. This shrinks the LLM's job to what
// it's actually reliable at: drafting the scene's prose/camera/duration.
const VIDEO_SYSTEM_PROMPT = `You are a structuring assistant for a single-shot AI video generator. The user describes what they want in plain language across one or more messages, optionally tagging attached reference images/audio with @Image1, @Audio1, etc. - you never need to resolve or think about those tags, they're handled separately. Your only job is to decide, after each message, whether you have enough to propose a complete scene, or whether you need to ask one clarifying question first.

You must reply with exactly one JSON object, one of these two shapes, and nothing else:

1. Not ready yet: {"type": "question", "message": "<one short, specific clarifying question>"}
2. Ready: {"type": "draft", "cameraCustom": "<camera framing/movement description, or empty string if the user didn't specify any>", "duration": <number of seconds>, "action": "<the scene's action/content, in your own words if needed - keep any @Image1/@Audio1 tags in place exactly as written>", "audioTag": "<a short ambient/background sound description, or empty string>"}

Rules:
- Never invent dialogue or spoken lines - this generator only produces silent scenes. Don't ask the user for dialogue.
- If duration isn't specified, default to 4.
- Ask at most one clarifying question at a time, and only when something genuinely necessary (what the scene shows) is missing - don't ask about camera work, ambience, duration, or who a tagged reference is (that's already resolved) unless the user brought it up themselves.`;

function normalizeDraftShape(value: unknown): VideoSceneDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.cameraCustom !== "string" ||
    typeof draft.duration !== "number" ||
    typeof draft.action !== "string" ||
    typeof draft.audioTag !== "string"
  ) {
    return null;
  }

  return {
    cameraCustom: draft.cameraCustom,
    duration: draft.duration,
    action: draft.action,
    audioTag: draft.audioTag,
  };
}

function parseSlots(value: unknown): ReferenceTagSlot[] | null {
  if (!Array.isArray(value)) return null;
  const slots: ReferenceTagSlot[] = [];
  for (const s of value) {
    if (
      !s ||
      typeof s !== "object" ||
      (s.type !== "image" && s.type !== "audio") ||
      typeof s.index !== "number" ||
      typeof s.storageKey !== "string"
    ) {
      return null;
    }
    slots.push({ type: s.type, index: s.index, storageKey: s.storageKey });
  }
  return slots;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(expensiveActionLimit, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || (body.tool !== "video" && body.tool !== "image") || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const tool = body.tool as Tool;
  const messages = body.messages as ChatTurn[];

  if (tool === "image") {
    // Image's chat schema lands alongside its RunPod endpoint - see
    // src/lib/runpod.ts's ImageJobInput for the target shape.
    return NextResponse.json({ error: "Image chat isn't wired up yet" }, { status: 501 });
  }

  const slots = parseSlots(body.slots ?? []);
  if (!slots) {
    return NextResponse.json({ error: "Invalid slots" }, { status: 400 });
  }

  // Tags can appear in any earlier turn, not just the latest message (e.g.
  // "here's @Image1, this is Sarah" in turn 1, "she waves" in turn 2) - the
  // scene being drafted spans the whole conversation, so tag resolution
  // scans all of it, not just the last message.
  const allUserText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
  const tagResult = resolveReferenceTags(allUserText, slots);
  if (!tagResult.ok) {
    return NextResponse.json({
      type: "unresolved_tags",
      tags: tagResult.unresolved.map((u) => u.tag),
    });
  }

  // Defensive re-check - slots come from the client, storageKey isn't secret
  // but must still belong to this user before it's ever dispatched to a
  // worker (never trust a client-supplied key, same rule as every other
  // storageKey in this app).
  try {
    for (const key of [...Object.values(tagResult.characterRefs), ...Object.values(tagResult.audioRefs)]) {
      assertOwnsKey(userId, key);
    }
  } catch {
    return NextResponse.json({ error: "One or more referenced files don't belong to this user" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await callOpenRouterJson(VIDEO_SYSTEM_PROMPT, messages);
  } catch (err) {
    const message = err instanceof LLMError ? err.message : String(err);
    console.error("[api/chat] OpenRouter call failed:", message);
    return NextResponse.json({ type: "error", message: "Something went wrong talking to the assistant. Try again." });
  }

  const response = raw as Record<string, unknown>;
  // Shape-based, not a strict `type` discriminator match - confirmed live
  // that the model sometimes omits "type" entirely despite the system
  // prompt requiring it, same lesson the pipeline's own core/llm.py already
  // learned (models don't reliably honor a strict format instruction).
  const normalizedDraft = normalizeDraftShape(response);
  if (!normalizedDraft && response?.type === "question" && typeof response.message === "string") {
    return NextResponse.json({ type: "question", message: response.message });
  }

  if (normalizedDraft) {
    const result = validateVideoSceneDraft(normalizedDraft, tagResult.characterRefs, tagResult.audioRefs);
    if (!result.ok) {
      // Shouldn't normally happen (the LLM is instructed to only draft once
      // ready) - surface it as a question rather than a dead end.
      return NextResponse.json({ type: "question", message: result.otherIssues.join(" ") });
    }
    return NextResponse.json({
      type: "ready",
      scene: result.scene,
      characterRefs: tagResult.characterRefs,
      audioRefs: tagResult.audioRefs,
      estimatedCredits: CREDIT_COST_BY_TYPE.video,
    });
  }

  console.error("[api/chat] Unexpected LLM response shape:", JSON.stringify(raw).slice(0, 500));
  return NextResponse.json({ type: "error", message: "Something went wrong understanding that. Try again." });
}
