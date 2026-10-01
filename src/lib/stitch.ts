import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";
import { downloadObjectToFile, uploadFileToR2 } from "@/storage/r2";
import type { RunpodJobStatus } from "@/lib/runpod";
import type { StitchJobInput } from "@/lib/projects";

const execFileAsync = promisify(execFile);

/**
 * Concatenates already-encoded MP4 clips (all from the same MiniMax H3
 * worker, so same codec/container) into one final video. Runs in-process
 * (not on RunPod - this is fast, CPU-only work, and provisioning a second
 * GPU endpoint just for ffmpeg would be unnecessary infrastructure), called
 * from the cron dispatch route's "stitch" branch. Returns a
 * RunpodJobStatus-shaped result so it flows through the exact same
 * applyRunpodResult completion path as a real RunPod job - credits, output,
 * and project-advancement all stay on one code path regardless of where the
 * compute actually ran.
 *
 * KNOWN LIMITATION: uses the concat demuxer's stream-copy mode first (fast,
 * no quality loss), which requires every input to share the same codec
 * parameters - true for clips from this worker's fixed settings, but a
 * project mixing "existing" clips of a different aspect ratio/resolution
 * could fail this and fall back to a re-encode, which still assumes
 * matching resolution. Full heterogeneous-resolution normalization (scale
 * filters per input) isn't implemented.
 */
export async function runStitchJob(params: { userId: string; input: StitchJobInput }): Promise<RunpodJobStatus> {
  const { userId, input } = params;

  if (!ffmpegPath) {
    return { id: "stitch", status: "FAILED", output: { error: "ffmpeg binary not found" } };
  }
  if (!input.orderedKeys || input.orderedKeys.length === 0) {
    return { id: "stitch", status: "FAILED", output: { error: "no clips to stitch" } };
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "stitch-"));
  try {
    const localPaths: string[] = [];
    for (let i = 0; i < input.orderedKeys.length; i++) {
      const dest = path.join(workDir, `clip_${i}.mp4`);
      await downloadObjectToFile(input.orderedKeys[i], dest);
      localPaths.push(dest);
    }

    const listPath = path.join(workDir, "concat_list.txt");
    const listContent = localPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    await writeFile(listPath, listContent, "utf8");

    const outputPath = path.join(workDir, "output.mp4");
    try {
      await execFileAsync(ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
    } catch {
      // Stream copy needs matching codec params across all inputs - fall
      // back to a re-encode, which tolerates minor mismatches (still
      // assumes matching resolution/aspect ratio - see the limitation note
      // above).
      await execFileAsync(ffmpegPath, [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        outputPath,
      ]);
    }

    const key = `users/${userId}/outputs/${randomUUID()}.mp4`;
    await uploadFileToR2(key, outputPath, "video/mp4");

    return { id: "stitch", status: "COMPLETED", output: { outputStorageKey: key } };
  } catch (err) {
    return { id: "stitch", status: "FAILED", output: { error: err instanceof Error ? err.message : String(err) } };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
