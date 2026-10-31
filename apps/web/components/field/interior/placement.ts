// Interior placement: puts board pieces on a grid of square modules — authored layout items, deprecated at fractions, then deterministic first-fit packing.
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

// hero is the key of the piece that takes the slot beside the title; items arrive in default reading order.
export function resolve(lay: EntityLayout | undefined, items: Item[], W: number, H: number, hero: string | null): Layout {
  const narrow = W < NARROW, ins = narrow ? INSET.narrow : INSET.wide, per = narrow ? 4 : 12;
  const unit = (W - ins.l - ins.r) / per, gut = unit * 0.14;
  const cols = narrow ? 4 : clampN(lay?.board?.cols ?? BOARD_COLS, 12, 48);
  const authored = new Map<string, LayoutItem>((lay?.items || []).map(a => [a.ref, a]));
  // array order of layout.items is reading order: listed pieces first, the rest in their default order
  const order = [
    ...(lay?.items || []).map(a => items.find(i => i.ref === a.ref)).filter((i): i is Item => !!i),
    ...items.filter(i => !authored.has(i.ref)),
  ];

  const cells: Record<string, Cell> = {};
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

  if (narrow) {
    order.forEach(it => {
      const n = authored.get(it.ref)?.narrow;
      if (n && n.col && n.row) put(it, clampN(n.col, 1, 4), n.row, clampN(n.w ?? 4, 1, 5 - clampN(n.col, 1, 4)));
    });
    let cursor = 1, side = 0;
    order.forEach(it => {
      if (cells[it.key]) return;
      const a = authored.get(it.ref);
      const lead = it.ref === "title" || it.ref === "meta" || it.key === hero;
      const span = lead || (a?.w ?? it.cols) >= 6 ? 4 : 3;
      // three-wide pieces alternate between the left and right edge so the stack reads as a column, not a list
      const col = span === 4 ? 1 : side++ % 2 ? 2 : 1;
      const rows = rowsOf(it, span);
      let r = cursor;
      while (!free(col, r, span, rows, 0)) r++;
      put(it, col, r, span);
      cursor = r + rows;
    });
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
    const title = items.find(i => i.ref === "title"), meta = items.find(i => i.ref === "meta"), lead = items.find(i => i.key === hero);
    const settle = (it: Item | undefined, col: number, row: number, span: number) => {
      if (it && !cells[it.key] && free(col, row, span, rowsOf(it, span), 0)) put(it, col, row, span);
    };
    settle(title, 2, 2, title?.cols ?? 6);
    const t = title && cells[title.key];
    if (t) settle(meta, t.col, t.row + t.rows, meta?.cols ?? 5);
    settle(lead, 8, 2, 5);

    // The entry frame is held back from packing, so what reaches past it is always outside it.
    const ec = lay?.entry?.col ?? 1, er = lay?.entry?.row ?? 1;
    mark(reserved, ec, er, 12, ENTRY_ROWS);
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
  const boardCols = narrow ? 4 : lay?.board?.cols ? cols : lastCol + (lastCol > per ? 1 : 0);
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
  return {
    w: narrow ? W : ins.l + boardCols * unit + ins.r,
    h: Math.max(H, ins.t + boardRows * unit + ins.b),
    focus: { x: (ec - 1) * unit + W / 2, y: (er - 1) * unit + H / 2 },
    pos,
  };
}
