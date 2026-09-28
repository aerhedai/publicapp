// Static UI only - not connected to any LLM. The seeded message below is
// the only content on this page; the input is present to show the intended
// shape of the feature but does nothing yet.
export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Talk through an idea before turning it into a scene.
        </p>
      </div>

      <div className="mt-6 flex-1 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-xs font-medium text-white">
            V
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3 text-sm">
            Hey! I&apos;m not connected to anything yet, but soon you&apos;ll be able to
            describe your idea here and I&apos;ll help turn it into a scene, ready
            to send to Generate.
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <input
          type="text"
          disabled
          placeholder="Chat isn't connected yet..."
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-muted-foreground"
        >
          Send
        </button>
      </div>
    </div>
  );
}
