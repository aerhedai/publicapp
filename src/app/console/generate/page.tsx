// Static UI only - deliberately not wired to POST /api/jobs yet. Pricing/
// usage gating for this flow hasn't been decided, so this shouldn't be able
// to actually spend a real user's credits until that's designed.
export default function GeneratePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Generate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the scene, add references, and generate.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-foreground"
          >
            Video
          </button>
          <button
            type="button"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground"
          >
            Image
          </button>
        </div>

        <textarea
          rows={4}
          placeholder="A woman stares out a rain-streaked window, city lights blurred behind her, camera pushing in slowly..."
          className="mt-4 w-full resize-none rounded-xl border border-border bg-background/60 p-4 text-sm placeholder:text-muted-foreground focus:border-white/30 focus:outline-none"
        />

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Character references
          </p>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Camera</label>
            <input
              type="text"
              placeholder="Medium close-up..."
              className="mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-white/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duration</label>
            <input
              type="text"
              defaultValue="6s"
              className="mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Resolution</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-white/30 focus:outline-none">
              <option>1080p</option>
              <option>720p</option>
              <option>480p</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cost</label>
            <p className="mt-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              5 credits
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Generation isn&apos;t wired up yet - coming soon.
          </p>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-muted-foreground"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
