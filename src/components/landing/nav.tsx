import Link from "next/link";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight">
          VidGen
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
