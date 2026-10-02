import { LandingNav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { imageCreditCost, videoCreditCost, VIDEO_MIN_DURATION_SECONDS, VIDEO_MAX_DURATION_SECONDS } from "@/lib/pricing-math";

// Public route (see src/proxy.ts's allowlist) - moved here from
// /console/account/support so it's reachable the same way /terms is:
// without an account, and with the site's own nav/footer chrome, not the
// console shell. Nothing inside the console links to the old nested route
// anymore (account-sidebar.tsx/account-menu.tsx now point here directly).
const FAQS = [
  {
    q: "What can I generate?",
    a: "Short video clips and standalone images from a text description, optionally anchored to one or more character reference images you upload.",
  },
  {
    q: "How does billing work?",
    // Pulled from the same tables the app actually charges against
    // (src/lib/credits.ts) rather than a second hardcoded copy - a
    // hardcoded flat number here had already silently drifted wrong once
    // (said "videos cost 5" when it was 80), which is exactly how this
    // class of bug happens. Cost now varies by resolution/duration, so a
    // single flat number would be misleading even if it started accurate.
    a: `Credits are deducted when a generation is dispatched. Cost depends on resolution (and, for video, duration - priced per second) - images are ${imageCreditCost("480p")}-${imageCreditCost("768p")} credits, videos range from ${videoCreditCost("480p", VIDEO_MIN_DURATION_SECONDS)} to ${videoCreditCost("768p", VIDEO_MAX_DURATION_SECONDS)} credits - see the Plan page for the full breakdown once you're signed in. If a generation fails for any reason, the credit is automatically refunded.`,
  },
  {
    q: "What happens if a generation fails?",
    a: "You're never charged for a failure - the credit reserved for that job is refunded automatically, and the job is marked failed with the reason.",
  },
  {
    q: "How long does a generation take?",
    a: "Usually under a minute. Occasionally the first generation after a quiet period takes a little longer while everything spins back up.",
  },
];

export default function PublicSupportPage() {
  return (
    <main className="flex flex-1 flex-col">
      <LandingNav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 sm:px-8 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Support</h1>

        <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.q}>
              <h3 className="font-medium">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Something else? Reach us at{" "}
          <a href="mailto:support@curealo.com" className="text-foreground underline underline-offset-2">
            support@curealo.com
          </a>
          .
        </p>
      </div>
      <Footer />
    </main>
  );
}
