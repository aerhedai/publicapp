"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

const ITEMS = [
  {
    href: "/console/account",
    label: "Account",
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
    href: "/console/account/plan",
    label: "Plan",
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
    href: "/console/account/support",
    label: "Support",
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
  {
    href: "/console/account/terms",
    label: "Terms & Policies",
    icon: (
      <path
        d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM13 3v5h5M9 13h6M9 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

/**
 * The account-section's own internal sidebar (Account/Plan/Support/Terms &
 * Policies/Log out) - a second, narrower nav distinct from ConsoleShell's
 * main sidebar, scoped only to /console/account/** via layout.tsx. Account
 * and Plan are real pages with real content; Support/Terms are their own
 * pages too (nothing external to link out to). Log out is not a page at
 * all - clicking it signs out immediately, styled red since it's the one
 * destructive/exit action in this list.
 */
export function AccountSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border px-4 py-8">
      <h2 className="mb-4 px-3 font-display text-lg font-semibold tracking-tight">Account</h2>

      {ITEMS.map((item) => {
        const active = item.href === "/console/account" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />

      <button
        type="button"
        onClick={() => signOut({ redirectUrl: "/" })}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
          <path
            d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Log out
      </button>
    </nav>
  );
}
