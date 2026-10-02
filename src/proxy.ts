import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Default-deny: everything is protected unless it matches one of these.
// Add new public routes here explicitly - never widen this by accident.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms", // has to be readable before an account exists - also what Clerk's legal-consent setting needs a public URL for
  "/support", // same reasoning - readable without an account, same as the landing page
  "/api/webhooks/(.*)", // verified via signature inside the handler, not via session
  "/api/cron/(.*)", // verified via CRON_SECRET inside the handler, not via session
  "/monitoring(.*)", // Sentry's tunnelRoute (next.config.ts) - error reports from unauthenticated pages too
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals. mp4/webm
    // added alongside the image extensions - the hero's generated video
    // backgrounds (public/hero/*.mp4) were getting caught by auth.protect()
    // and 404ing on the public landing page before this, since they weren't
    // in this exclusion list the way images already were.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
