import Link from "next/link";
import { GeneratorPreview } from "./generator-preview";

// No real footage exists yet to use as a hero background (this session's
// test-generated videos were all deleted after verification) - this uses
// layered gradient glows instead of a fabricated "customer" video. Swap in
// a real generated clip once one exists that's actually ours to show.
export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent-from) 18%, transparent), transparent 45%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-to) 16%, transparent), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
          Turn a prompt into a{" "}
          <span className="text-gradient-accent">scene</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          Character-consistent, cinematically-directed video and image
          generation - from a single line of description to a finished shot.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Start Creating
        </Link>
      </div>

      <div className="mx-auto mt-14 flex max-w-4xl justify-center">
        <GeneratorPreview />
      </div>
    </section>
  );
}
