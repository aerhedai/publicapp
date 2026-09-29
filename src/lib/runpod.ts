import crypto from "crypto";
import { assertOwnsKey, createPresignedDownload } from "@/storage/r2";

// Lazy-init discipline, same reasoning as src/db/client.ts/src/storage/r2.ts -
// env vars read inside each function, never at module-import time (this broke
// Next.js's build-time page-data collection once already this session).
function getApiKey(): string {
  if (!process.env.RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not set");
  }
  return process.env.RUNPOD_API_KEY;
}

export type JobType = "image" | "video";

// Two separate RunPod endpoints, not one shared image/pod: video (MiniMax H3)
// needs a much bigger GPU tier and a ~39GB volume; image (Flux2) is lighter
// and shouldn't drag either into every cold start. Each type gets its own
// endpoint id, independently sized/scaled.
function getEndpointId(type: JobType): string {
  const envVar = type === "video" ? "RUNPOD_ENDPOINT_ID_VIDEO" : "RUNPOD_ENDPOINT_ID_IMAGE";
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`${envVar} is not set`);
  }
  return value;
}

function getWebhookSecret(): string {
  if (!process.env.RUNPOD_WEBHOOK_SECRET) {
    throw new Error("RUNPOD_WEBHOOK_SECRET is not set");
  }
  return process.env.RUNPOD_WEBHOOK_SECRET;
}

// No existing stable-domain env var in this app yet - APP_BASE_URL is a new
// one (see .env.example). Falls back to Vercel's own auto-provided
// deployment URL, which is fine here since it's read fresh at dispatch time,
// never stored across deploys.
function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error("APP_BASE_URL is not set and VERCEL_URL is unavailable");
}

function getBaseUrl(type: JobType): string {
  return `https://api.runpod.ai/v2/${getEndpointId(type)}`;
}

/** Distinguishes transient failures (network/5xx - safe to leave the job
 * `queued` for the next cron tick) from permanent ones (bad payload,
 * endpoint rejection - fail immediately, no wasted retries). */
export class RunpodDispatchError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "RunpodDispatchError";
    this.retryable = retryable;
  }
}

// Matches handler.py's job contract exactly (pipeline/webapp/cloud/handler.py):
// {userId, scene, characterRefs: {char_id: presigned_get_url}}. `input`'s
// characterRefs here holds R2 *storage keys* (server-owned, checked via
// assertOwnsKey), not URLs - buildWorkflowPayload presigns them into GET URLs
// right before dispatch, never earlier.
export interface VideoJobInput {
  scene: unknown;
  characterRefs?: Record<string, string>;
}

// Matches handler_image.py's job contract (pipeline/webapp/cloud/handler_image.py),
// mirroring flux_graph_builder.py's three graph functions directly: "environment"
// needs neither characterRefs nor styleRef, "storyboard" needs characterRefs (1+
// character stills), "character" needs both characterRefs (exactly one entry,
// the character image) and styleRef. Same storage-key-not-URL convention as video.
export interface ImageJobInput {
  mode: "environment" | "storyboard" | "character";
  prompt: string;
  characterRefs?: Record<string, string>;
  styleRef?: string;
  width?: number;
  height?: number;
}

export type JobInput = VideoJobInput | ImageJobInput;

async function presignCharacterRefs(
  userId: string,
  characterRefs: Record<string, string> | undefined
): Promise<Record<string, string>> {
  const presigned: Record<string, string> = {};
  for (const [charId, key] of Object.entries(characterRefs ?? {})) {
    assertOwnsKey(userId, key);
    // Longer than the uploads route's default (600s, not 300s) - has to
    // survive cold-start + fetch time inside the worker, not just an
    // instant client PUT.
    presigned[charId] = await createPresignedDownload(key, 600);
  }
  return presigned;
}

