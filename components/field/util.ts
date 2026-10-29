// Pure helpers shared by every field module: seeded hash, easing, wrapping and key activation.
import type React from "react";

export function rand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

export function smooth(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function wrap(v: number, m: number): number {
  let w = v % m;
  if (w > m / 2) w -= m;
  if (w < -m / 2) w += m;
  return w;
}

export function key(fn: (...args: any[]) => void) {
  return (e: React.KeyboardEvent | KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };
}
