import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { characterReferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, expensiveActionLimit } from "@/lib/rate-limit";
import { callOpenRouterJson, LLMError, type ChatTurn } from "@/lib/openrouter";
import { validateVideoSceneDraft, resolveReferencesByLabel, type VideoSceneDraft } from "@/lib/scene-validation";
import { CREDIT_COST_BY_TYPE } from "@/lib/credits";

// One narrow OpenRouter call per user turn - never an agentic tool-calling
// loop. The model's only job is proposing; it never decides "inputs are
// satisfied" - that's always the deterministic gate in scene-validation.ts,
// run here immediately after any "draft" response.

type Tool = "video" | "image";

function buildVideoSystemPrompt(existingReferences: { id: string; label: string }[]): string {
  const referencesList =
    existingReferences.length > 0
      ? existingReferences.map((r) => `- "${r.label}" (referenceId: ${r.id})`).join("\n")
      : "(none yet)";

  return `You are a structuring assistant for a single-shot AI video generator. The user describes what they want in plain language across one or more messages. Your only job is to decide, after each message, whether you have enough to propose a complete scene, or whether you need to ask one clarifying question first.

You must reply with exactly one JSON object, one of these two shapes, and nothing else:

1. Not ready yet: {"type": "question", "message": "<one short, specific clarifying question>"}
2. Ready: {"type": "draft", "cameraCustom": "<camera framing/movement description, or empty string if the user didn't specify any>", "characters": [{"label": "<name or short description of a person in the shot>", "referenceId": "<uuid, ONLY if this person clearly matches one of the user's existing references below>"}], "duration": <number of seconds>, "action": "<the scene's action/content, in your own words if needed>", "audioTag": "<a short ambient/background sound description, or empty string>"}

Rules:
- Never invent dialogue or spoken lines - this generator only produces silent scenes. Don't ask the user for dialogue.
- "characters" should only include people the scene actually needs to show performing an identifiable role - not every person mentioned in passing. A pure environment/establishing shot with nobody identifiable can have an empty characters array.
- Only set "referenceId" when the person the user describes clearly matches one of their existing references below by name or description - never guess or fabricate a referenceId.
- If duration isn't specified, default to 4.
- Ask at most one clarifying question at a time, and only when something genuinely necessary (what the scene shows, or who a mentioned person is) is missing - don't ask about camera work, ambience, or duration unless the user brought it up themselves.

The user's existing reference photos (people they can reuse without uploading again):
${referencesList}`;
}

function normalizeDraftShape(value: unknown): VideoSceneDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.cameraCustom !== "string" ||
    !Array.isArray(draft.characters) ||
    typeof draft.duration !== "number" ||
    typeof draft.action !== "string" ||
    typeof draft.audioTag !== "string"
  ) {
    return null;
  }

  const characters: VideoSceneDraft["characters"] = [];
  for (const c of draft.characters) {
    if (!c || typeof c !== "object" || typeof (c as Record<string, unknown>).label !== "string") return null;
    const referenceIdRaw = (c as Record<string, unknown>).referenceId;
    // Models commonly emit an explicit `null` for an absent optional field
    // rather than omitting the key - treat that the same as undefined.
    if (referenceIdRaw !== undefined && referenceIdRaw !== null && typeof referenceIdRaw !== "string") return null;
    characters.push({
      label: (c as Record<string, unknown>).label as string,
      referenceId: typeof referenceIdRaw === "string" ? referenceIdRaw : undefined,
    });
  }

  return {
    cameraCustom: draft.cameraCustom,
    characters,
    duration: draft.duration,
    action: draft.action,
    audioTag: draft.audioTag,
  };
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

  const referenceRows = await db
    .select()
    .from(characterReferences)
    .where(eq(characterReferences.userId, userId));
  const ownedReferences = new Map(referenceRows.map((row) => [row.id, row]));

  let raw: unknown;
  try {
    raw = await callOpenRouterJson(
      buildVideoSystemPrompt(referenceRows.map((r) => ({ id: r.id, label: r.label }))),
      messages
    );
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
    const resolvedDraft = resolveReferencesByLabel(normalizedDraft, referenceRows);
    const result = validateVideoSceneDraft(resolvedDraft, ownedReferences);
    if (!result.ok) {
      if (result.missingCharacters.length > 0) {
        return NextResponse.json({
          type: "missing_references",
          missing: result.missingCharacters.map((m) => ({ label: m.label })),
          generateCostCredits: CREDIT_COST_BY_TYPE.image,
        });
      }
      // Shouldn't normally happen (the LLM is instructed to only draft once
      // ready) - surface it as a question rather than a dead end.
      return NextResponse.json({ type: "question", message: result.otherIssues.join(" ") });
    }
    return NextResponse.json({
      type: "ready",
      scene: result.scene,
      characterRefs: result.characterRefs,
      estimatedCredits: CREDIT_COST_BY_TYPE.video,
    });
  }

  console.error("[api/chat] Unexpected LLM response shape:", JSON.stringify(raw).slice(0, 500));
  return NextResponse.json({ type: "error", message: "Something went wrong understanding that. Try again." });
}
