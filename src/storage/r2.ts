import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
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

/** Throws if `key` doesn't belong to `userId` - call this before returning
 * any presigned download URL or deleting anything. */
export function assertOwnsKey(userId: string, key: string) {
  if (!key.startsWith(`users/${userId}/`)) {
    throw new Error("Key does not belong to this user");
  }
}
