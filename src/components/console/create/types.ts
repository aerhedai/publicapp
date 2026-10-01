export type Mode = "image" | "video";

// "480p"/"768p" - same naming and megapixel tiers as the video worker's own
// resolution options (below), not the previous "1K"/"2K" (1MP/4MP) - 4MP
// ("2K") was dropped entirely: real measured cost (src/lib/credits.ts) was
// ~4x the 1MP tier for a quality bump that wasn't worth exposing. "768p"
// here (1.0MP) is numerically identical to the old "1K" default - only the
// label and the now-real, non-flat credit cost changed. See
// src/lib/pixel-presets.ts for the actual width/height mapping.
//
// steps/cfg/seed/sampler mirror the worker's own per-job overrides
// (graph_builder.py's build_image_graph) one to one - null/undefined means
// "use the worker's own default" for each, matching the worker side exactly
// rather than this app inventing its own separate default values that could
// drift from the worker's.
export interface ImageSettings {
  aspectRatio: string;
  outputs: number;
  resolution: "480p" | "768p";
  steps: number;
  cfg: number;
  seed: number | null; // null = random every job
  sampler: ImageSampler;
}

// Matches comfyui-flux2-klein-worker/graph_builder.py's ALLOWED_SAMPLERS
// exactly - a deliberately curated subset of ComfyUI's full 40+-option
// sampler list, proven reasonable for this distilled Flux-family model, not
// every value KSamplerSelect itself would accept.
export const IMAGE_SAMPLERS = ["euler", "euler_ancestral", "heun", "dpmpp_2m"] as const;
export type ImageSampler = (typeof IMAGE_SAMPLERS)[number];

// "480p"/"768p" map to ResolutionSelector's `megapixels` param in the MiniMax
// H3 worker's graph (comfyui-minimax-h3-worker/workflows/video_minimax_h3_r2v.json,
// node 115) - 0.4MP and 1.0MP respectively, chosen to match real 16:9 pixel
// counts for those resolution tiers (854x480 ~= 0.41MP, 1366x768 ~= 1.05MP;
// 1.0MP also happens to be that node's own shipped default). See
// src/lib/pixel-presets.ts for the actual mapping used at dispatch time.
//
// durationSeconds is a continuous 1-10s slider - every whole-second value
// has a real formula-computed price (src/lib/pricing-math.ts's
// videoCreditCost), not a fixed lookup table, so there's no need to
// restrict it to specific tested values the way resolution is restricted.
export interface VideoSettings {
  aspectRatio: string;
  durationSeconds: number;
  resolution: "480p" | "768p";
  audio: boolean;
}

export const IMAGE_ASPECT_RATIOS: { label: string; ratio: number | null }[] = [
  { label: "Auto", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "21:9", ratio: 21 / 9 },
];

export const VIDEO_ASPECT_RATIOS: { label: string; ratio: number | null }[] = [
  { label: "Auto", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "4:3", ratio: 4 / 3 },
];

// Mirrors graph_builder.py's DEFAULT_STEPS/DEFAULT_CFG/DEFAULT_SAMPLER
// exactly (steps=4, cfg=1.0, sampler="euler") - the distilled template's own
// proven values, not arbitrary UI defaults.
export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  aspectRatio: "Auto",
  outputs: 1,
  resolution: "480p",
  steps: 4,
  cfg: 1.0,
  seed: null,
  sampler: "euler",
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  aspectRatio: "Auto",
  durationSeconds: 4,
  resolution: "480p",
  audio: true,
};
