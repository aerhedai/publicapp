import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // The free "Developer" plan this is provisioned on has a 5M-span tracing
  // allotment (see Vercel's own integration install output) - sampling at
  // 20% rather than 100% so normal traffic doesn't burn through that budget
  // in days. Raise this later if the allotment proves to have headroom.
  tracesSampleRate: 0.2,
});
