export type Mode = "image" | "video";

// Only the two sizes FLUX.2 Klein 4B is actually run at (see
// comfyui-flux2-klein-worker/graph_builder.py): "1K" is Comfy-Org's own
// official default (1024x1024, 1MP) and "2K" is Klein's stated max (2048x2048,
// 4MP) - not arbitrary presets, these map directly to real width/height sent
// to the worker (src/lib/pixel-presets.ts).
export interface ImageSettings {
  aspectRatio: string;
  outputs: number;
  resolution: "1K" | "2K";
}

// "480p"/"768p" map to ResolutionSelector's `megapixels` param in the MiniMax
// H3 worker's graph (comfyui-minimax-h3-worker/workflows/video_minimax_h3_r2v.json,
// node 115) - 0.4MP and 1.0MP respectively, chosen to match real 16:9 pixel
// counts for those resolution tiers (854x480 ~= 0.41MP, 1366x768 ~= 1.05MP;
// 1.0MP also happens to be that node's own shipped default). See
// src/lib/pixel-presets.ts for the actual mapping used at dispatch time.
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

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  aspectRatio: "Auto",
  outputs: 1,
  resolution: "1K",
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  aspectRatio: "Auto",
  durationSeconds: 4,
  resolution: "480p",
  audio: true,
};
