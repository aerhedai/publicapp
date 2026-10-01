import { AspectIcon } from "./aspect-icon";
import {
  IMAGE_ASPECT_RATIOS,
  IMAGE_SAMPLERS,
  VIDEO_ASPECT_RATIOS,
  type ImageSettings,
  type VideoSettings,
} from "./types";
import { imageCreditCost, videoCreditCost } from "@/lib/pricing-math";

function AspectRatioGrid({
  options,
  value,
  onChange,
}: {
  options: { label: string; ratio: number | null }[];
  value: string;
  onChange: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.label)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs transition-colors ${
            value === opt.label
              ? "border-white/30 bg-white/10 text-white"
              : "border-transparent text-zinc-400 hover:bg-white/5"
          }`}
        >
          <AspectIcon ratio={opt.ratio} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-neutral-900" : "bg-white/5 text-zinc-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

export function ImageSettingsPopover({
  settings,
  onChange,
}: {
  settings: ImageSettings;
  onChange: (next: ImageSettings) => void;
}) {
  return (
    <div className="w-80 rounded-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl">
      <h3 className="text-sm font-medium text-white">Image settings</h3>
      <div className="my-4 border-t border-white/10" />

      <p className="mb-3 text-xs font-medium text-zinc-400">Aspect ratio</p>
      <AspectRatioGrid
        options={IMAGE_ASPECT_RATIOS}
        value={settings.aspectRatio}
        onChange={(aspectRatio) => onChange({ ...settings, aspectRatio })}
      />

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">Outputs</p>
        <div className="flex items-center gap-3 rounded-full bg-white/5 px-3 py-1">
          <button
            type="button"
            onClick={() => onChange({ ...settings, outputs: Math.max(1, settings.outputs - 1) })}
            className="text-zinc-300 hover:text-white"
          >
            −
          </button>
          <span className="w-4 text-center text-sm text-white">{settings.outputs}</span>
          <button
            type="button"
            onClick={() => onChange({ ...settings, outputs: Math.min(4, settings.outputs + 1) })}
            className="text-zinc-300 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-zinc-400">Resolution</p>
        <div className="flex flex-wrap gap-2">
          {(["480p", "768p"] as const).map((res) => (
            <Pill
              key={res}
              label={`${res} · ${imageCreditCost(res)}cr`}
              active={settings.resolution === res}
              onClick={() => onChange({ ...settings, resolution: res })}
            />
          ))}
        </div>
      </div>

      <div className="my-4 border-t border-white/10" />
      <p className="mb-3 text-xs font-medium text-zinc-400">Advanced</p>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Steps</p>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white">{settings.steps}</span>
        </div>
        <input
          type="range"
          min={1}
          max={8}
          value={settings.steps}
          onChange={(e) => onChange({ ...settings, steps: Number(e.target.value) })}
          className="mt-3 w-full accent-white"
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Guidance (CFG)</p>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white">{settings.cfg.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={0.1}
          value={settings.cfg}
          onChange={(e) => onChange({ ...settings, cfg: Number(e.target.value) })}
          className="mt-3 w-full accent-white"
        />
        {/* This is a distilled model - its weights bake in cfg=1 behavior,
            so values above 1 are a real but experimental knob, not a
            documented recommendation. Said plainly instead of hidden,
            since the setting is still genuinely functional at any value in
            range. */}
        <p className="mt-1.5 text-[11px] text-zinc-500">This model is distilled for CFG 1 - higher values work but are experimental.</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-zinc-400">Sampler</p>
        <div className="flex flex-wrap gap-2">
          {IMAGE_SAMPLERS.map((s) => (
            <Pill key={s} label={s} active={settings.sampler === s} onClick={() => onChange({ ...settings, sampler: s })} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Seed</p>
          <button
            type="button"
            onClick={() => onChange({ ...settings, seed: settings.seed === null ? 0 : null })}
            className="text-xs text-zinc-400 transition-colors hover:text-white"
          >
            {settings.seed === null ? "Random" : "Fixed"}
          </button>
        </div>
        {settings.seed !== null && (
          <input
            type="number"
            min={0}
            value={settings.seed}
            onChange={(e) => onChange({ ...settings, seed: Number(e.target.value) })}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

export function VideoSettingsPopover({
  settings,
  onChange,
  compact = false,
}: {
  settings: VideoSettings;
  onChange: (next: VideoSettings) => void;
  // Audio isn't wired to a real graph input yet (MiniMax H3's graph has no
  // audio-reference/toggle input - only a text `audio_tag` description and
  // an always-on audio output path), so it stays hidden rather than showing
  // a control that would silently no-op. Resolution (480p/768p) IS wired
  // (ResolutionSelector's `megapixels` param, see the video worker's
  // graph_builder.py) and always shows regardless of this flag.
  compact?: boolean;
}) {
  return (
    <div className="w-80 rounded-3xl border border-white/10 bg-[#141414] p-5 shadow-2xl">
      <h3 className="text-sm font-medium text-white">Video settings</h3>
      <div className="my-4 border-t border-white/10" />

      <p className="mb-3 text-xs font-medium text-zinc-400">Aspect ratio</p>
      <AspectRatioGrid
        options={VIDEO_ASPECT_RATIOS}
        value={settings.aspectRatio}
        onChange={(aspectRatio) => onChange({ ...settings, aspectRatio })}
      />

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Duration</p>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white">
            {settings.durationSeconds}s
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={settings.durationSeconds}
          onChange={(e) => onChange({ ...settings, durationSeconds: Number(e.target.value) })}
          className="mt-3 w-full accent-white"
        />
        {/* Live price readout - every point on the slider has a real,
            formula-computed cost (pricing-math.ts's videoCreditCost), not a
            flat number, so showing it update live is what makes "this
            costs more" legible as you drag rather than a surprise at
            generate time. */}
        <p className="mt-2 text-xs text-zinc-500">
          {videoCreditCost(settings.resolution, settings.durationSeconds)} credits at this length and resolution
        </p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-zinc-400">Resolution</p>
        <div className="flex flex-wrap gap-2">
          {(["480p", "768p"] as const).map((res) => (
            <Pill
              key={res}
              label={res}
              active={settings.resolution === res}
              onClick={() => onChange({ ...settings, resolution: res })}
            />
          ))}
        </div>
      </div>

      {!compact && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">Audio</p>
          <button
            type="button"
            role="switch"
            aria-checked={settings.audio}
            onClick={() => onChange({ ...settings, audio: !settings.audio })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.audio ? "bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))]" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.audio ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
