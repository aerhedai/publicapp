// A minimum content-safety floor before a job is even created - not a
// ceiling. This pipeline has a real past incident (a scene once rendered as
// unintended nudity from prompt text that didn't explicitly request it), so
// a public multi-user product needs at least a same-process prompt check,
// even though this only catches what the *prompt* says, not what the model
// *renders*. A real output-side check is future work.
const DENYLIST = [
  "nude",
  "naked",
  "nudity",
  "undress",
  "undressing",
  "topless",
  "explicit",
  "nsfw",
  "porn",
  "pornographic",
  "sexual",
  "sex act",
];

export interface ContentPolicyResult {
  allowed: boolean;
  reason?: string;
}

// `input` is a generic jsonb blob with no fixed shape (see db/schema.ts) -
// rather than guessing field names like "prompt"/"negativePrompt", collect
// every string value anywhere in the object and check all of them.
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
  return out;
}

export function checkContentPolicy(input: unknown): ContentPolicyResult {
  const combined = collectStrings(input).join(" ").toLowerCase();
  for (const term of DENYLIST) {
    if (combined.includes(term)) {
      return { allowed: false, reason: `Prompt contains a disallowed term: "${term}"` };
    }
  }
  return { allowed: true };
}
