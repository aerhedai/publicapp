"use client";

import Link from "next/link";

// Reuses this app's own real capabilities only - no "Upscale & Enhance"/
// "Edit Image"-style dead-end cards for things that don't exist yet (a
// deliberate choice, not an oversight - decided directly rather than
// matching a reference screenshot's 4-card count). Icon paths match the
// sidebar's own TOOL_ITEMS/TOP_ITEMS exactly (console-shell.tsx) so the
// same capability always reads as the same shape everywhere in the app.
const CARDS = [
  {
    href: "/console/tools/image",
    label: "Generate Image",
    icon: (
      <path
        d="M4 5h16v14H4V5zM4 16l4-4 3 3 5-5 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    gradient: "linear-gradient(135deg, color-mix(in srgb, var(--accent-from) 35%, var(--card)), var(--card))",
  },
  {
    href: "/console/tools/video",
    label: "Generate Video",
    icon: (
      <path
        d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM21 8l-4 2.5v3L21 16V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    gradient: "linear-gradient(135deg, color-mix(in srgb, var(--accent-to) 35%, var(--card)), var(--card))",
  },
  {
    href: "/console/projects",
    label: "Storyboard Projects",
    icon: (
      <path
        d="M4 6h6l2 2h8v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    gradient:
      "linear-gradient(135deg, color-mix(in srgb, var(--accent-from) 20%, var(--card)), color-mix(in srgb, var(--accent-to) 20%, var(--card)))",
  },
];

export function CapabilityCards() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          style={{ background: card.gradient }}
          className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-border p-4 transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors duration-150 ease-out group-hover:bg-black/45">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              {card.icon}
            </svg>
          </span>
          <span className="text-sm font-medium text-white">{card.label}</span>
        </Link>
      ))}
    </div>
  );
}
