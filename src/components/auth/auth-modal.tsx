"use client";

import { useEffect } from "react";
import { useAuthModal } from "./auth-modal-context";
import { AuthCard } from "./auth-card";

// Rendered once at the root (src/app/layout.tsx) - opened from anywhere via
// useAuthModal().open("sign-in" | "sign-up"). This is what makes login
// "global": every in-app trigger (nav, hero, pricing, etc.) opens this same
// modal instead of navigating to a page - the /sign-in and /sign-up routes
// still exist separately for direct links and Clerk's own redirect targets
// (src/proxy.ts's auth.protect() can only redirect to a real URL, not open
// a client-only modal), styled identically via the same AuthCard.
export function AuthModal() {
  const { isOpen, mode, close, open } = useAuthModal();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Heavier frosted-glass treatment, not a flat dimmed scrim -
          backdrop-blur-2xl (was -sm) plus backdrop-saturate pushes the
          colors of whatever's behind it rather than just darkening them. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-2xl backdrop-saturate-150"
        onClick={close}
      />
      <div className="relative">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <AuthCard mode={mode} onSwitchMode={open} />
      </div>
    </div>
  );
}
