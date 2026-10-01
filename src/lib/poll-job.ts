/** Client-only: polls GET /api/jobs/[id] until it reaches a terminal status.
 * Extracted from video-chat.tsx so both tool pages can share it. */
export async function pollJobUntilDone(
  jobId: string,
  timeoutMs = 5 * 60 * 1000
): Promise<"done" | "failed" | "timeout"> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (res.ok) {
      const { job } = await res.json();
      if (job.status === "done") return "done";
      if (job.status === "failed") return "failed";
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  return "timeout";
}
