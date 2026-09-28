"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  {
    href: "/console",
    label: "Home",
    icon: (
      <path
        d="M4 11.5L12 4l8 7.5M6 10v9a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1v-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/generate",
    label: "Generate",
    icon: (
      <path
        d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3zM5 15l.8 2 2 .8-2 .8L5 20l-.8-2-2-.8 2-.8L5 15zM19 14l.7 1.6 1.6.7-1.6.7L19 18l-.7-1.6-1.6-.7 1.6-.7L19 14z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/chat",
    label: "Chat",
    icon: (
      <path
        d="M4 5h16v10H8l-4 4V5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/library",
    label: "Library",
    icon: (
      <path
        d="M4 6h6v6H4V6zM14 6h6v6h-6V6zM4 16h6v2H4v-2zM14 16h6v2h-6v-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/settings",
    label: "Settings",
    icon: (
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V20a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H4a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H10a1.7 1.7 0 001-1.5V4a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V10a1.7 1.7 0 001.5 1H20a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

function SidebarContent({ credits, onNavigate }: { credits: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-60 flex-col px-4 py-6">
      <Link href="/" className="font-display px-2 text-lg font-semibold tracking-tight">
        VidGen
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between rounded-lg border border-border px-3 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Credits</p>
          <p className="text-sm font-medium">{credits}</p>
        </div>
        <UserButton />
      </div>
    </div>
  );
}

export function ConsoleShell({
  credits,
  children,
}: {
  credits: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Mobile top bar - hidden at lg: and up, where the sidebar is always visible */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          VidGen
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-foreground hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar - always visible */}
      <aside className="hidden shrink-0 border-r border-border bg-card lg:flex">
        <SidebarContent credits={credits} />
      </aside>

      {/* Mobile off-canvas sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 border-r border-border bg-card shadow-2xl">
            <SidebarContent credits={credits} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
