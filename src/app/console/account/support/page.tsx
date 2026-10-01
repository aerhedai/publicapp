import { imageCreditCost, videoCreditCost, VIDEO_MIN_DURATION_SECONDS, VIDEO_MAX_DURATION_SECONDS } from "@/lib/pricing-math";

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
    a: `Credits are deducted when a generation is dispatched. Cost depends on resolution (and, for video, duration - priced per second) - images are ${imageCreditCost("480p")}-${imageCreditCost("768p")} credits, videos range from ${videoCreditCost("480p", VIDEO_MIN_DURATION_SECONDS)} to ${videoCreditCost("768p", VIDEO_MAX_DURATION_SECONDS)} credits - see the Plan page for the full breakdown. If a generation fails for any reason, the credit is automatically refunded.`,
  },
  {
    q: "What happens if a generation fails?",
    a: "You're never charged for a failure - the credit reserved for that job is refunded automatically, and the job is marked failed with the reason.",
  },
  {
    q: "How long does a generation take?",
    a: "Typically under a minute once a GPU worker is warm. The very first request in a while can take up to a couple of minutes while a worker cold-starts.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Support</h1>

      <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {FAQS.map((item) => (
          <div key={item.q}>
            <h3 className="font-medium">{item.q}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
