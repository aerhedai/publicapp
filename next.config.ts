import type { NextConfig } from "next";

// Clerk's hosted components (sign-in/up widgets, dev browser handshake) need
// their own script/frame/connect origins allowlisted - this is the
// documented Clerk-safe baseline. Clerk's sign-up bot-protection CAPTCHA is
// Cloudflare Turnstile, served from challenges.cloudflare.com - a separate
// domain from Clerk's own, easy to miss and confirmed to actually matter
// (a real "CAPTCHA failed to load" surfaced from omitting it). If you add
// other third-party embeds later, extend this rather than loosening it
// wholesale.
// React/Next.js dev mode uses eval() for stack-trace reconstruction and Fast
// Refresh - never in production (React's own guarantee). Keep 'unsafe-eval'
// out of the production CSP entirely rather than allowing it everywhere;
// eval() being blocked is a real line of defense if script injection ever
// happens, not just incidental strictness.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
  // Clerk's bot-detection spins up a blob: Web Worker. Without this,
  // worker-src falls back to script-src, which doesn't allow blob: -
  // confirmed via a real "Creating a worker from 'blob:...' violates CSP" error.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
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

export default nextConfig;
