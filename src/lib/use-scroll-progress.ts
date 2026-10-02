"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Continuous 0->1 scroll progress through a tall wrapper element - meant to
 * be paired with a `position: sticky` child pinned for the wrapper's own
 * height (see scroll-showcase.tsx). 0 the instant the wrapper's top reaches
 * the top of the viewport (the moment the sticky child starts being
 * pinned), 1 once the wrapper has scrolled past by its own height minus one
 * viewport (the moment the sticky child unpins again).
 *
 * Deliberately a scroll-position listener, not IntersectionObserver -
 * IntersectionObserver only reports discrete threshold crossings, not a
 * continuous value, so it can't drive a scrubbed animation where scroll
 * position and animation progress are the same number.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    function measure() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0);
        return;
      }
      const raw = -rect.top / scrollableDistance;
      setProgress(Math.min(1, Math.max(0, raw)));
    }

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress };
}

/** Standard ease-out cubic - motion that starts fast and settles gently,
 * used throughout the scroll-driven sections for a less mechanical feel
 * than raw linear scroll progress. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/** Remaps `progress` (0->1 over the whole scroll range) to a local 0->1
 * value over just the [start, end] window, eased - the building block for
 * staggering several elements across one shared scroll progress value. */
export function windowedProgress(progress: number, start: number, end: number): number {
  if (end <= start) return progress >= end ? 1 : 0;
  const local = (progress - start) / (end - start);
  return easeOutCubic(local);
}
