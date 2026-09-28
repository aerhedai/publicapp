"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";

const MENU_ITEMS = [
  {
    href: "/console/account/profile",
    label: "View Profile",
    icon: (
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/account/pricing",
    label: "Pricing & Plans",
    icon: (
      <path
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/account/manage",
    label: "Manage Account",
    icon: (
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13.5a1.7 1.7 0 00.3 1.9M4.6 13.5a1.7 1.7 0 01-.3 1.9M12 4v2M12 18v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/console/account/help",
    label: "Help Center",
    icon: (
      <path
        d="M12 18v.01M9.5 9a2.5 2.5 0 015 0c0 1.5-1 2-2 2.8-.6.5-1 1-1 1.7M12 21a9 9 0 100-18 9 9 0 000 18z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function AccountMenu({ credits, collapsed }: { credits: number; collapsed: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; bottom: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Portaled to document.body - a separate entity from the sidebar, not
  // subject to its rounded-corner overflow-hidden clipping (confirmed live
  // that clipping was the actual bug: the popup used to be a DOM descendant
  // of the sidebar's own rounded wrapper). Position is computed from the
  // trigger's real screen position, so it always pops out to the right of
  // it regardless of collapsed/expanded width.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      left: rect.right + 8,
      bottom: window.innerHeight - rect.bottom,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-white/5 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-xs font-medium text-white">
          {initial}
        </div>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{name}</span>
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted-foreground">
              <path
                d="M6 8l4-4 4 4M6 12l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popupRef}
            style={{ left: position.left, bottom: position.bottom }}
            className="fixed z-50 w-72 rounded-2xl border border-white/10 bg-[#141414] p-2 shadow-2xl"
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-sm font-medium text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{name}</p>
                <p className="text-xs text-zinc-400">Free Plan</p>
              </div>
            </div>

            <div className="my-2 border-t border-white/10" />

            <div className="px-3 py-1">
              <p className="text-xs text-zinc-400">Credits</p>
              <p className="text-sm font-medium text-white">{credits} left</p>
            </div>

            <div className="mt-1 space-y-1 px-1">
              <Link
                href="/console/account/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Top-up Credits
                <span className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-3 py-1 text-xs font-medium text-white">
                  Get
                </span>
              </Link>
              <Link
                href="/console/account/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                Go Pro
                <span className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-3 py-1 text-xs font-medium text-white">
                  Get
                </span>
              </Link>
            </div>

            <div className="my-2 border-t border-white/10" />

            <div className="space-y-1 px-1">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-zinc-200 hover:bg-white/5"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-zinc-400">
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="my-2 border-t border-white/10" />

            <button
              type="button"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-zinc-400">
                <path
                  d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
