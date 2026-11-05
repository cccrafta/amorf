// Tracing-paper scribbles; pure functions of their seed.
import type { NoteMark } from "./types";
import { rand, smooth } from "./util";

// A drawn response, generated once per seeded trace: a few loose passes of a
// hand following something. Not an illustration of the object, a reaction to it.
export function scribble(seed: string) {
  const r = (k: string | number) => rand(seed + k), out: NoteMark[] = [];
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
