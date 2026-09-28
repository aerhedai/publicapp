"use client";

import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";

type AuthMode = "sign-in" | "sign-up";

// Same gradient-glow treatment as the landing hero - no real generated
// footage exists yet to show here (this session's test videos were all
// deleted after verification). Swap for a real looping clip once one
// exists that's actually ours to show.
function VideoPanel() {
  return (
    <div className="relative hidden overflow-hidden md:block">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent-from) 25%, transparent), transparent 50%), radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--accent-to) 22%, transparent), transparent 55%), #050505",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex h-full flex-col justify-end p-8">
        <p className="font-display text-xl font-medium text-balance text-white">
          Turn a prompt into a scene.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Character-consistent, cinematically-directed video and image
          generation.
        </p>
      </div>
    </div>
  );
}

export function AuthCard({
  mode,
  onSwitchMode,
}: {
  mode: AuthMode;
  onSwitchMode?: (mode: AuthMode) => void;
}) {
  const otherMode: AuthMode = mode === "sign-in" ? "sign-up" : "sign-in";
  const switchHref = otherMode === "sign-in" ? "/sign-in" : "/sign-up";

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl md:grid-cols-2">
      <VideoPanel />

      {/* Generous outer padding here is deliberate - the Clerk card
          (styled in src/lib/clerk-appearance.ts) needs real margin between
          its own edges and this column's boundary, not just the space its
          own internal padding provides. */}
      <div className="flex flex-col items-center justify-center px-8 py-12 md:px-12">
        <div className="w-full max-w-sm">
          {mode === "sign-in" ? (
            <SignIn routing="hash" forceRedirectUrl="/console" />
          ) : (
            <SignUp routing="hash" forceRedirectUrl="/console" />
          )}
        </div>

        <Link
          href={switchHref}
          onClick={(e) => {
            if (onSwitchMode) {
              e.preventDefault();
              onSwitchMode(otherMode);
            }
          }}
          className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "sign-in" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </Link>
      </div>
    </div>
  );
}
