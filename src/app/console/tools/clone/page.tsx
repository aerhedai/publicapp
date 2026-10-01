// Static UI shell only - explicitly out of scope to actually build yet
// (per direct instruction earlier this session: clone is a real feature of
// the pipeline, but not one to wire up right now). This is just the entry
// point placeholder so the nav item has somewhere to go.
export default function CloneToolPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 sm:px-8 py-14 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Clone a reel
      </h1>
      <p className="text-sm text-muted-foreground">
        Paste a link to a TikTok, Reel, or Short and we&apos;ll extrapolate a new
        story from it.
      </p>

      <div className="rounded-3xl border border-border bg-card p-4">
        <input
          type="text"
          placeholder="https://..."
          className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <button
            type="button"
            disabled
            title="Clone isn't wired up yet - coming soon"
            className="cursor-not-allowed rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white opacity-50"
          >
            Clone
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Not connected yet - coming soon.
      </p>
    </div>
  );
}
