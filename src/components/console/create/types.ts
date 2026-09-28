export type Mode = "image" | "video";

export interface ImageSettings {
  aspectRatio: string;
  outputs: number;
  resolution: "0.5K" | "1K" | "2K" | "4K";
}

export interface VideoSettings {
  aspectRatio: string;
  durationSeconds: number;
  resolution: "480p" | "720p";
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
  resolution: "0.5K",
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  aspectRatio: "Auto",
  durationSeconds: 4,
  resolution: "480p",
  audio: true,
};
