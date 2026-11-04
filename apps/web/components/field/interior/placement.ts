// Interior placement: puts board pieces on a grid of square modules — radial packing around the hero when nothing is
// authored; otherwise authored layout items stay where they are and the rest pack radially around them (first-fit
// when an entry frame is authored), after the deprecated at fractions.
import type { EntityLayout, LayoutItem } from "@/lib/field-data";
import { clampN, type Box, type Item, type Layout } from "./state";

export const NARROW = 760;
// Safe insets keep the frame (header, edge labels, bar) off every grid cell at rest; the narrow bar wraps to two lines.
const INSET = { wide: { l: 48, r: 48, t: 56, b: 44 }, narrow: { l: 20, r: 20, t: 56, b: 92 } };
// What must be seen on entry lives in the entry frame: 12 columns by ENTRY_ROWS rows from the entry cell.
const ENTRY_ROWS = 6;
const BOARD_COLS = 24;
// Board height the deprecated at fractions are read against (the design doc's example board).
const AT_ROWS = 14;

type Cell = { col: number; row: number; cols: number; rows: number; z?: number; crop: boolean };

// hero is the key of the piece that opens the board; items arrive in default reading order. The text overlay sits
// over the board, so the grid does not keep clear of it.
export function resolve(lay: EntityLayout | undefined, items: Item[], W: number, H: number, hero: string | null): Layout {
  const narrow = W < NARROW, per = narrow ? 4 : 12, ins = narrow ? INSET.narrow : INSET.wide;
  const unit = (W - ins.l - ins.r) / per, gut = unit * 0.14;
  const cols = narrow ? 4 : clampN(lay?.board?.cols ?? BOARD_COLS, 12, 48);
  const authored = new Map<string, LayoutItem>((lay?.items || []).map(a => [a.ref, a]));
  // array order of layout.items is reading order: listed pieces first, the rest in their default order
  const order = [
    ...(lay?.items || []).map(a => items.find(i => i.ref === a.ref)).filter((i): i is Item => !!i),
    ...items.filter(i => !authored.has(i.ref)),
  ];

  const cells: Record<string, Cell> = {};
  // radial is set when the board is packed around the hero; centre is then the hero's key, which the view opens on
  let radial = false, centre: string | null = null;
  const taken = new Set<string>(), reserved = new Set<string>();
  const rowsOf = (it: Item, span: number) => Math.max(1, Math.ceil((it.tall(span * unit - gut) + gut) / unit));
  const mark = (set: Set<string>, c: number, r: number, w: number, h: number) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) set.add(x + "," + y);
  };
  // m is the margin: a packed piece keeps one empty cell between itself and anything else
  const free = (c: number, r: number, w: number, h: number, m: number) => {
    if (c < 1 || r < 1 || c + w - 1 > cols) return false;
    for (let y = r - m; y < r + h + m; y++) for (let x = c - m; x < c + w + m; x++) {
      const k = x + "," + y;
      if (taken.has(k) || reserved.has(k)) return false;
    }
    return true;
  };
  const put = (it: Item, col: number, row: number, span: number, h?: number, z?: number) => {
    const rows = h ?? rowsOf(it, span);
    cells[it.key] = { col, row, cols: span, rows, z, crop: h !== undefined };
    mark(taken, col, row, span, rows);
  };

  // Radial packing: pieces ring outward from (cx, cy), nearest first, each piece's preferred direction stepped by the
  // golden angle so consecutive pieces land on different sides. Deterministic; distances are stretched vertically by
  // the viewport's aspect so the rings fill a wide screen. Unbounded (centred coordinates) or inside the board's columns.
  const GOLD = Math.PI * (3 - Math.sqrt(5)), ASPECT = W / H;
  const radialFill = (cx: number, cy: number, bounded: boolean) => {
    const clear = (c: number, r: number, w: number, h: number) => {
      for (let y = r - 1; y < r + h + 1; y++) for (let x = c - 1; x < c + w + 1; x++) if (taken.has(x + "," + y)) return false;
      return true;
    };
    const lastRow = Math.max(0, ...Object.values(cells).map(c => c.row + c.rows));
    let n = 0;
    order.forEach(it => {
      if (cells[it.key]) return;
      const span = Math.min(it.cols, 12), rows = rowsOf(it, span), want = (n++ * GOLD) % (2 * Math.PI);
      const [cLo, cHi, rLo, rHi] = bounded ? [2, cols - span + 1, 2, lastRow + 40] : [-60, 60, -40, 40];
      let best: [number, number] | null = null, bestScore = Infinity;
      for (let r = rLo; r <= rHi; r++) for (let c = cLo; c <= cHi; c++) {
        const dx = c + span / 2 - cx, dy = (r + rows / 2 - cy) * ASPECT, d = Math.hypot(dx, dy);
        if (d >= bestScore) continue;
        let da = Math.abs(Math.atan2(dy, dx) + Math.PI - want) % (2 * Math.PI);
        if (da > Math.PI) da = 2 * Math.PI - da;
        const score = d * (1 + 0.5 * da / Math.PI);
        if (score < bestScore && clear(c, r, span, rows)) { best = [c, r]; bestScore = score; }
      }
      if (best) put(it, best[0], best[1], span);
    });
  };

  if (narrow) {
    order.forEach(it => {
      const n = authored.get(it.ref)?.narrow;
      if (n && n.col && n.row) put(it, clampN(n.col, 1, 4), n.row, clampN(n.w ?? 4, 1, 5 - clampN(n.col, 1, 4)));
    });
    let cursor = 1, side = 0;
    order.forEach(it => {
      if (cells[it.key]) return;
      const a = authored.get(it.ref);
      const lead = it.layer === "float" || it.key === hero;
      const span = lead || (a?.w ?? it.cols) >= 6 ? 4 : 3;
      // three-wide pieces alternate between the left and right edge so the stack reads as a column, not a list
      const col = span === 4 ? 1 : side++ % 2 ? 2 : 1;
      const rows = rowsOf(it, span);
      let r = cursor;
      while (!free(col, r, span, rows, 0)) r++;
      put(it, col, r, span);
      cursor = r + rows;
    });
  } else if (!(lay?.items || []).some(a => a.col && a.row) && !lay?.entry) {
    radial = true;
    const lead = items.find(i => i.key === hero) || order[0];
    if (lead) { const sp = Math.min(lead.cols, 12), rs = rowsOf(lead, sp); put(lead, -Math.floor(sp / 2), -Math.floor(rs / 2), sp); }
    radialFill(0, 0, false);
    // shift to the grid's usual origin: column and row 1 stay empty as the board's margin
    const cs = Object.values(cells), dc = 2 - Math.min(...cs.map(c => c.col)), dr = 2 - Math.min(...cs.map(c => c.row));
    cs.forEach(c => { c.col += dc; c.row += dr; });
    centre = lead ? lead.key : null;
  } else {
    order.forEach(it => {
      const a = authored.get(it.ref);
      if (!a || !a.col || !a.row) return;
      const span = clampN(a.w ?? it.cols, 1, Math.min(12, cols));
      put(it, clampN(a.col, 1, cols - span + 1), a.row, span, a.h, a.z);
    });
    order.forEach(it => {
      if (cells[it.key] || !it.at) return;
      const span = Math.min(it.cols, cols), rows = rowsOf(it, span);
      const col = clampN(Math.round(it.at[0] * cols - span / 2) + 1, 1, cols - span + 1);
      const row = clampN(Math.round(it.at[1] * AT_ROWS - rows / 2) + 1, 1, Math.max(1, AT_ROWS - rows + 1));
      if (free(col, row, span, rows, 0)) put(it, col, row, span);
    });
    const lead = items.find(i => i.key === hero);
    if (lead && !cells[lead.key] && free(2, 2, lead.cols, rowsOf(lead, lead.cols), 0)) put(lead, 2, 2, lead.cols);

    // Pinned pieces stay where they are; the rest ring outward from the hero, or from the pinned pieces' middle when the
    // hero is itself pinned elsewhere or does not fit. An authored entry frame keeps the first-fit packing below.
    const placed = Object.values(cells);
    if (!lay?.entry && placed.length) {
      const hc = lead && cells[lead.key];
      const box = hc || {
        col: Math.min(...placed.map(c => c.col)), row: Math.min(...placed.map(c => c.row)),
        cols: Math.max(...placed.map(c => c.col + c.cols)) - Math.min(...placed.map(c => c.col)),
        rows: Math.max(...placed.map(c => c.row + c.rows)) - Math.min(...placed.map(c => c.row)),
      };
      radialFill(box.col + box.cols / 2, box.row + box.rows / 2, true);
    }

    // An authored entry frame is held back from packing, so what reaches past it is always outside it. Without one,
    // packing fills the first screen beside the hero.
    if (lay?.entry) mark(reserved, lay.entry.col ?? 1, lay.entry.row ?? 1, 12, ENTRY_ROWS);
    // column 1 stays empty as the board's left margin; the right one is added to the board width below
    const starts = (span: number) => {
      const out: number[] = [];
      for (let c = 2; c + span - 1 <= cols; c += 2) out.push(c);
      for (let c = 3; c + span - 1 <= cols; c += 2) out.push(c);
      return out;
    };
    order.forEach(it => {
      if (cells[it.key]) return;
      const span = Math.min(it.cols, cols - 1), rows = rowsOf(it, span), cs = starts(span);
      for (let r = 2; r < 2000; r++) {
        const c = cs.find(c => free(c, r, span, rows, 1));
        if (c !== undefined) { put(it, c, r, span); return; }
      }
    });
  }

  const all = Object.values(cells);
  const lastCol = Math.max(per, ...all.map(c => c.col + c.cols - 1));
  // an unauthored board is only as wide as it needs to be, so a short entity has no empty screen to pan to
  const boardCols = narrow ? 4 : radial ? lastCol + 1 : lay?.board?.cols ? cols : lastCol + (lastCol > per ? 1 : 0);
  const visRows = Math.floor((H - ins.t - ins.b) / unit);
  const boardRows = Math.max(lay?.board?.rows ?? 0, visRows, ...all.map(c => c.row + c.rows));
  const pos: Record<string, Box> = {};
  items.forEach(it => {
    const c = cells[it.key]; if (!c) return;
    const w = c.cols * unit - gut;
    pos[it.key] = {
      x: ins.l + (c.col - 1) * unit + gut / 2, y: ins.t + (c.row - 1) * unit + gut / 2,
      w, h: c.crop ? c.rows * unit - gut : it.tall(w), col: c.col, row: c.row, cols: c.cols, rows: c.rows, z: c.z, crop: c.crop,
    };
  });
  const ec = narrow ? 1 : lay?.entry?.col ?? 1, er = narrow ? 1 : lay?.entry?.row ?? 1;
  const c0 = centre ? pos[centre] : null;
  if (c0) {
    // the opening unfolds from the hero: about 40 ms per ring of four modules, capped at 400 ms, each piece arriving
    // from 12 px nearer the centre
    const hx = c0.x + c0.w / 2, hy = c0.y + c0.h / 2;
    Object.values(pos).forEach(b => {
      const dx = b.x + b.w / 2 - hx, dy = b.y + b.h / 2 - hy, d = Math.hypot(dx, dy);
      b.enter = { dl: Math.min(400, Math.floor(d / (unit * 4)) * 40), ox: d ? (-dx / d) * 12 : 0, oy: d ? (-dy / d) * 12 : 0 };
    });
  }
  return {
    w: narrow ? W : ins.l + boardCols * unit + ins.r,
    h: radial ? ins.t + boardRows * unit + ins.b : Math.max(H, ins.t + boardRows * unit + ins.b),
    focus: c0 ? { x: c0.x + c0.w / 2, y: c0.y + c0.h / 2 } : { x: (ec - 1) * unit + W / 2, y: (er - 1) * unit + H / 2 },
    pos,
  };
}
