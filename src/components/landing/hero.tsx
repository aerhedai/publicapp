"use client";

import { GeneratorPreview } from "./generator-preview";
import { AuthTrigger } from "@/components/auth/auth-trigger";
import { useHeroVideoCycle, type HeroScene } from "./hero-video-cycle";

// Real generated output (see /public/hero's own source - 3 real MiniMax H3
// jobs dispatched directly against the production video endpoint at 768p/
// 16:9, not stock/fabricated footage), matched 1:1 with the prompt that's
// typewritten into the mock chat box above each one. The displayed prompt
// is a shorter, user-register version of what was actually sent to the
// worker for generation (the real dispatch used a more detailed camera/
// action directive for better output) - same scene, just marketing copy vs.
// generation prompt.
const SCENES: HeroScene[] = [
  { prompt: "A race car driving around a track", videoSrc: "/hero/race-car.mp4" },
  {
    prompt: "A woman stares out a rain-streaked window, city lights blurred behind her, camera pushing in slowly",
    videoSrc: "/hero/rain-window.mp4",
  },
  { prompt: "A drone shot soaring over a misty mountain range at golden hour", videoSrc: "/hero/mountains.mp4" },
];

export function Hero() {
  const { activeIndex, typedText, videoVisible } = useHeroVideoCycle(SCENES);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28">
      {/* Gradient fallback - only ever visible before the very first video
          has faded in; every video crossfade after that leaves one of them
          at opacity-100 permanently, per the "never show the original
          background again" brief. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent-from) 18%, transparent), transparent 45%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-to) 16%, transparent), transparent 50%)",
        }}
      />

      {/* Full-bleed video stack - every scene's video is always mounted
          (never conditionally rendered), only opacity toggles, so a
          crossfade never has to wait on a fresh load/decode. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {SCENES.map((scene, i) => (
          <video
            key={scene.videoSrc}
            src={scene.videoSrc}
            muted
            loop
            autoPlay
            playsInline
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
              i === activeIndex && videoVisible ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Darkens the video enough for the headline/chat box to stay
            legible over any of the three clips, foreground and background
            alike. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
          Turn a prompt into a{" "}
          <span className="text-gradient-accent">scene</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          Character-consistent, cinematically-directed video and image
          generation - from a single line of description to a finished shot.
        </p>
        <AuthTrigger
          mode="sign-up"
          className="mt-8 rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Start Creating
        </AuthTrigger>
      </div>

      <div className="mx-auto mt-14 flex max-w-4xl justify-center">
        <GeneratorPreview typedText={typedText} />
      </div>
    </section>
  );
}
