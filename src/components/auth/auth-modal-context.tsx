"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthMode = "sign-in" | "sign-up";

interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
  open: (mode: AuthMode) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalState | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("sign-in");

  const open = useCallback((m: AuthMode) => {
    setMode(m);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, mode, open, close }), [isOpen, mode, open, close]);

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}
