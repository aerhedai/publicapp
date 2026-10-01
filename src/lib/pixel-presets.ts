import { IMAGE_ASPECT_RATIOS, type ImageSettings } from "@/components/console/create/types";

// "480p" (0.4MP) / "768p" (1.0MP) - same tier names/values as the video
// worker's own resolution options, see types.ts's own comment on why. 1.0MP
// is Comfy-Org's own official default for FLUX.2 Klein 4B (1024x1024) - the
// old "2K"/4MP max was dropped (see types.ts).
const IMAGE_RESOLUTION_MEGAPIXELS: Record<ImageSettings["resolution"], number> = {
  "480p": 0.4,
  "768p": 1.0,
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
