import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AuthTrigger } from "@/components/auth/auth-trigger";

// Server Component - checks real auth state (auth() reads the session
// cookie) rather than always showing Login/Console as modal-openers
// regardless of whether you're already signed in. That blind-opening was a
// real, confirmed bug: an already-authenticated visitor clicking "Console"
// got a blank Clerk <SignIn/> (it renders empty for a signed-in user, since
// there's nothing to sign into) popped open on top of the console page
// underneath - not a UI glitch, this component just never checked.
//
// Note: page.tsx (the route this renders on) already redirects a signed-in
// visitor away from "/" entirely via a server-side `if (userId) redirect
// ("/console")`, so in the common case this component's signed-in branch
// never actually renders - it's a defensive second check, not the primary
// fix, for routes/conditions where that redirect doesn't fire (e.g. a
// client-side navigation that doesn't force a fresh server round-trip, or
// a view that renders this component in a context without that redirect).
export async function LandingNav() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-gradient-accent font-display text-xl font-bold tracking-tighter">
          Curealo
        </Link>
        <div className="flex items-center gap-4">
          {userId ? (
            <Link
              href="/console"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Console
            </Link>
          ) : (
            <>
              <AuthTrigger
                mode="sign-in"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </AuthTrigger>
              <AuthTrigger
                mode="sign-in"
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Console
              </AuthTrigger>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
