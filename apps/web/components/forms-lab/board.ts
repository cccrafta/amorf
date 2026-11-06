// Board layout for the lab's entity view: an entity's pictures packed in rings around the first (the hero) on a grid of
// square modules, the same rule as the DOM board (components/field/interior/placement.ts, radialFill), without text.
import type { BoardPicture } from "./faces";
import { BASE_Y, BOARD_ASPECT, BOARD_COLS, BOARD_SEARCH, BOARD_WAVE, LEAD, MODULE } from "./config";

// A box in modules, its centre measured from the board's centre with y up; delay is its place in the departure wave, 0 for
// the hero to 1 for the piece farthest from it.
// src is the index of the picture in the entity's board list, which a picture that found no free spot leaves out.
export type BoardBox = { src: number; x: number; y: number; w: number; h: number; delay: number };
export type BoardLayout = { boxes: BoardBox[]; w: number; h: number };

const GOLD = Math.PI * (3 - Math.sqrt(5));
const colsOf = (p: BoardPicture) => (p.video ? BOARD_COLS.video : p.ar > 1 ? BOARD_COLS.portrait : BOARD_COLS.landscape);

export function boardLayout(pics: BoardPicture[]): BoardLayout {
  const taken = new Set<string>();
  const cells: { src: number; c: number; r: number; w: number; h: number; ar: number }[] = [];
  const clear = (c: number, r: number, w: number, h: number) => {
    // One empty module is kept between a piece and anything else.
    for (let y = r - 1; y < r + h + 1; y++) for (let x = c - 1; x < c + w + 1; x++) if (taken.has(x + "," + y)) return false;
    return true;
  };
  const put = (src: number, c: number, r: number, w: number, h: number, ar: number) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) taken.add(x + "," + y);
    cells.push({ src, c, r, w, h, ar });
  };
  // A piece's height is its width times its ratio; the grid holds it in whole modules, the drawn box keeps the ratio.
  const rowsOf = (w: number, ar: number) => Math.max(1, Math.ceil(w * ar));

  pics.forEach((p, i) => {
    const w = colsOf(p), h = rowsOf(w, p.ar);
    if (i === 0) { put(0, -Math.floor(w / 2), -Math.floor(h / 2), w, h, p.ar); return; }
    // Each piece prefers a direction, stepped by the golden angle, so consecutive pieces land on different sides.
    const want = ((i - 1) * GOLD) % (2 * Math.PI);
    let best: [number, number] | null = null, bestScore = Infinity;
    for (let r = -BOARD_SEARCH; r <= BOARD_SEARCH; r++) for (let c = -BOARD_SEARCH; c <= BOARD_SEARCH; c++) {
      const dx = c + w / 2, dy = (r + h / 2) * BOARD_ASPECT, d = Math.hypot(dx, dy);
      if (d >= bestScore) continue;
      let da = Math.abs(Math.atan2(dy, dx) + Math.PI - want) % (2 * Math.PI);
      if (da > Math.PI) da = 2 * Math.PI - da;
      const score = d * (1 + (0.5 * da) / Math.PI);
      if (score < bestScore && clear(c, r, w, h)) { best = [c, r]; bestScore = score; }
    }
    if (best) put(i, best[0], best[1], w, h, p.ar);
  });

  if (!cells.length) return { boxes: [], w: 0, h: 0 };
  // Boxes from the cells: top-aligned in their cell like the DOM board, then centred on the board's bounds.
  const raw = cells.map(k => ({ src: k.src, x: k.c + k.w / 2, y: k.r + (k.w * k.ar) / 2, w: k.w, h: k.w * k.ar }));
  const minX = Math.min(...raw.map(b => b.x - b.w / 2)), maxX = Math.max(...raw.map(b => b.x + b.w / 2));
  const minY = Math.min(...raw.map(b => b.y - b.h / 2)), maxY = Math.max(...raw.map(b => b.y + b.h / 2));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const hero = raw[0];
  const far = Math.max(1e-6, ...raw.map(b => Math.hypot(b.x - hero.x, b.y - hero.y)));
  return {
    w: maxX - minX,
    h: maxY - minY,
    boxes: raw.map(b => {
      const d = Math.hypot(b.x - hero.x, b.y - hero.y);
      return { src: b.src, x: b.x - cx, y: -(b.y - cy), w: b.w, h: b.h, delay: d / far };
    }),
  };
}

// When a cube leaves for its place in the board, as a share of the explosion: the hero (delay 0) first, the rest over the wave.
export const departure = (delay: number) => LEAD + delay * BOARD_WAVE;

// The board in world units. w, h: its size; cy: its centre height; hero: the first picture's centre (dx from the form's x,
// y in height) and size. Null for an entity with no picture.
export type BoardBounds = { w: number; h: number; cy: number; hero: { dx: number; y: number; w: number; h: number } };
export function boardBounds(l: BoardLayout): BoardBounds | null {
  if (!l.boxes.length) return null;
  const cy = (l.h * MODULE) / 2 + BASE_Y, hero = l.boxes[0];
  return { w: l.w * MODULE, h: l.h * MODULE, cy, hero: { dx: hero.x * MODULE, y: cy + hero.y * MODULE, w: hero.w * MODULE, h: hero.h * MODULE } };
}

// Where a box lands, in the board's own frame: x across from the form's centre, y the height above the ground.
export const landing = (l: BoardLayout, b: BoardBox) => ({ x: b.x * MODULE, y: (l.h * MODULE) / 2 + BASE_Y + b.y * MODULE });