export async function buildWorkflowPayload(params: {
  userId: string;
  type: JobType;
  input: JobInput;
}): Promise<{ input: Record<string, unknown> }> {
  const { userId, type, input } = params;

  if (type === "video") {
    const videoInput = input as VideoJobInput;
    const characterRefs = await presignCharacterRefs(userId, videoInput.characterRefs);
    return { input: { userId, scene: videoInput.scene, characterRefs } };
  }

  const imageInput = input as ImageJobInput;
  const characterRefs = await presignCharacterRefs(userId, imageInput.characterRefs);
  let styleRef: string | undefined;
  if (imageInput.styleRef) {
    assertOwnsKey(userId, imageInput.styleRef);
    styleRef = await createPresignedDownload(imageInput.styleRef, 600);
  }
  return {
    input: {
      userId,
      mode: imageInput.mode,
      prompt: imageInput.prompt,
      characterRefs,
      styleRef,
      width: imageInput.width,
      height: imageInput.height,
    },
  };
}

function buildWebhookUrl(jobId: string): string {
  const url = new URL("/api/webhooks/runpod", getAppBaseUrl());
  url.searchParams.set("jobId", jobId);
  url.searchParams.set("secret", getWebhookSecret());
  // Preview (and Production, if Deployment Protection is ever turned on
  // there) rejects any request without a valid session/bypass before it
  // ever reaches our route - RunPod's outbound webhook call has no way to
  // supply that, so without this it would 401 silently and every job would
  // fall through to the stale-job sweep instead of resolving promptly.
  // VERCEL_AUTOMATION_BYPASS_SECRET is auto-injected by Vercel itself once
  // a project has an automation bypass secret configured - not something
  // this app needs to generate or store.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    url.searchParams.set("x-vercel-protection-bypass", process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
    url.searchParams.set("x-vercel-set-bypass-cookie", "false");
  }
  return url.toString();
}

export async function dispatchJob(params: {
  jobId: string;
  userId: string;
  type: JobType;
  input: JobInput;
}): Promise<{ runpodJobId: string }> {
  const payload = await buildWorkflowPayload(params);

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl(params.type)}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, webhook: buildWebhookUrl(params.jobId) }),
    });
  } catch (err) {
    throw new RunpodDispatchError(
      `Network error dispatching to RunPod: ${(err as Error).message}`,
      true
    );
  }

  if (res.status >= 500) {
    throw new RunpodDispatchError(`RunPod returned ${res.status}`, true);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RunpodDispatchError(`RunPod rejected dispatch: ${res.status} ${body}`, false);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new RunpodDispatchError(`RunPod response missing job id: ${JSON.stringify(data)}`, false);
  }
  return { runpodJobId: data.id };
}

// Matches both the /status/{id} response and the webhook POST body (RunPod
// sends the same shape to both - confirmed live this session).
export interface RunpodJobStatus {
  id: string;
  status: string;
  executionTime?: number;
  delayTime?: number;
  output?: { outputStorageKey?: string; error?: string; comfyExecMs?: number; seed?: number };
}

// Only used by the stale-job sweep, never the happy path (that's the
// webhook's job).
export async function getJobStatus(type: JobType, runpodJobId: string): Promise<RunpodJobStatus> {
  const res = await fetch(`${getBaseUrl(type)}/status/${runpodJobId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (res.status === 404) {
    // RunPod purges job status after a retention window (confirmed live -
    // a job that genuinely COMPLETED hours earlier this session later
    // 404'd here) - the sweep needs to distinguish "gone, unrecoverable"
    // from a real error, not throw and leave the job stuck forever.
    return { id: runpodJobId, status: "NOT_FOUND" };
  }
  if (!res.ok) {
    throw new RunpodDispatchError(`Failed to get RunPod job status: ${res.status}`, res.status >= 500);
  }
  return res.json();
}

export async function cancelJob(type: JobType, runpodJobId: string): Promise<void> {
  const res = await fetch(`${getBaseUrl(type)}/cancel/${runpodJobId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  // A job that's already finished (or never existed) 404s here - not a
  // failure worth surfacing, the sweep is calling this defensively.
  if (!res.ok && res.status !== 404) {
    throw new RunpodDispatchError(`Failed to cancel RunPod job: ${res.status}`, res.status >= 500);
  }
}

/** Constant-time comparison, not `===` - closes the same class of bug the
 * Clerk webhook had this session (trusting a payload before verifying it). */
export function verifyRunpodWebhookSecret(providedSecret: string | null): boolean {
  if (!providedSecret) return false;
  const expected = getWebhookSecret();
  const a = Buffer.from(providedSecret);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
