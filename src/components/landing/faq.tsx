"use client";

import { imageCreditCost, videoCreditCost, VIDEO_MIN_DURATION_SECONDS, VIDEO_MAX_DURATION_SECONDS } from "@/lib/pricing-math";
import { useRevealOnScroll } from "@/lib/use-reveal-on-scroll";

// Pulled from the same tables the app actually charges against, not a
// hardcoded copy - a hardcoded flat number here had already silently
// drifted wrong once before (said "videos cost 5" when real cost varies by
// resolution/duration), which is exactly how this class of bug happens.
const FAQS = [
  {
    q: "What can I generate?",
    a: "Short video clips and standalone images from a text description, optionally anchored to one or more character reference images you upload.",
  },
  {
    q: "How does billing work?",
    a: `Credits are deducted when a generation starts. Cost depends on resolution (and, for video, length) - images run ${imageCreditCost("480p")}-${imageCreditCost("768p")} credits, videos run ${videoCreditCost("480p", VIDEO_MIN_DURATION_SECONDS)}-${videoCreditCost("768p", VIDEO_MAX_DURATION_SECONDS)} credits. If a generation fails for any reason, the credit is automatically refunded.`,
  },
  {
    q: "What happens if a generation fails?",
    a: "You're never charged for a failure - the credit is automatically refunded, no action needed on your end.",
  },
  {
    q: "How long does a generation take?",
    a: "Usually under a minute. Occasionally the first generation after a quiet period takes a little longer while everything spins back up.",
  },
];

/** Plain fade + a small rise, no scale or rotation - the calmest of the
 * four reveal treatments on this page, deliberately: this is a reference
 * section someone reads carefully, not a moment to catch the eye the way
 * scroll-showcase's burst or capabilities' flip do. */
function FaqItem({ item, index }: { item: (typeof FAQS)[number]; index: number }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        transitionDelay: `${index * 80}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
      }}
    >
      <h3 className="font-medium">{item.q}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          FAQs
        </h2>

        <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {FAQS.map((item, i) => (
            <FaqItem key={item.q} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
