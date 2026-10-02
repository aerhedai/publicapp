"use client";

import { useEffect, useRef, useState } from "react";

/** One-time "has this scrolled into view yet" trigger via
 * IntersectionObserver, for a reveal animation that should play once and
 * stay (Pricing/Capabilities/FAQ cards) rather than scrub continuously with
 * scroll position (that's useScrollProgress, for scroll-showcase.tsx's
 * burst). Disconnects itself after firing - cheap, no ongoing scroll
 * listener once an element has already revealed. */
export function useRevealOnScroll<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
