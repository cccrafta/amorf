"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dayMonth, formatClock, type When } from "@/lib/time";

// A year shown as separately animatable digits (exact years), or an opaque label (vague dates).
type Shown =
  | { roll: true; pre: string; digits: string; suf: string }
  | { roll: false; text: string };

const DIGIT_MS = 600;
const STAGGER_MS = 100;
const BLANK = " "; // figure space: keeps tabular width while a digit slot is empty

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

function shownOf(when: When | null, yearNow: number): Shown {
  if (!when) return { roll: true, pre: "", digits: String(yearNow), suf: "" };
  const m = when.precision === "year" ? when.label.match(/^(c\. )?(\d+)( BCE)?$/) : null;
  if (m) return { roll: true, pre: m[1] ?? "", digits: m[2], suf: m[3] ?? "" };
  return { roll: false, text: when.label };
}

const textOf = (s: Shown) => (s.roll ? s.pre + s.digits + s.suf : s.text);

// Digits are right-aligned and padded to equal length; each slot counts up through at least one
// full turn to its target, left slots starting first.
function rollFrame(a: string, b: string, t: number): { text: string; digits: string } {
  const L = Math.max(a.length, b.length);
  const pa = a.padStart(L, " "), pb = b.padStart(L, " ");
  let text = "", digits = "";
  for (let i = 0; i < L; i++) {
    const s = pa[i] === " " ? null : +pa[i];
    const e = pb[i] === " " ? null : +pb[i];
    const ts = t - i * STAGGER_MS;
    let v: number | null;
    if (ts >= DIGIT_MS) v = e;
    else if (ts <= 0 || s === e) v = s;
    else {
      const sv = s ?? 0, ev = e ?? 0;
      v = (sv + Math.round(((ev - sv + 10) % 10 + 10) * ease(ts / DIGIT_MS))) % 10;
    }
    if (v === null) text += BLANK;
    else { text += v; digits += v; }
  }
  return { text, digits };
}

export default function FieldClock({ when }: { when: When | null }) {
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<{ text: string; ghost: string; ghostA: number } | null>(null);
  // live always mirrors what is on screen, so an interrupted animation restarts from it.
  const live = useRef<Shown | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      id = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(id);
  }, []);

  useLayoutEffect(() => {
    cancelAnimationFrame(raf.current);
    const to = shownOf(when, new Date().getFullYear());
    const from = live.current;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!from || reduced || textOf(from) === textOf(to)) {
      live.current = to;
      setView({ text: textOf(to), ghost: "", ghostA: 0 });
      return;
    }

    const t0 = performance.now();
    if (from.roll && to.roll) {
      const total = DIGIT_MS + (Math.max(from.digits.length, to.digits.length) - 1) * STAGGER_MS;
      const step = (nowMs: number) => {
        const t = Math.min(nowMs - t0, total);
        const f = rollFrame(from.digits, to.digits, t);
        live.current = { roll: true, pre: to.pre, digits: t >= total ? to.digits : f.digits, suf: to.suf };
        setView({ text: t >= total ? textOf(to) : to.pre + f.text + to.suf, ghost: "", ghostA: 0 });
        if (t < total) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    } else {
      const ghost = textOf(from), text = textOf(to);
      live.current = to;
      const step = (nowMs: number) => {
        const p = Math.min((nowMs - t0) / DIGIT_MS, 1);
        setView({ text, ghost: p < 1 ? ghost : "", ghostA: 1 - ease(p) });
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      setView({ text, ghost, ghostA: 1 });
      raf.current = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(raf.current);
  }, [when]);

  const time = now ? formatClock(now, null).time : "--:--:--";

  return (
    <div
      className="field-label field-label-dim"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "0 10px",
        fontSize: 10,
        lineHeight: 1.6,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
      aria-hidden="true"
    >
      <span style={{ display: "inline-flex", gap: "0.5em" }}>
        <span>{now ? dayMonth(now) : "-- ---"}</span>
        <span style={{ display: "inline-grid" }}>
          <span style={{ gridArea: "1 / 1", opacity: view?.ghost ? 1 - view.ghostA : 1 }}>{view?.text ?? "----"}</span>
          {view?.ghost ? (
            <span style={{ gridArea: "1 / 1", opacity: view.ghostA }}>{view.ghost}</span>
          ) : null}
        </span>
      </span>
      <span className="field-label-accent" style={{ opacity: 0.75 }}>{time}</span>
    </div>
  );
}
