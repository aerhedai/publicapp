"use client";

import { useAuthModal } from "./auth-modal-context";

// Drop-in replacement for a <Link href="/sign-in"|"/sign-up"> - opens the
// global auth modal (src/components/auth/auth-modal.tsx) instead of
// navigating away. Use this for every in-app auth entry point.
export function AuthTrigger({
  mode,
  className,
  children,
}: {
  mode: "sign-in" | "sign-up";
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useAuthModal();
  return (
    <button type="button" onClick={() => open(mode)} className={className}>
      {children}
    </button>
  );
}
