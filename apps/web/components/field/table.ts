// Table: setting objects aside, laying them out and binding them into a set.
import type React from "react";
import type Field from "./Field";
import type { State, TableMetrics, Vals, Walk } from "./types";
import { key, rand } from "./util";
import { plate } from "./plate";

// The table is a surface of some real size, and a plate is a real size on
// it. Both are measured, so a set is laid out in as many columns as the
// surface actually has, and nothing is ever set down off the edge of it.
export function tableMetrics(): TableMetrics {
  const surf = document.querySelector<HTMLElement>('[data-role="tablesurface"]');
  const r = surf ? surf.getBoundingClientRect() : null;
  const sw = r && r.width ? r.width : 860, sh = r && r.height ? r.height : 420;
  const cw = Math.min(172, Math.max(132, window.innerWidth * 0.12));
  const ch = Math.min(114, Math.max(88, window.innerWidth * 0.08)) + 75;
  const hx = (cw / 2 / sw) * 100 + 1, hy = (ch / 2 / sh) * 100 + 2;
  const b = {
    xMin: Math.min(50, hx), xMax: Math.max(50, 100 - hx),
    yMin: Math.min(50, hy), yMax: Math.max(50, 100 - hy)
  };
  const px = (cw * 1.14) / sw * 100, py = (ch * 1.06) / sh * 100;
  return {
    b, px, py,
    cols: Math.max(1, Math.floor((b.xMax - b.xMin) / px) + 1),
    rows: Math.max(1, Math.floor((b.yMax - b.yMin) / py) + 1)
  };
}

export function clampTable(f: Field, p: { x: number; y: number }, m?: TableMetrics) {
  const mm = m || f.tableMetrics(), b = mm.b;
  return {
    x: Math.max(b.xMin, Math.min(b.xMax, p.x)),
    y: Math.max(b.yMin, Math.min(b.yMax, p.y))
  };
}

export function tableSlots(f: Field) { const m = f.tableMetrics(); return Math.max(4, m.cols * m.rows); }

export function seedTablePos(f: Field, id: string, n: number) {
  const m = f.tableMetrics(), slot = n % Math.max(1, m.cols * m.rows);
  const col = slot % m.cols, row = Math.floor(slot / m.cols);
  const jx = (rand(id + "tx") - 0.5) * Math.min(5, m.px * 0.2);
  const jy = (rand(id + "ty") - 0.5) * Math.min(5, m.py * 0.2);
  return f.clampTable({ x: m.b.xMin + col * m.px + jx, y: m.b.yMin + row * m.py + jy }, m);
}

// A table holds what fits on it. Past that it is a pile, and a pile is not
// an argument, so the surface refuses rather than stacking things out of sight.
export function toggleAside(f: Field, id: string) {
  const t = f.state.table.slice(), i = t.indexOf(id);
  if (i > -1) {
    t.splice(i, 1);
    f.setState({ table: t, tableNote: null });
    return;
  }
  if (t.length >= f.tableSlots()) {
    if (f.noteTimer) clearTimeout(f.noteTimer);
    f.setState({ tableNote: "the table is full" });
    f.noteTimer = f.later(() => f.setState({ tableNote: null }), 4200);
    return;
  }
  t.push(id);
  if (!f.tablePos[id]) f.tablePos[id] = f.seedTablePos(id, t.length - 1);
  f.setState({ table: t, tableNote: null });
}

