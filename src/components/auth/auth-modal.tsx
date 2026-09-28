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
      <div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute -top-10 right-0 rounded-full p-2 text-white/70 transition-colors hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
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
