"use client";

import { useEffect, useState } from "react";

export interface HeroScene {
  prompt: string;
  videoSrc: string;
}

const TYPE_SPEED_MS = 45;
const HOLD_MS = 5000;
const PAUSE_BEFORE_TYPING_MS = 400; // beat after a video settles in before the next prompt starts typing

/**
 * Drives the hero's "typewriter types a prompt -> that prompt's real
 * generated video fades in behind it, full-bleed" cycle. State machine:
 * type scene[i].prompt -> on finish, crossfade video[i] in -> hold
 * HOLD_MS -> clear text, advance i (wrapping) -> repeat. The previous
 * video stays visible (opacity 1) the entire time the next prompt is
 * being typed - it only crossfades out once the NEXT video is ready,
 * per the "never show the original gradient background again" brief.
 */
export function useHeroVideoCycle(scenes: HeroScene[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    if (scenes.length === 0) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    }

    function runScene(index: number, startDelay: number) {
      const prompt = scenes[index].prompt;
      schedule(() => {
        setActiveIndex(index);
        let charIndex = 0;
        function typeNext() {
          if (cancelled) return;
          charIndex += 1;
          setTypedText(prompt.slice(0, charIndex));
          if (charIndex < prompt.length) {
            schedule(typeNext, TYPE_SPEED_MS);
          } else {
            // Typing just finished - fade the matching video in and hold.
            schedule(() => {
              setVideoVisible(true);
              schedule(() => {
                setVideoVisible(false);
                setTypedText("");
                runScene((index + 1) % scenes.length, 0);
              }, HOLD_MS);
            }, PAUSE_BEFORE_TYPING_MS);
          }
        }
        typeNext();
      }, startDelay);
    }

    runScene(0, 200);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Only ever re-run if the scene list itself changes (it's static in
    // practice) - re-running on typedText/activeIndex would restart the
    // whole cycle every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes.length]);

  return { activeIndex, typedText, videoVisible };
}
