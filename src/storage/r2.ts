import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

let cachedClient: S3Client | null = null;

// Lazy singleton, same reasoning as src/db/client.ts: never throw or touch
// env vars at module-import time, only when a request actually needs R2.
function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`${key} is not set - copy .env.example to .env.local and fill it in`);
    }
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cachedClient;
}

function getBucket(): string {
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME is not set - copy .env.example to .env.local and fill it in");
  }
  return process.env.R2_BUCKET_NAME;
}

// The RunPod worker endpoints are shared across Preview and Production (one
// image worker, one video worker - not a per-environment pair), but their R2
// *upload* credentials are fixed at the endpoint level. Passed through in the
// job's dispatch payload (see src/lib/runpod.ts's buildWorkflowPayload) so a
// worker writes its output to whichever bucket actually matches the app
// environment that dispatched it, instead of always writing to whatever
// bucket happens to be baked into the endpoint's own config - confirmed live
// as a real bug (Preview jobs succeeded, but generated output 404'd when
// Preview tried to read it back, because the worker had written it to
// Production's bucket instead).
export function getR2CredentialsForWorker(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
} {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`${key} is not set - copy .env.example to .env.local and fill it in`);
    }
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
  };
}

// Only these are accepted for user uploads. Reject everything else server-side -
// never trust a client-supplied Content-Type without validating it against a list.
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

export class InvalidUploadError extends Error {}

/**
 * Every object key is namespaced under the owning user's id, generated
 * server-side (never accepted from the client) - this is what prevents one
 * user from overwriting or guessing another user's storage key.
 */
function buildUserKey(userId: string, filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase().slice(0, 10) ?? "bin";
  return `users/${userId}/uploads/${randomUUID()}.${ext}`;
}

export async function createPresignedUpload({
  userId,
  filename,
  contentType,
  sizeBytes,
}: {
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  if (!ALLOWED_UPLOAD_TYPES.has(contentType)) {
    throw new InvalidUploadError(`Content type ${contentType} is not allowed`);
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    throw new InvalidUploadError(`File size ${sizeBytes} exceeds the ${MAX_UPLOAD_BYTES} byte limit`);
  }

  const key = buildUserKey(userId, filename);
  const input: PutObjectCommandInput = {
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  };
  const uploadUrl = await getSignedUrl(getClient(), new PutObjectCommand(input), {
    expiresIn: 300, // 5 minutes - short-lived, single-purpose URL
  });

  return { key, uploadUrl };
}

export async function createPresignedDownload(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}

/**
 * Server-side direct download (no presigned URL round trip) - streams
 * straight to a local file. Used by the stitch job (src/lib/stitch.ts),
 * which runs in the same process and needs the actual bytes on disk for
 * ffmpeg, not a URL for a browser/worker to fetch later.
 */
export async function downloadObjectToFile(key: string, destPath: string): Promise<void> {
  const { pipeline } = await import("stream/promises");
  const fs = await import("fs");

  const res = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
  if (!res.Body) {
    throw new Error(`R2 object ${key} has no body`);
  }
  await pipeline(res.Body as unknown as NodeJS.ReadableStream, fs.createWriteStream(destPath));
}

/**
 * Server-side direct upload (no presigned URL round trip) - the counterpart
 * to downloadObjectToFile, for writing a locally-produced file (the stitch
 * job's concatenated output) straight to R2.
 */
export async function uploadFileToR2(key: string, filePath: string, contentType: string): Promise<void> {
  const fs = await import("fs");
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
    })
  );
}

/** Throws if `key` doesn't belong to `userId` - call this before returning
 * any presigned download URL or deleting anything. */
export function assertOwnsKey(userId: string, key: string) {
  if (!key.startsWith(`users/${userId}/`)) {
    throw new Error("Key does not belong to this user");
  }
}

/**
 * Deletes a batch of R2 objects (max 1000 per call, per the S3 API - chunk
 * if you ever need more). Every key is re-checked against `userId` here,
 * not just at the call site, so a bug elsewhere can't turn into deleting
 * someone else's files.
 *
 * Called from the Clerk `user.deleted` webhook before the DB cascade
 * removes the `uploads`/`generation_jobs` rows that reference these keys -
 * once those rows are gone there'd be no record of what to delete, and the
 * files would be orphaned in the bucket indefinitely.
 */
export async function deleteUserObjects(userId: string, keys: string[]) {
  const owned = keys.filter((key) => key.startsWith(`users/${userId}/`));
  if (owned.length === 0) return;

  const CHUNK_SIZE = 1000;
  for (let i = 0; i < owned.length; i += CHUNK_SIZE) {
    const chunk = owned.slice(i, i + CHUNK_SIZE);
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
}
