"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "cookie-notice-dismissed";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage can throw (private window, blocked site data) - fail to
    // "dismissed" rather than show a banner that can never be cleared.
    return true;
  }
}

// Server has no localStorage - always renders dismissed, same as
// getSnapshot's own catch case. useSyncExternalStore reconciles any
// difference from the real client value after hydration without a
// mismatch warning - this is exactly the case it's built for, unlike a
// plain useEffect+setState (which React's own lint flags as the wrong tool
// for synchronizing from an external store).
function getServerSnapshot() {
  return true;
}

function dismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best-effort - if storage is unavailable the banner just reappears
    // next load, which is harmless.
  }
  listeners.forEach((l) => l());
}

// This app's only cookies are strictly-necessary ones (Clerk session auth,
// Stripe checkout) - nothing tracking/advertising, so there's no consent
// *gate* to build (nothing to block until opt-in). This is the lighter,
// correct-for-this-app fix the audit's "cookie consent" finding actually
// needed: a one-time notice, dismissible, remembered per-browser via
// localStorage (never phones home - purely a per-viewer convenience, same
// pattern as this app's other sessionStorage caches).
export function CookieBanner() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex max-w-xl flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          We use strictly necessary cookies for sign-in and checkout - nothing for tracking or
          advertising. By using Curealo you agree to this.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
