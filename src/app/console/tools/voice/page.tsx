// Static UI only - not wired to any backend. Mirrors the CreationBox's
// visual language (src/components/console/create/creation-box.tsx)
// without reusing it directly, since voice generation's inputs (a voice
// picker, not an aspect-ratio/resolution grid) are genuinely different.
const VOICES = ["Narrator (Calm)", "Narrator (Energetic)", "Conversational", "Announcer"];

export default function VoiceToolPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-8 py-14">
      <h1 className="font-display text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        Generate a voiceover
      </h1>

      <div className="rounded-2xl border border-border bg-card p-4">
        <textarea
          rows={4}
          placeholder="Type the script you want narrated..."
          className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/10"
          >
            {VOICES[0]}
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            disabled
            title="Voice generation isn't wired up yet - coming soon"
            className="cursor-not-allowed rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Voice generation isn&apos;t connected yet - coming soon.
      </p>
    </div>
  );
}
