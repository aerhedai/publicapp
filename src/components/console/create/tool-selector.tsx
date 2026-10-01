"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TOOL_ICONS = [
  {
    href: "/console/tools/image",
    label: "Image",
    icon: (
      <path
        d="M4 5h16v14H4V5zM4 16l4-4 3 3 5-5 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/tools/video",
    label: "Video",
    icon: (
      <path
        d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM21 8l-4 2.5v3L21 16V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/tools/voice",
    label: "Voice",
    icon: (
      <path
        d="M5 10v4M9 6v12M13 4v16M17 8v8M21 11v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export interface SubMode {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// The bar above the create-box, shared by every Tools page. The first three
// icon-only buttons are a second entry point to the exact same navigation
// as the sidebar's Tools section (real <Link>s to the other tool pages,
// not local state) - clicking "Video" here while on Tools>Image takes you
// to Tools>Video, identically to clicking it in the sidebar. The
// sub-mode pills to the right are specific to whichever tool page renders
// this (Create Image/Create Artwork, Create Video/Edit Video/..., etc).
export function ToolSelector({
  subModes,
  activeSubMode,
  onSubModeChange,
}: {
  subModes: SubMode[];
  activeSubMode: string;
  onSubModeChange: (key: string) => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border bg-card p-1.5">
      {TOOL_ICONS.map((tool) => {
        const active = pathname.startsWith(tool.href);
        return (
          <Link
            key={tool.href}
            href={tool.href}
            aria-label={tool.label}
            title={tool.label}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              active ? "bg-white text-neutral-900" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              {tool.icon}
            </svg>
          </Link>
        );
      })}

      <div className="h-6 w-px bg-white/10" />

      {subModes.map((sub) => (
        <button
          key={sub.key}
          type="button"
          onClick={() => onSubModeChange(sub.key)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            activeSubMode === sub.key
              ? "bg-white/15 text-white"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            {sub.icon}
          </svg>
          {sub.label}
        </button>
      ))}
    </div>
  );
}
