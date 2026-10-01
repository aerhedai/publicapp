import * as Sentry from "@sentry/nextjs";

// Next.js's own instrumentation.ts convention (node_modules/next/dist/docs/.../instrumentation.md) -
// register() runs once per server instance, before it serves requests.
// Dynamically imports the right per-runtime Sentry config so edge code never
// pulls in the Node SDK and vice versa.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Wires server-side errors (Server Components, Route Handlers, Server
// Actions) into Sentry - the Next.js-documented hook for this
// (node_modules/next/dist/docs/.../instrumentation.md#onrequesterror),
// implemented by Sentry's own captureRequestError.
export const onRequestError = Sentry.captureRequestError;
