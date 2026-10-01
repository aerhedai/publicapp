// Output-side moderation - the gap content-policy.ts's own comment calls out
// explicitly ("a real output-side check is future work"): the prompt-side
// denylist only catches what the *prompt* says, never what the model
// actually *renders*. This checks the rendered image itself, right before a
// job is allowed to reach "done" (see apply-job-result.ts).
//
// Uses nvidia/nemotron-3.5-content-safety (free on OpenRouter) - a
// purpose-built multimodal guardrail model, not a general chat model
// repurposed for this. Confirmed live (2026-10-01) that it ignores a custom
// "reply with JSON" instruction and always answers in its own trained
// format instead: a first line of exactly "User Safety: safe" or
// "User Safety: unsafe", optionally followed by a "Safety Categories: ..."
// line - so this parses THAT format rather than asking for JSON.
//
// Video/stitch jobs are NOT covered - there's no cheap single frame to hand
// a vision model without new frame-extraction infra. Flagged here, not
// silently skipped: scoped to images only for now.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODERATION_MODEL = "nvidia/nemotron-3.5-content-safety:free";
const TIMEOUT_MS = 15_000;

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Fails OPEN (allowed: true) on any infra problem - a missing API key,
 * network failure, timeout, or a response shape this doesn't recognize -
 * logged loudly rather than silently. This is a defense-in-depth layer on
 * top of the existing prompt-side denylist (content-policy.ts), not the
 * only gate, so an OpenRouter outage blocking every image for every paying
 * user would be the worse failure mode. Only an explicit "unsafe"
 * classification blocks.
 */
export async function checkImageOutputSafety(imageUrl: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[output-moderation] OPENROUTER_API_KEY not set - skipping output moderation check");
    return { allowed: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "publicapp",
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[output-moderation] OpenRouter request failed (${res.status}): ${body}`);
      return { allowed: true };
    }

    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error(`[output-moderation] Unexpected response shape: ${JSON.stringify(data).slice(0, 500)}`);
      return { allowed: true };
    }

    const match = content.match(/User Safety:\s*(safe|unsafe)/i);
    if (!match) {
      console.error(`[output-moderation] Unrecognized classifier output: ${content.slice(0, 500)}`);
      return { allowed: true };
    }

    if (match[1].toLowerCase() === "safe") {
      return { allowed: true };
    }

    const categoriesMatch = content.match(/Safety Categories:\s*(.+)/i);
    return {
      allowed: false,
      reason: categoriesMatch ? `Blocked by output safety check: ${categoriesMatch[1].trim()}` : "Blocked by output safety check",
    };
  } catch (err) {
    console.error(`[output-moderation] Request threw: ${(err as Error).message}`);
    return { allowed: true };
  } finally {
    clearTimeout(timeout);
  }
}
