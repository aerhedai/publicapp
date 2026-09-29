// A single narrow entry point to the LLM used by the chat controller
// (src/app/api/chat/route.ts) - one call per user turn, never a multi-turn
// tool-calling loop. Mirrors the local pipeline's own
// pipeline/core/llm.py:call_openrouter exactly: plain fetch over OpenRouter
// (no SDK dependency, matching every other outbound HTTP call in this app),
// and the same "find the first balanced {...} object in the response"
// extraction instead of trusting a strict JSON-only instruction - models
// don't reliably honor that even when told to.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class LLMError extends Error {}

function getApiKey(): string {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new LLMError("OPENROUTER_API_KEY is not set");
  }
  return process.env.OPENROUTER_API_KEY;
}

function getModel(): string {
  // Same default as the local pipeline (pipeline/config.py) - a model
  // already proven at this exact job (structured single-JSON-object
  // extraction), not picked fresh for this app. `||`, not `??` - an unset
  // env var and one set to an empty string both mean "use the default";
  // OpenRouter 400s on an empty model string instead of treating it as absent.
  return process.env.OPENROUTER_MODEL || "upstage/solar-pro4";
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) {
    throw new LLMError(`LLM response contained no JSON object: ${text.slice(0, 500)}`);
  }
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch (err) {
          throw new LLMError(`LLM response's JSON object failed to parse: ${err}`);
        }
      }
    }
  }
  throw new LLMError(`LLM response had an unterminated JSON object: ${text.slice(0, 500)}`);
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Returns the parsed JSON object the model produced. Raises LLMError on any
 * failure (missing API key, HTTP failure, malformed response shape,
 * unparseable content) - callers decide how to surface that to the user. */
export async function callOpenRouterJson(systemPrompt: string, messages: ChatTurn[]): Promise<unknown> {
  const apiKey = getApiKey();

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "publicapp",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
  } catch (err) {
    throw new LLMError(`OpenRouter request failed: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LLMError(`OpenRouter request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new LLMError(`Unexpected OpenRouter response shape: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return extractJson(content);
}
