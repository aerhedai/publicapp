import type { NextConfig } from "next";
// v11's withSentryConfig moved to this subpath - not re-exported from the
// package's main entry point anymore (confirmed against the installed
// version's own type declarations, not assumed from memory).
import { withSentryConfig } from "@sentry/nextjs/config";

// Clerk's hosted components (sign-in/up widgets, dev browser handshake) need
// their own script/frame/connect origins allowlisted - this is the
// documented Clerk-safe baseline. Clerk's sign-up bot-protection CAPTCHA is
// Cloudflare Turnstile, served from challenges.cloudflare.com - a separate
// domain from Clerk's own, easy to miss and confirmed to actually matter
// (a real "CAPTCHA failed to load" surfaced from omitting it). If you add
// other third-party embeds later, extend this rather than loosening it
// wholesale.
//
// *.clerk.accounts.dev/*.clerk.com only ever covered the shared dev
// instance - the real Production Clerk instance serves its Frontend API and
// Accounts Portal from this app's own subdomains instead (clerk.curealo.com,
// accounts.curealo.com, see the domain's cname_targets from Clerk's own API),
// which were missing here entirely. That's a real, confirmed-live bug, not
// a precaution: login silently did nothing on Production because the
// browser was CSP-blocking Clerk's script/API calls to its own domain.
// React/Next.js dev mode uses eval() for stack-trace reconstruction and Fast
// Refresh - never in production (React's own guarantee). Keep 'unsafe-eval'
// out of the production CSP entirely rather than allowing it everywhere;
// eval() being blocked is a real line of defense if script injection ever
// happens, not just incidental strictness.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // vercel.live: Vercel's own Preview-deployment toolbar (live feedback
  // widget), auto-injected on every Preview deploy - not something this app
  // opted into, but blocking it just produces a console CSP error for no
  // benefit since it's Vercel's own trusted script.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://clerk.curealo.com https://accounts.curealo.com https://challenges.cloudflare.com https://vercel.live`,
  // Clerk's bot-detection spins up a blob: Web Worker. Without this,
  // worker-src falls back to script-src, which doesn't allow blob: -
  // confirmed via a real "Creating a worker from 'blob:...' violates CSP" error.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  // blob: - local <img>/<video> previews via URL.createObjectURL() before a
  // reference/upload has finished (src/components/console/create/reference-panels.tsx)
  // are blocked by the CSP layer without this, confirmed live. The R2
  // wildcard is for rendering a completed job's own output
  // (output-preview.tsx's <img src={presignedUrl}>) - connect-src already
  // allowlists R2 for presigned uploads, but img-src is a separate directive
  // and never had it, so every generated-image thumbnail was silently
  // CSP-blocked - confirmed live via the browser's own CSP violation message.
  "img-src 'self' data: blob: https://img.clerk.com https://*.r2.cloudflarestorage.com",
  // Governs <video src>/<audio src> (output-preview.tsx's video player for
  // video/stitch jobs) - same R2 reasoning as img-src above. No directive
  // here falls back to default-src 'self', which would've blocked video
  // previews for the identical reason once img-src was fixed.
  "media-src 'self' https://*.r2.cloudflarestorage.com",
  "font-src 'self' data:",
  // Presigned uploads (src/storage/r2.ts) are PUT directly from the browser
  // to R2, by design - the server never proxies file bytes. Without this,
  // the browser blocks the request at the CSP layer before it even reaches
  // R2's own CORS check (confirmed live - a real "Failed to fetch" that
  // looked like a CORS bug was actually this).
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.curealo.com https://accounts.curealo.com https://challenges.cloudflare.com https://*.r2.cloudflarestorage.com https://vercel.live wss://ws-us3.pusher.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.curealo.com https://accounts.curealo.com https://challenges.cloudflare.com https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// org/project/authToken are picked up automatically from SENTRY_ORG/
// SENTRY_PROJECT/SENTRY_AUTH_TOKEN (set by the Vercel Sentry integration,
// see .env.local) - no need to pass them here. tunnelRoute proxies
// client-side error/trace reports through this app's own server at
// /monitoring instead of sending them directly to Sentry's ingest host -
// same-origin, so it needs no CSP change and isn't blocked by ad-blockers
// that target *.sentry.io directly. Added to proxy.ts's public-route
// allowlist since it must work for unauthenticated visitors too.
export default withSentryConfig(nextConfig, {
  silent: true,
  tunnelRoute: "/monitoring",
});
