// Seeded line-art plates and tracing-paper scribbles; pure functions of their seed.
import type { FieldNode, NoteMark, PlateSeg } from "./types";
import { rand, smooth } from "./util";

export function plate(o: FieldNode, variant?: string, kind?: string): PlateSeg[] {
  const key = o.id + (variant || "");
  const r = (n: any) => rand(key + n), S: PlateSeg[] = [];
  const LINE = "#C4C4C2", k = kind || o.k;
  const line = (x1: number, y1: number, x2: number, y2: number, w: number, op: number) => S.push({ d: `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`, st: LINE, fl: "none", w, o: op.toFixed(2) });
  const dot = (cx: number, cy: number, rad: number, op: number) => S.push({ d: `M${(cx - rad).toFixed(1)},${cy.toFixed(1)}a${rad.toFixed(1)},${rad.toFixed(1)} 0 1,0 ${(rad * 2).toFixed(1)},0a${rad.toFixed(1)},${rad.toFixed(1)} 0 1,0 ${(-rad * 2).toFixed(1)},0`, st: "none", fl: LINE, w: 0, o: op.toFixed(2) });
  const rect = (x: number, y: number, w: number, h: number, fo: boolean, op: number) => S.push({ d: `M${x.toFixed(1)},${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`, st: LINE, fl: fo ? LINE : "none", w: 0.5, o: op.toFixed(2) });

  if (k === "drawing" || k === "document") {
    for (let i = 0; i < 26; i++) { const y = 6 + i * 7.4, off = r(i) * 60; line(8 + off * 0.3, y, 292 - off, y + (r("b" + i) - 0.5) * 5, 0.6, 0.3 + r("c" + i) * 0.6); }
  } else if (k === "photograph") {
    for (let i = 0; i < 240; i++) { const g = smooth(0, 1, r("g" + i)); dot(r("x" + i) * 300, r("y" + i) * 200, 0.7 + g * 2.6, 0.14 + g * 0.5); }
  } else if (k === "material") {
    for (let i = 0; i < 120; i++) { const s = 3 + r("s" + i) * 16; rect(r("m" + i) * 292, r("n" + i) * 192, s, s * 0.5, false, 0.22 + r("o" + i) * 0.5); }
  } else if (k === "sound") {
    let d = "M0,100";
    for (let i = 0; i <= 300; i += 3) { const a = Math.sin(i * 0.09 + r("p") * 6) * (70 * Math.exp(-i / 150)) * (0.4 + r("q" + i) * 0.6); d += ` L${i},${(100 + a).toFixed(1)}`; }
    S.push({ d, st: LINE, fl: "none", w: 1, o: "0.8" });
    line(0, 100, 300, 100, 0.5, 0.4);
  } else if (k === "detail") {
    for (let i = 0; i < 7; i++) { const y = 18 + i * 25 + r("j" + i) * 6; line(14, y, 286, y + (r("k" + i) - 0.5) * 8, 1.2, 0.45 + r("l" + i) * 0.4); }
    for (let i = 0; i < 40; i++) { const x = 20 + r("v" + i) * 260; line(x, 12, x, 188, 0.4, 0.14 + r("u" + i) * 0.24); }
  } else {
    for (let i = 0; i < 10; i++) { const w = 24 + r("w" + i) * 110, h = 20 + r("h" + i) * 120; rect(r("a" + i) * (300 - w), r("e" + i) * (200 - h), w, h, true, 0.1 + r("f" + i) * 0.2); }
    for (let i = 0; i < 10; i++) { const w = 24 + r("w" + i) * 110, h = 20 + r("h" + i) * 120; rect(r("a" + i) * (300 - w), r("e" + i) * (200 - h), w, h, false, 0.3 + r("z" + i) * 0.3); }
  }
  return S;
}

// A drawn response, generated once per seeded trace: a few loose passes of a
// hand following something. Not an illustration of the object, a reaction to it.
export function scribble(seed: string) {
  const r = (k: any) => rand(seed + k), out: NoteMark[] = [];
  const cnt = 2 + Math.floor(r("c") * 4);
  for (let i = 0; i < cnt; i++) {
    let x = 34 + r("x" + i) * 232, y = 30 + r("y" + i) * 140;
    let d = "M" + x.toFixed(1) + "," + y.toFixed(1);
    const steps = 7 + Math.floor(r("s" + i) * 11);
    let ax = (r("a" + i) - 0.5) * 34, ay = (r("b" + i) - 0.5) * 26;
    for (let j = 0; j < steps; j++) {
      ax += (r("p" + i + "_" + j) - 0.5) * 24; ay += (r("q" + i + "_" + j) - 0.5) * 20;
      x = Math.max(8, Math.min(292, x + ax)); y = Math.max(8, Math.min(192, y + ay));
      d += "L" + x.toFixed(1) + "," + y.toFixed(1);
    }
    out.push({ d, w: (0.9 + r("w" + i) * 1.7).toFixed(2) });
  }
  return out;
}
