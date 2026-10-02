"use client";

import { useState } from "react";
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

/** A real accordion, not a static wall of always-open text - only one
 * answer open at a time. The expand/collapse uses the CSS grid-rows 0fr/1fr
 * trick (animating a grid track, not max-height) so the height transition
 * is exact and smooth without ever needing to measure/guess a pixel value.
 * The entrance itself (fade + small rise, staggered) is unchanged from
 * before - this adds the click-to-expand interaction on top of it, still
 * the calmest of the page's four reveal treatments. */
function FaqItem({
  item,
  index,
  open,
  onToggle,
}: {
  item: (typeof FAQS)[number];
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="border-b border-border"
      style={{
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        transitionDelay: `${index * 80}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <h3 className="font-medium">{item.q}</h3>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-foreground transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-sm text-muted-foreground">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">FAQs</h2>

        <div className="mt-12">
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              index={i}
              open={openIndex === i}
              onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