// Dragging writes straight to the element and only commits on release, so a
// re-render never fights the hand.
export function tableDown(f: Field, id: string) {
  return (e: any) => {
    const surf = document.querySelector<HTMLElement>('[data-role="tablesurface"]');
    const el = e.currentTarget as HTMLElement;
    if (!surf || !el) return;
    if (e.target && e.target.getAttribute && e.target.getAttribute("role") === "button") return;
    const r = surf.getBoundingClientRect();
    const m = f.tableMetrics();
    const start = f.tablePos[id] || { x: 50, y: 50 };
    const ox = e.clientX, oy = e.clientY;
    let moved = false;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.style.zIndex = "6"; el.style.cursor = "grabbing";
    const move = (ev: PointerEvent) => {
      moved = true;
      const p = f.clampTable({
        x: start.x + ((ev.clientX - ox) / r.width) * 100,
        y: start.y + ((ev.clientY - oy) / r.height) * 100
      }, m);
      f.tablePos[id] = p;
      el.style.left = p.x.toFixed(2) + "%"; el.style.top = p.y.toFixed(2) + "%";
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.style.zIndex = ""; el.style.cursor = "grab";
      if (moved) f.forceUpdate();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
}

// The arrangement is the argument: reading order across the table, in
// bands, becomes the order the set is walked in.
export function bindTable(f: Field) {
  const ids = f.state.table;
  if (!ids.length) return;
  const pos = (id: string) => f.tablePos[id] || { x: 50, y: 50 };
  const band = Math.max(10, f.tableMetrics().py * 0.6);
  const order = ids.slice().sort((a, b) => {
    const pa = pos(a), pb = pos(b);
    const ba = Math.floor(pa.y / band), bb = Math.floor(pb.y / band);
    return ba !== bb ? ba - bb : pa.x - pb.x;
  });
  const name = (f.state.bindName || "").trim() || "A set, bound without a name";
  const layout: Record<string, { x: number; y: number }> = {};
  order.forEach(id => { layout[id] = pos(id); });
  const seeded = ([{ name, steps: order, table: true, layout }] as Walk[]).concat(f.state.seeded);
  const kept = Object.assign({}, f.state.kept);
  f.setState({ seeded, kept, table: [], bindName: "", tableNote: null, tableOpen: false, catalogue: true }, () => f.recomputeWear());
}

export function openFlat(f: Field, w: Walk) {
  return (ev?: any) => {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    f.tablePos = Object.assign({}, f.tablePos, w.layout || {});
    const m = f.tableMetrics();
    (w.steps || []).forEach((id, i) => {
      f.tablePos[id] = f.tablePos[id] ? f.clampTable(f.tablePos[id], m) : f.seedTablePos(id, i);
    });
    f.setState({ table: w.steps.slice(), bindName: w.name, tableOpen: true, catalogue: false });
  };
}

export function tableVals(f: Field, st: State, out: Vals): void {
  out.table = st.tableOpen;
  out.tableLabel = st.table.length ? "TABLE " + String(st.table.length).padStart(2, "0") : "TABLE —";
  out.tableOn = st.table.length > 0;
  out.onTable = () => { f.collapse(); f.setState({ tableOpen: true, plan: false, catalogue: false, compose: null, view: null }); };
  out.onTableKey = key(() => out.onTable());
  out.onCloseTable = () => f.setState({ tableOpen: false });
  out.onCloseTableKey = key(out.onCloseTable);
  out.tableEmpty = st.table.length === 0;
  out.tableHint = st.tableNote
    ? st.tableNote + " · bind it or put something back"
    : st.table.length ? "drag them into relation · reading order becomes the route" : "nothing set aside yet";
  out.tableItems = st.table.map(id => {
    const o = f.byId(id), p = f.tablePos[id] || { x: 50, y: 50 };
    const off = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); f.toggleAside(id); };
    return {
      id, title: o.t, stamp: o.k + (o.y ? " · " + o.y : ""), plate: plate(o),
      x: p.x.toFixed(2) + "%", y: p.y.toFixed(2) + "%",
      down: f.tableDown(id), off, offKey: key(() => off())
    };
  });
  out.bindName = st.bindName;
  out.bindColor = st.table.length ? "var(--field-accent)" : "color-mix(in srgb, var(--field-mist) 35%, transparent)";
  out.onBindName = (e: React.ChangeEvent<HTMLInputElement>) => f.setState({ bindName: e.target.value });
  out.onBind = f.bindTable;
  out.onBindKey = key(() => f.bindTable());
  out.onClearTable = () => f.setState({ table: [], bindName: "", tableNote: null });
  out.onClearTableKey = key(() => f.setState({ table: [], bindName: "", tableNote: null }));
  const asideOn = !!(st.open && st.table.indexOf(st.open) > -1);
  out.asideLabel = st.tableNote ? "the table is full" : asideOn ? "on the table" : "set it aside";
  out.asideColor = st.tableNote ? "var(--field-walk)" : asideOn ? "var(--field-accent)" : "color-mix(in srgb, var(--field-mist) 85%, transparent)";
  out.onAside = () => { if (st.open) f.toggleAside(st.open); };
  out.onAsideKey = key(() => out.onAside());
  out.focusAside = st.tableNote ? "table full" : st.focus ? (st.table.indexOf(st.focus.id) > -1 ? "on the table" : "set aside") : "";
  out.onFocusAside = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (st.focus) f.toggleAside(st.focus.id); };
  out.onFocusAsideKey = key(() => { if (f.state.focus) f.toggleAside(f.state.focus.id); });
}
