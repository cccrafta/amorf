// Chronology: reading years out of the collection's irregular date strings.
import type { FieldNode } from "./types";

// Dates as the collection actually holds them: ranges, centuries, refusals.
export function yearOf(o: FieldNode | null | undefined): number | null {
  const y = (o && o.y) || "";
  const c = y.match(/(\d{1,2})(?:st|nd|rd|th)\s+c/i);
  if (c) return parseInt(c[1], 10) * 100 - 50;
  const m = y.match(/\d{3,4}/);
  return m ? parseInt(m[0], 10) : null;
}

export function yearLabel(o: FieldNode): string {
  const y = yearOf(o);
  return y === null ? "undated" : String(y);
}

export function gap(a: FieldNode, b: FieldNode): number | null {
  const ya = yearOf(a), yb = yearOf(b);
  if (ya === null || yb === null) return null;
  return Math.abs(yb - ya);
}
