import { IMAGE_ASPECT_RATIOS, type ImageSettings } from "@/components/console/create/types";

// "1K" == Comfy-Org's own official default for FLUX.2 Klein 4B (1024x1024,
// 1MP); "2K" == Klein's stated max (2048x2048, 4MP). Not arbitrary - see
// comfyui-flux2-klein-worker/graph_builder.py and types.ts's own comment.
const IMAGE_RESOLUTION_MEGAPIXELS: Record<ImageSettings["resolution"], number> = {
  "1K": 1.0,
  "2K": 4.0,
};

// Klein's EmptyFlux2LatentImage/Flux2Scheduler both require width/height as
// multiples of 16 (see comfy_extras/nodes_flux.py) - rounding here, not on
// the worker, so the value the user sees in settings is the value actually
// sent.
function roundToMultipleOf16(value: number): number {
  return Math.max(16, Math.round(value / 16) * 16);
}

/** Computes the literal width/height to send as ImageJobInput.width/height,
 * from the aspect-ratio label + resolution tier the settings popover holds.
 * "Auto" has no ratio to compute against, so it falls back to square (1:1) -
 * same reasoning as the video worker's own ASPECT_RATIO_MAP default. */
export function computeImageDimensions(
  aspectRatioLabel: string,
  resolution: ImageSettings["resolution"]
): { width: number; height: number } {
  const found = IMAGE_ASPECT_RATIOS.find((a) => a.label === aspectRatioLabel);
  const ratio = found?.ratio ?? 1; // width / height
  const megapixels = IMAGE_RESOLUTION_MEGAPIXELS[resolution];
  const targetPixels = megapixels * 1_000_000;

  const height = Math.sqrt(targetPixels / ratio);
  const width = ratio * height;

  return { width: roundToMultipleOf16(width), height: roundToMultipleOf16(height) };
}
