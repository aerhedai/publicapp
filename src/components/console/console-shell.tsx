"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./account-menu";
import { ConsoleBreadcrumb } from "./breadcrumb";

const TOP_ITEMS = [
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
    href: "/console/explore",
    label: "Explore",
    icon: (
      <path
        d="M12 21a9 9 0 100-18 9 9 0 000 18zM15 9l-2 6-6 2 2-6 6-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/projects",
    label: "Projects",
    icon: (
      <path
        d="M4 6h6l2 2h8v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

const TOOL_ITEMS = [
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
  {
    href: "/console/tools/clone",
    label: "Clone",
    icon: (
      <path
        d="M8 8h10v10H8V8zM4 4h10v10H4V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

function NavLink({
  href,
  label,
  icon,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/console" ? pathname === "/console" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-white/10 text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
        {icon}
      </svg>
      {!collapsed && label}
    </Link>
  );
}

function SidebarContent({
  credits,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  credits: number;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className={`flex h-full flex-col py-6 ${collapsed ? "w-20 px-2" : "w-60 px-4"}`}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-2`}>
        {!collapsed && (
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            VidGen
          </Link>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 4v16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {TOP_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        <div className={`mt-4 mb-1 ${collapsed ? "text-center" : "px-3"}`}>
          {!collapsed && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tools
            </p>
          )}
          {collapsed && <div className="mx-auto h-px w-6 bg-white/10" />}
        </div>
        {TOOL_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && (
        <Link
          href="/console/account/plan"
          className="mb-3 flex items-center justify-between rounded-xl bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <span className="flex items-center gap-1.5">
            Go Pro
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M4 10h12M11 5l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">45% off</span>
        </Link>
      )}

      <AccountMenu credits={credits} collapsed={collapsed} />
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      {/* Mobile top bar - hidden at lg: and up, where the sidebar is always visible */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          VidGen
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar - floating card, not docked flush to the viewport
          edges: margin on all sides + its own rounded border/shadow. */}
      <aside className="hidden shrink-0 p-3 lg:flex">
        <div className="flex h-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <SidebarContent
            credits={credits}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </div>
      </aside>

      {/* Mobile off-canvas sidebar - never collapsed, no point on a narrow screen */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 border-r border-border bg-card shadow-2xl">
            <SidebarContent
              credits={credits}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-8 py-4 text-sm font-medium">
          <ConsoleBreadcrumb />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
