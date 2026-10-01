"use client";

import { useMemo, useRef, useState } from "react";

// Hand-rolled rather than a library (e.g. react-mentions) - this codebase
// has zero UI-component dependencies anywhere (every dependency in
// package.json is a functionally load-bearing SDK: Clerk, Stripe, AWS S3,
// Neon, Upstash - no component/icon library), so a ~150-line custom
// implementation fits the established convention far better than a new
// dependency for something this bounded.
//
// Known limitation: a plain <textarea> can't render rich inline formatting,
// so a typed "@Image1" token isn't visually highlighted afterward - only
// the live autocomplete dropdown while typing is "rich". A real highlighted
// token would need a contentEditable-based editor, a meaningfully bigger
// component. Flagged as a deliberate v1 trade-off, not an oversight.

export interface MentionOption {
  tag: string; // e.g. "Image1", "Audio1"
}

const STYLE_PROPS_TO_COPY = [
  "boxSizing",
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
] as const;

export function MentionTextarea({
  value,
  onChange,
  options,
  placeholder,
  rows = 2,
  onKeyDown,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: MentionOption[];
  placeholder?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState<{ start: number; query: string; top: number; left: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return options.filter((o) => o.tag.toLowerCase().startsWith(q));
  }, [trigger, options]);

  // Mirrors the textarea's text into an identically-styled hidden div up to
  // the caret, then measures a marker span's position - the standard
  // technique for getting pixel caret coordinates out of a plain <textarea>
  // (textareas have no native API for this).
  function measureCaret(text: string, caret: number): { top: number; left: number } {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return { top: 0, left: 0 };

    const style = window.getComputedStyle(ta);
    for (const prop of STYLE_PROPS_TO_COPY) {
      mirror.style[prop] = style[prop];
    }
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.height = "auto";

    mirror.textContent = text.slice(0, caret);
    const marker = document.createElement("span");
    marker.textContent = "​";
    mirror.appendChild(marker);

    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    return {
      top: markerRect.top - mirrorRect.top - ta.scrollTop,
      left: markerRect.left - mirrorRect.left,
    };
  }

  function updateTriggerFromCaret(text: string, caret: number) {
    let i = caret - 1;
    while (i >= 0 && /[A-Za-z0-9]/.test(text[i])) i--;
    if (i >= 0 && text[i] === "@") {
      const query = text.slice(i + 1, caret);
      const pos = measureCaret(text, caret);
      setTrigger({ start: i, query, ...pos });
      setActiveIndex(0);
    } else {
      setTrigger(null);
    }
  }

  function selectOption(tag: string) {
    if (!trigger) return;
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, trigger.start);
    const after = value.slice(caret);
    const inserted = `@${tag} `;
    onChange(`${before}${inserted}${after}`);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    updateTriggerFromCaret(text, e.target.selectionStart ?? text.length);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (trigger && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectOption(filtered[activeIndex].tag);
        return;
      }
      if (e.key === "Escape") {
        setTrigger(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      {/* Off-screen measurement double, never shown - see measureCaret. */}
      <div ref={mirrorRef} aria-hidden className="pointer-events-none fixed left-0 top-0 -z-10 opacity-0" />
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateTriggerFromCaret(value, e.currentTarget.selectionStart ?? 0)}
        onBlur={() => setTrigger(null)}
        className={className}
      />
      {trigger && filtered.length > 0 && (
        <div
          className="absolute z-30 max-h-48 w-40 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900 py-1 shadow-xl"
          style={{ top: trigger.top + 22, left: trigger.left }}
        >
          {filtered.map((o, i) => (
            <button
              key={o.tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(o.tag);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm ${
                i === activeIndex ? "bg-white/10 text-foreground" : "text-zinc-300 hover:bg-white/5"
              }`}
            >
              @{o.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
