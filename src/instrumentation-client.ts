import * as Sentry from "@sentry/nextjs";

// Browser-side init - Next.js's instrumentation-client.ts convention
// (node_modules/next/dist/docs/.../instrumentation-client.md): runs after
// the HTML loads, before hydration, no export required beyond the
// router-transition hook below. Requests are tunneled through /monitoring
// (see next.config.ts's withSentryConfig tunnelRoute) rather than going
// directly to Sentry's ingest host - same-origin, so it needs no CSP
// connect-src change and isn't blocked by ad-blockers that target
// *.sentry.io directly.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
