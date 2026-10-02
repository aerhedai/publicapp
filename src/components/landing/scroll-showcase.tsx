"use client";

import Image from "next/image";
import { useScrollProgress, windowedProgress } from "@/lib/use-scroll-progress";

// Real generated output (see public/showcase's own source - 6 real Flux.2
// Klein jobs dispatched directly against the production image endpoint at
// ~1MP/768p-tier, mixed aspect ratios for a collage look rather than a
// uniform grid), not stock photography. Each entry's `to` is its final
// resting transform (vw/vh so it scales with viewport, not fixed px); `at`
// is the [start, end] window of the section's overall 0->1 scroll progress
// this image animates across - staggered and overlapping, not sequential,
// so the burst reads as one continuous motion rather than a slideshow.
const IMAGES: {
  src: string;
  alt: string;
  aspect: string;
  // clamp(min, preferred-vw, max) - a bare `${vw}vw` with only an upper cap
  // has no floor, so on a narrow phone (where vw is a small absolute
  // number) the cards shrank to ~55-85px, unreadably small. Confirmed live
  // (user on a phone) - this wasn't a "that's just mobile" expectation, it
  // was a real missing-minimum-size bug.
  width: string;
  at: [number, number];
  to: { x: number; y: number; rotate: number };
}[] = [
  {
    src: "/showcase/portrait-sailor.png",
    alt: "Cinematic portrait generated from a text prompt",
    aspect: "7/9",
    width: "clamp(150px, 15vw, 220px)",
    at: [0.15, 0.45],
    to: { x: -20, y: -11, rotate: -6 },
  },
  {
    src: "/showcase/cyberpunk-street.png",
    alt: "Futuristic city street generated from a text prompt",
    aspect: "7/4",
    width: "clamp(190px, 22vw, 320px)",
    at: [0.2, 0.5],
    to: { x: 18, y: -14, rotate: 5 },
  },
  {
    src: "/showcase/cozy-kitchen.png",
    alt: "Cozy kitchen scene generated from a text prompt",
    aspect: "1/1",
    width: "clamp(150px, 16vw, 230px)",
    at: [0.25, 0.55],
    to: { x: -22, y: 8, rotate: 4 },
  },
  {
    src: "/showcase/astronaut-space.png",
    alt: "Astronaut in space generated from a text prompt",
    aspect: "1/1",
    width: "clamp(150px, 16vw, 230px)",
    at: [0.3, 0.6],
    to: { x: 21, y: 7, rotate: -5 },
  },
  {
    src: "/showcase/bioluminescent-forest.png",
    alt: "Glowing fantasy forest generated from a text prompt",
    aspect: "7/4",
    width: "clamp(170px, 20vw, 280px)",
    at: [0.35, 0.65],
    to: { x: -4, y: -20, rotate: -3 },
  },
  {
    src: "/showcase/perfume-product.png",
    alt: "Product photography generated from a text prompt",
    aspect: "7/9",
    width: "clamp(140px, 14vw, 200px)",
    at: [0.4, 0.7],
    to: { x: 7, y: 17, rotate: 6 },
  },
];

const HEADING_FADE_END = 0.15;
const CAPTION_FADE_START = 0.85;

export function ScrollShowcase() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();

  const headingOpacity = 1 - windowedProgress(progress, 0, HEADING_FADE_END);
  const captionOpacity = windowedProgress(progress, CAPTION_FADE_START, 1);

  return (
    <section ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent-from) 10%, transparent), transparent 60%)",
          }}
        />

        {/* Opening line - recedes as the burst begins, never fully gone (a
            faint anchor stays throughout rather than disappearing). */}
        <div
          className="pointer-events-none absolute inset-x-6 text-center transition-none"
          style={{ opacity: Math.max(0.08, headingOpacity) }}
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            One prompt. Endless scenes.
          </h2>
        </div>

        {IMAGES.map((img) => {
          const local = windowedProgress(progress, img.at[0], img.at[1]);
          const fadeIn = windowedProgress(progress, img.at[0], img.at[0] + (img.at[1] - img.at[0]) * 0.4);
          const x = img.to.x * local;
          const y = img.to.y * local;
          const rotate = img.to.rotate * local;
          const scale = 0.4 + 0.6 * local;

          return (
            <div
              key={img.src}
              className="pointer-events-none absolute left-1/2 top-1/2 overflow-hidden rounded-2xl shadow-2xl"
              style={{
                width: img.width,
                aspectRatio: img.aspect,
                opacity: fadeIn,
                // translate(-50%, -50%) is the centering anchor (left-1/2
                // top-1/2 alone only pins the element's top-left corner to
                // the container's center) - applied first, then the burst
                // motion on top of that true-centered starting point.
                transform: `translate(-50%, -50%) translate(${x}vw, ${y}vh) rotate(${rotate}deg) scale(${scale})`,
              }}
            >
              <Image src={img.src} alt={img.alt} fill sizes="320px" className="object-cover" />
            </div>
          );
        })}

        {/* Closing line - pays off the scrub once the collage has settled. */}
        <div
          className="pointer-events-none absolute inset-x-6 bottom-16 text-center sm:bottom-20"
          style={{ opacity: captionOpacity }}
        >
          <p className="font-display text-lg text-muted-foreground sm:text-xl">
            Every one of these came from a single line of text.
          </p>
        </div>
      </div>
    </section>
  );
}
