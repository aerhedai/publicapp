import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generationJobs } from "@/db/schema";
import { verifyRunpodWebhookSecret, type RunpodJobStatus } from "@/lib/runpod";
import { applyRunpodResult } from "@/lib/apply-job-result";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const secret = url.searchParams.get("secret");

  // Verified before any DB touch, before even parsing the body - a forged
  // or missing secret never gets far enough to influence anything.
  if (!jobId || !verifyRunpodWebhookSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as RunpodJobStatus | null;
  if (!body || typeof body.id !== "string" || typeof body.status !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId));
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Re-checks that the row identified by the URL's jobId actually has a
  // matching runpodJobId to the payload body's id - closes the same class
  // of bug the Clerk webhook had this session (trusting a payload before
  // fully verifying it against what we expect).
  if (job.runpodJobId !== body.id) {
    console.error(`[webhooks/runpod] job id mismatch: url jobId=${jobId} expected runpodJobId=${job.runpodJobId} got=${body.id}`);
    return NextResponse.json({ error: "Job id mismatch" }, { status: 400 });
  }

  if (job.settleLedgerId) {
    // Duplicate delivery - already resolved, no-op.
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  }

  await applyRunpodResult(job, body);
  console.log(`[webhooks/runpod] job ${job.id} resolved via webhook, runpod status=${body.status}`);

  return NextResponse.json({ ok: true });
}
