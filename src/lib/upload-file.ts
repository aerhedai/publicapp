/** Client-only: presigns + PUTs a file to R2, returning the storage key.
 * Extracted from video-chat.tsx so image-tool-client.tsx / video-tool-client.tsx
 * can share it for reference-image uploads instead of duplicating it. */
export async function uploadFile(file: File): Promise<string> {
  const presign = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, sizeBytes: file.size }),
  });
  if (!presign.ok) throw new Error("Couldn't get an upload URL");
  const { key, uploadUrl } = await presign.json();

  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Upload to storage failed");

  return key as string;
}

/** Registers an uploaded storage key as a named character reference, reusable
 * across jobs/sessions by label (see character_references table). */
export async function registerCharacterReference(label: string, storageKey: string): Promise<void> {
  const res = await fetch("/api/character-references", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, storageKey }),
  });
  if (!res.ok) throw new Error("Couldn't save that reference");
}
