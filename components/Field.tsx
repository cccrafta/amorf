'use client';

import React from "react";
import {
  OBJECTS as OBJECTS_DATA,
  ASSOC as ASSOC_DATA,
  NOTE_SEED as NOTE_SEED_DATA,
  SEEDED_WALKS,
  type FieldObject,
  type FieldAssoc,
  type FieldNoteSeed,
} from "@/lib/field-data";
import "@/lib/media/video";
import { liveMedia, rendererFor, type MediaState } from "@/lib/media/registry";
import * as pool from "@/lib/media/pool";

// hx/hz (world position) are assigned at runtime in componentDidMount, not part
// of the data schema in lib/field-data.ts.
type FieldNode = FieldObject & { hx: number; hz: number };

type Walk = {
  name: string;
  steps: string[];
  table?: boolean;
  layout?: Record<string, { x: number; y: number }>;
};

type NoteMark = { d: string; w: string };

type FieldNote = {
  id: string;
  obj: string;
  by: string;
  walk: string | null;
  txt: string;
  kind: string;
  marks: NoteMark[];
  img?: string | null;
  mine?: boolean;
  ink?: string;
};

type PlateSeg = { d: string; st: string; fl: string; w: number; o: string };

type TableMetrics = {
  b: { xMin: number; xMax: number; yMin: number; yMax: number };
  px: number;
  py: number;
  cols: number;
  rows: number;
};

type Props = {
  wearStrength?: number;
  planEdges?: boolean;
  frictionEvery?: number;
  showOthers?: boolean;
  fieldNotes?: boolean;
  inkColor?: string;
};

type State = {
  focus: { id: string; title: string; stamp: string } | null;
  open: string | null;
  trace: { id: string; mark: string; depth: string; note?: boolean }[];
  cursor: number;
  query: string;
  askOpen: boolean;
  narrow: boolean;
  compose: string | null;
  view: string | null;
  noteTxt: string;
  noteRev: number;
  notesOpen: boolean;
  hand: string | null;
  tracksOn: boolean;
  catalogue: boolean;
  filter: string | null;
  hoverJourney: string | null;
  naming: boolean;
  nameValue: string;
  seeded: Walk[];
  joined: string | null;
  plan: boolean;
  planHover: string | null;
  tableOpen: boolean;
  table: string[];
  bindName: string;
  tableNote: string | null;
  kept: Record<string, boolean>;
  jump?: { span: string; years: string; paces: string } | null;
};

// renderVals() returns Record<string, any> by design (it's a JS-shaped view
// model with ~80 keys) — V just spells out that render()'s `v` also carries props.
type V = Props & Record<string, any>;

// One loop owned by the window: hosts throttle rAF and intervals unevenly, and a
// remount can orphan a timer, so a single instance drives whichever Field is live.
declare global {
  interface Window {
    __amorfActive?: Field | null;
    __amorfLoop?: ReturnType<typeof setInterval>;
    __amorfRaf?: number;
    __amorfWatch?: ReturnType<typeof setInterval>;
    __amorfRafSeen?: number;
  }
}

export default class Field extends React.Component<Props, State> {
  OBJECTS: FieldNode[] = OBJECTS_DATA as FieldNode[];
  ASSOC: FieldAssoc[] = ASSOC_DATA;
  NOTE_SEED: FieldNoteSeed[] = NOTE_SEED_DATA;

  TILE = 6200;
  FAR = 2700;
  NEARC = 130;
  P = 900;
  SPREAD_Y = 260;

  state: State = {
    focus: null,
    open: null,
    trace: [],
    cursor: -1,
    query: "",
    askOpen: false,
    narrow: false,
    compose: null,
    view: null,
    noteTxt: "",
    noteRev: 0,
    notesOpen: false,
    hand: null,
    tracksOn: true,
    catalogue: false,
    filter: null,
    hoverJourney: null,
    naming: false,
    nameValue: "",
    seeded: SEEDED_WALKS,
    joined: null,
    plan: false,
    planHover: null,
    tableOpen: false,
    table: [],
    bindName: "",
    tableNote: null,
    kept: {},
  };

  cam = { x: 0, z: 0, tx: 0, tz: 0, yaw: 0, tyaw: 0 };
  els: Record<string, HTMLElement> = {};
  visited: Record<string, boolean> = {};
  screenPos: Record<string, { sx: number; sy: number }> = {};
  navCount = 0;
  lastFriction = true;
  timers: ReturnType<typeof setTimeout>[] = [];
  seenByQuery: Record<string, string[]> = {};
  tablePos: Record<string, { x: number; y: number }> = {};
  visits: Record<string, number> = {};
  wearBase: Record<string, number> = {};
  cloudCache: Record<string, NoteMark[]> = {};
  pointer: { x: number; y: number } | null = null;
  pointerAt = 0;
  pendingMark: string | null = null;
  wantFocus: boolean | null = null;
  NOTES: FieldNote[] = [];
  paperStrokes: { w: number; pts: [number, number][] }[] = [];
  paperW = 1.8;
  paperImg: string | null = null;

  // Lazily assigned in componentDidMount/resolve/frame — declared here so the
  // rest of the port (a straight mechanical read of assignment sites) needs no
  // further type surgery.
  reduced = false;
  onKey?: (e: KeyboardEvent) => void;
  onResize?: () => void;
  resolveTimer: ReturnType<typeof setInterval> | null = null;
  lastT = 0;
  tick!: () => void;
  world: HTMLElement | null = null;
  hudDepth: HTMLElement | null = null;
  hudYaw: HTMLElement | null = null;
  hudGrid: HTMLElement | null = null;
  hint: HTMLElement | null = null;
  input: HTMLInputElement | null = null;
  tracks: SVGSVGElement | null = null;
  stage: HTMLElement | null = null;
  paper: HTMLCanvasElement | null = null;
  paperCtx: CanvasRenderingContext2D | null = null;
  paperFit: (() => void) | null = null;
  drawing: { w: number; pts: [number, number][] } | null = null;
  drag: { id: number; x: number; y: number; moved: number; captured: boolean } | null = null;
  narrow = false;
  lastW = -1;
  hintGone = false;
  hintW: number | undefined = undefined;
  wearRev = 0;
  trackKey: string | null = null;
  trackEls: Record<string, SVGPathElement> | null = null;
  hueMap: Record<string, string> | undefined;
  hueNext = 0;
  filterSet: Set<string> | null = null;
  panelWant = 0;
  panelT = 0;
  sheetT = 0;
  lift = 0;
  liftWant = 0;
  liftDir = -1;
  liftIdleAt = 0;
  committing = false;
  committed = false;
  edgeSince = 0;
  closeQueued = false;
  wheelBlockUntil = 0;
  suppressClick = 0;
  standAt: { x: number; z: number } | null = null;
  lastStandX?: number;
  lastStandZ?: number;
  frameW: Record<string, number> = {};
  keepClear: { l: number; r: number; t: number; b: number; ramp: number }[] = [];
  keepClearRail = 0;
  noteTimer: ReturnType<typeof setTimeout> | null = null;
  jumpTimer: ReturnType<typeof setTimeout> | null = null;
  nodes: any[] | null = null;
  onGesture?: () => void;
  mediaStage: HTMLElement | null = null;
  mediaSlot: HTMLElement | null = null;
  mediaStageKey = "";
  // 0..1 world-distance closeness per object, written by frame() regardless of whether the card is drawn.
  near: Record<string, number> = {};

  rand(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }
  smooth(a: number, b: number, v: number): number {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  wrap(v: number, m: number): number {
    let w = v % m;
    if (w > m / 2) w -= m;
    if (w < -m / 2) w += m;
    return w;
  }
  byId(id: string): FieldNode {
    return this.OBJECTS.find(o => o.id === id) as FieldNode;
  }
  later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    this.timers.push(t);
    return t;
  }

  // Wear is not a score. It is how much of the collection's attention has
  // settled on a thing: the sheets left on it, the routes that go through it,
  // and how often it has been opened. It only ever shows up as material.
  recomputeWear() {
    const kept = this.state.kept || {};
    this.wearBase = {};
    this.OBJECTS.forEach(o => {
      const sheets = this.NOTES.filter(x => x.obj === o.id).length;
      let routes = 0;
      (this.state.seeded || []).forEach(s => { if (s.steps.indexOf(o.id) > -1) routes += kept[s.name] ? 0.2 : 0.11; });
      this.wearBase[o.id] = Math.min(1, sheets * 0.1 + routes + this.rand(o.id + "wear") * 0.26);
    });
    this.wearRev = (this.wearRev || 0) + 1;
    this.cloudCache = {};
    this.trackKey = null;
  }
  wearOf(id: string): number {
    const base = this.wearBase[id] || 0, v = this.visits[id] || 0;
    return Math.max(0, Math.min(1, (base + v * 0.11) * (this.props.wearStrength ?? 1)));
  }
  // The accumulation that hangs around a worn object in the field, before you
  // are close enough to read whose hand any of it is.
  cloudFor(id: string, wr: number) {
    const n = Math.max(0, Math.round(wr * 6));
    const key = id + ":" + n;
    if (!this.cloudCache[key]) this.cloudCache[key] = n ? this.scribble("cloud" + id).slice(0, n) : [];
    return this.cloudCache[key];
  }

  // Plan labels are placed only after the marks are already on the page, worn
  // objects first, and dropped rather than overlapped if they clash — a name
  // under the hand always shows.
  placePlanLabels() {
    const box = document.querySelector<HTMLElement>('[data-role="planbox"]');
    if (!box || !this.state.plan) return;
    const bb = box.getBoundingClientRect();
    const items = Array.from(box.children)
      .filter((n: any) => n.dataset && n.dataset.pid)
      .map((n: any) => ({ n, id: n.dataset.pid as string, mark: n.children[0] as HTMLElement, lab: n.children[1] as HTMLElement, wr: this.wearOf(n.dataset.pid) }))
      .sort((a, b) => (b.id === this.state.planHover ? 9 : b.wr) - (a.id === this.state.planHover ? 9 : a.wr));
    if (!items.length) return;
    const hov = this.state.planHover;
    const placed: DOMRect[] = items.map(it => it.mark.getBoundingClientRect());
    const clash = (r: DOMRect) => placed.some(q => r.left < q.right - 1 && r.right > q.left + 1 && r.top < q.bottom - 1 && r.bottom > q.top + 1);
    items.forEach(it => {
      const half = (5 + it.wr * 13) / 2 + 8;
      const order = it.n.dataset.side === "left" ? ["left", "right"] : ["right", "left"];
      const put = (s: string) => {
        it.lab.style.left = (s === "right" ? half : -half).toFixed(1) + "px";
        it.lab.style.transform = s === "right" ? "translateY(-50%)" : "translate(-100%, -50%)";
        return it.lab.getBoundingClientRect();
      };
      let ok = false;
      if (it.wr >= 0.3 || it.id === hov) {
        for (const s of order) {
          const r = put(s);
          if (r.left < bb.left + 3 || r.right > bb.right - 3) continue;
          if (clash(r)) continue;
          placed.push(r); ok = true; break;
        }
      }
      if (!ok && it.id === hov) put(order[0]);
      it.lab.style.opacity = it.id === hov ? "1" : ok ? "0.78" : "0";
    });
  }

  // The table is a surface of some real size, and a plate is a real size on
  // it. Both are measured, so a set is laid out in as many columns as the
  // surface actually has, and nothing is ever set down off the edge of it.
  tableMetrics(): TableMetrics {
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
  clampTable(p: { x: number; y: number }, m?: TableMetrics) {
    const mm = m || this.tableMetrics(), b = mm.b;
    return {
      x: Math.max(b.xMin, Math.min(b.xMax, p.x)),
      y: Math.max(b.yMin, Math.min(b.yMax, p.y))
    };
  }
  tableSlots() { const m = this.tableMetrics(); return Math.max(4, m.cols * m.rows); }
  seedTablePos(id: string, n: number) {
    const m = this.tableMetrics(), slot = n % Math.max(1, m.cols * m.rows);
    const col = slot % m.cols, row = Math.floor(slot / m.cols);
    const jx = (this.rand(id + "tx") - 0.5) * Math.min(5, m.px * 0.2);
    const jy = (this.rand(id + "ty") - 0.5) * Math.min(5, m.py * 0.2);
    return this.clampTable({ x: m.b.xMin + col * m.px + jx, y: m.b.yMin + row * m.py + jy }, m);
  }

  // A table holds what fits on it. Past that it is a pile, and a pile is not
  // an argument, so the surface refuses rather than stacking things out of sight.
  toggleAside(id: string) {
    const t = this.state.table.slice(), i = t.indexOf(id);
    if (i > -1) {
      t.splice(i, 1);
      this.setState({ table: t, tableNote: null });
      return;
    }
    if (t.length >= this.tableSlots()) {
      if (this.noteTimer) clearTimeout(this.noteTimer);
      this.setState({ tableNote: "the table is full" });
      this.noteTimer = this.later(() => this.setState({ tableNote: null }), 4200);
      return;
    }
    t.push(id);
    if (!this.tablePos[id]) this.tablePos[id] = this.seedTablePos(id, t.length - 1);
    this.setState({ table: t, tableNote: null });
  }

  // Dragging writes straight to the element and only commits on release, so a
  // re-render never fights the hand.
  tableDown(id: string) {
    return (e: any) => {
      const surf = document.querySelector<HTMLElement>('[data-role="tablesurface"]');
      const el = e.currentTarget as HTMLElement;
      if (!surf || !el) return;
      if (e.target && e.target.getAttribute && e.target.getAttribute("role") === "button") return;
      const r = surf.getBoundingClientRect();
      const m = this.tableMetrics();
      const start = this.tablePos[id] || { x: 50, y: 50 };
      const ox = e.clientX, oy = e.clientY;
      let moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.style.zIndex = "6"; el.style.cursor = "grabbing";
      const move = (ev: PointerEvent) => {
        moved = true;
        const p = this.clampTable({
          x: start.x + ((ev.clientX - ox) / r.width) * 100,
          y: start.y + ((ev.clientY - oy) / r.height) * 100
        }, m);
        this.tablePos[id] = p;
        el.style.left = p.x.toFixed(2) + "%"; el.style.top = p.y.toFixed(2) + "%";
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.style.zIndex = ""; el.style.cursor = "grab";
        if (moved) this.forceUpdate();
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
  }

  // The arrangement is the argument: reading order across the table, in
  // bands, becomes the order the set is walked in.
  bindTable = () => {
    const ids = this.state.table;
    if (!ids.length) return;
    const pos = (id: string) => this.tablePos[id] || { x: 50, y: 50 };
    const band = Math.max(10, this.tableMetrics().py * 0.6);
    const order = ids.slice().sort((a, b) => {
      const pa = pos(a), pb = pos(b);
      const ba = Math.floor(pa.y / band), bb = Math.floor(pb.y / band);
      return ba !== bb ? ba - bb : pa.x - pb.x;
    });
    const name = (this.state.bindName || "").trim() || "A set, bound without a name";
    const layout: Record<string, { x: number; y: number }> = {};
    order.forEach(id => { layout[id] = pos(id); });
    const seeded = ([{ name, steps: order, table: true, layout }] as Walk[]).concat(this.state.seeded);
    const kept = Object.assign({}, this.state.kept);
    this.setState({ seeded, kept, table: [], bindName: "", tableNote: null, tableOpen: false, catalogue: true }, () => this.recomputeWear());
  };
  openFlat(w: Walk) {
    return (ev?: any) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      this.tablePos = Object.assign({}, this.tablePos, w.layout || {});
      const m = this.tableMetrics();
      (w.steps || []).forEach((id, i) => {
        this.tablePos[id] = this.tablePos[id] ? this.clampTable(this.tablePos[id], m) : this.seedTablePos(id, i);
      });
      this.setState({ table: w.steps.slice(), bindName: w.name, tableOpen: true, catalogue: false });
    };
  }

  componentDidMount() {
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cols = Math.ceil(Math.sqrt(this.OBJECTS.length));
    const cell = this.TILE / cols;
    const order = this.OBJECTS.map((o, i) => i).sort((a, b) => this.rand(this.OBJECTS[a].id + "o") - this.rand(this.OBJECTS[b].id + "o"));
    order.forEach((oi, slot) => {
      const o = this.OBJECTS[oi];
      const gx = slot % cols, gz = Math.floor(slot / cols);
      o.hx = (gx + 0.5 + (this.rand(o.id + "jx") - 0.5) * 0.5) * cell;
      o.hz = (gz + 0.5 + (this.rand(o.id + "jz") - 0.5) * 0.5) * cell;
    });
    this.NOTES = [];
    this.NOTE_SEED.forEach(s => this.NOTES.push({ id: s.id, obj: s.obj, by: s.by, walk: s.walk, txt: s.txt, kind: "trace", marks: this.scribble("sk" + s.id) }));
    this.OBJECTS.forEach(o => (o.notes || []).forEach((n, i) => this.NOTES.push({
      id: o.id + "w" + i, obj: o.id, by: (n.by || "").replace("annotation · ", ""), walk: null, txt: n.txt, kind: "written", marks: []
    })));
    this.recomputeWear();
    this.onKey = (e: KeyboardEvent) => this.keydown(e);
    window.addEventListener("keydown", this.onKey);
    // Browsers grant unmuted playback only after a gesture; the first one unlocks every live element.
    this.onGesture = () => { this.dropGesture(); pool.unlockAll(); };
    window.addEventListener("pointerdown", this.onGesture, true);
    window.addEventListener("keydown", this.onGesture, true);
    this.onResize = () => {
      this.lastW = -1; this.layout(); this.tick();
      if (this.paperFit) this.paperFit();
      if (this.state.plan) this.placePlanLabels();
      if (this.state.table.length) {
        const m = this.tableMetrics();
        this.state.table.forEach(id => { if (this.tablePos[id]) this.tablePos[id] = this.clampTable(this.tablePos[id], m); });
        if (this.state.tableOpen) this.forceUpdate();
      }
    };
    window.addEventListener("resize", this.onResize);
    this.resolve();
    this.resolveTimer = setInterval(() => this.resolve(), 250);
    this.lastT = performance.now();
    this.tick = () => { try { this.frame(); } catch (err) {} };
    window.__amorfActive = this;
    this.startLoop();
    this.tick();
    this.forceUpdate();
  }

  // Hosts throttle rAF and intervals unevenly, and a remount can orphan a
  // timer. One loop owned by the window, always driving whichever instance is
  // live, plus a watchdog that restarts it if frames stop arriving.
  startLoop() {
    if (window.__amorfLoop) clearInterval(window.__amorfLoop);
    if (window.__amorfRaf) cancelAnimationFrame(window.__amorfRaf);
    if (window.__amorfWatch) clearInterval(window.__amorfWatch);
    const drive = () => { const A = window.__amorfActive; if (A && A.tick) A.tick(); };
    const rafTick = () => { window.__amorfRafSeen = performance.now(); drive(); window.__amorfRaf = requestAnimationFrame(rafTick); };
    window.__amorfRaf = requestAnimationFrame(rafTick);
    window.__amorfLoop = setInterval(() => { if (performance.now() - (window.__amorfRafSeen || 0) > 24) drive(); }, 1000 / 60);
    window.__amorfWatch = setInterval(() => {
      const A = window.__amorfActive;
      if (A && A.lastT && performance.now() - A.lastT > 500) A.startLoop();
    }, 500);
  }

  componentDidUpdate() {
    window.__amorfActive = this;
    if (this.state.filter && !this.filterSet) {
      const w = this.state.seeded.find(s => s.name === this.state.filter);
      this.filterSet = w ? new Set(w.steps) : null;
    }
    this.resolve(); this.lastW = -1; this.layout(); this.tick();
    if (this.state.plan) this.placePlanLabels();
  }

  dropGesture() {
    if (!this.onGesture) return;
    window.removeEventListener("pointerdown", this.onGesture, true);
    window.removeEventListener("keydown", this.onGesture, true);
    this.onGesture = undefined;
  }

  componentWillUnmount() {
    if (this.resolveTimer) clearInterval(this.resolveTimer);
    if (window.__amorfActive === this) {
      window.__amorfActive = null;
      if (window.__amorfLoop) clearInterval(window.__amorfLoop);
      if (window.__amorfWatch) clearInterval(window.__amorfWatch);
      if (window.__amorfRaf) cancelAnimationFrame(window.__amorfRaf);
    }
    this.timers.forEach(clearTimeout);
    if (this.onKey) window.removeEventListener("keydown", this.onKey);
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    this.dropGesture();
    pool.releaseAll();
  }

  resolve() {
    const q = (r: string) => document.querySelector<HTMLElement>('[data-role="' + r + '"]');
    this.world = this.world || q("world");
    this.hudDepth = this.hudDepth || q("hud-depth");
    this.hudYaw = this.hudYaw || q("hud-yaw");
    this.hudGrid = this.hudGrid || q("hud-grid");
    this.hint = this.hint || q("hint");
    this.input = this.input || (q("ask") as HTMLInputElement | null);
    if (this.input && this.wantFocus) { this.wantFocus = false; this.input.focus(); }

    const scroller = document.querySelector<HTMLElement>('[data-role="pagescroll"]');
    if (scroller && (scroller as any).__amorfBound !== this) {
      (scroller as any).__amorfBound = this;
      scroller.addEventListener("wheel", (e: WheelEvent) => {
        const dxRaw = e.shiftKey ? e.deltaY : e.deltaX;
        if (Math.abs(dxRaw) <= Math.abs(e.deltaY) && !e.shiftKey) { this.liftIdleAt = performance.now(); return; }
        if (!dxRaw) return;
        e.preventDefault();
        const now = performance.now();
        this.liftDir = dxRaw > 0 ? -1 : 1;
        this.liftWant = Math.min(1, (this.liftWant || 0) + Math.abs(dxRaw) * 0.0024);
        this.liftIdleAt = now;
        if (this.liftWant >= 0.55) { this.committing = true; this.liftWant = 1; }
        this.tick();
      }, { passive: false });

      let sw: { x: number; y: number; lock: string | null } | null = null;
      scroller.addEventListener("touchstart", (e: TouchEvent) => {
        sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: null };
      }, { passive: true });
      scroller.addEventListener("touchmove", (e: TouchEvent) => {
        if (!sw) return;
        const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
        if (!sw.lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) sw.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (sw.lock !== "x") return;
        if (e.cancelable) e.preventDefault();
        this.liftDir = dx > 0 ? 1 : -1;
        this.liftWant = Math.min(1, Math.abs(dx) / (window.innerWidth * 0.38));
        this.liftIdleAt = performance.now() + 400;
        this.tick();
      }, { passive: false });
      scroller.addEventListener("touchend", () => {
        if (sw && sw.lock === "x") {
          if ((this.liftWant || 0) >= 0.5) { this.committing = true; this.liftWant = 1; }
          else { this.liftWant = 0; this.liftIdleAt = performance.now() - 1000; }
          this.tick();
        }
        sw = null;
      }, { passive: true });
    }

    this.tracks = this.tracks || (q("tracks") as unknown as SVGSVGElement | null);
    const paper = q("paper") as HTMLCanvasElement | null;
    if (paper && (paper as any).__amorfPaper !== this) { (paper as any).__amorfPaper = this; this.bindPaper(paper); }
    if (!paper) { this.paper = null; this.paperCtx = null; this.paperFit = null; }
    const stage = q("stage");
    if (stage && (stage !== this.stage || (stage as any).__amorfOwner !== this)) { this.stage = stage; (stage as any).__amorfOwner = this; this.bindStage(stage); }

    let n = 0;
    document.querySelectorAll<HTMLElement>("[data-obj]").forEach(el => {
      const id = el.getAttribute("data-obj");
      if (id && id.charAt(0) === "o") { this.els[id] = el; n++; }
    });
    if (n >= this.OBJECTS.length && this.world && this.stage && this.resolveTimer) { clearInterval(this.resolveTimer); this.resolveTimer = null; }
  }

  used() { if (!this.hintGone) this.hintGone = true; }

  // Travel along the heading you are pointing at, not the one the easing has
  // caught up to, so a turn-then-scroll goes where you just aimed.
  forward(dist: number) {
    const a = (this.cam.tyaw * Math.PI) / 180;
    this.cam.tx += Math.sin(a) * dist;
    this.cam.tz -= Math.cos(a) * dist;
  }

  // One binding per element: a hot reload keeps the DOM but makes a new logic
  // instance, and re-binding would multiply every scroll and drag.
  bindStage(el: HTMLElement) {
    if ((el as any).__amorfAbort) (el as any).__amorfAbort.abort();
    const ac = new AbortController();
    (el as any).__amorfAbort = ac;
    const sig = { signal: ac.signal };

    el.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault(); this.used();
      // swallow trackpad momentum for a beat after a close, so the tail of a
      // dismiss gesture doesn't get read as a new pan
      if (performance.now() < (this.wheelBlockUntil || 0)) { this.wheelBlockUntil = performance.now() + 160; return; }
      const lateral = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const dx = lateral ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      const dy = (lateral || e.shiftKey) ? 0 : e.deltaY;
      this.forward(-dy * 1.9);
      this.cam.tyaw += dx * 0.085;
      this.tick();
    }, { passive: false, signal: ac.signal });

    el.addEventListener("pointermove", (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      this.pointerAt = performance.now();
      if (this.drag && e.pointerId === this.drag.id) {
        if (e.buttons === 0 && e.pointerType === "mouse") { this.drag = null; this.tick(); return; }
        if (!this.drag.captured && this.drag.moved > 6) {
          this.drag.captured = true;
          try { if (el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (err) {}
        }
        const mdx = e.clientX - this.drag.x, mdy = e.clientY - this.drag.y;
        this.cam.tyaw += mdx * -0.14;
        if (e.pointerType !== "mouse") this.forward(mdy * -5.2);
        this.drag.moved += Math.abs(mdx) + Math.abs(mdy);
        this.drag.x = e.clientX; this.drag.y = e.clientY;
        this.used();
      }
      this.tick();
    }, sig);
    el.addEventListener("pointerdown", (e: PointerEvent) => { this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, captured: false }; }, sig);
    el.addEventListener("pointercancel", () => { this.drag = null; }, sig);
    el.addEventListener("pointerup", (e: PointerEvent) => {
      const d = this.drag; this.drag = null;
      if (d && d.moved > 8) { this.suppressClick = performance.now(); return; }
      if (e.pointerType !== "mouse") {
        const r = el.getBoundingClientRect();
        this.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        this.pointerAt = performance.now();
        this.tick();
      }
      if (e.target && (e.target as HTMLElement).closest && (e.target as HTMLElement).closest("[data-obj]")) return;
      const fx = this.state.focus;
      if (fx && fx.id !== this.state.open && !this.state.naming) this.open(fx.id, "◉");
    }, sig);
    el.addEventListener("pointerleave", () => { this.drag = null; this.pointer = null; }, sig);

    let touch: any = null;
    el.addEventListener("touchstart", () => { this.used(); }, { passive: true, signal: ac.signal });
    el.addEventListener("touchmove", (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); }, { passive: false, signal: ac.signal });
    el.addEventListener("touchend", () => { touch = null; }, sig);
  }

  keydown(e: KeyboardEvent) {
    if (this.state.plan) { if (e.key === "Escape") this.setState({ plan: false }); return; }
    if (this.state.tableOpen) { if (e.key === "Escape" && !(document.activeElement && document.activeElement.tagName === "INPUT")) this.setState({ tableOpen: false }); return; }
    if (this.state.catalogue) { if (e.key === "Escape") this.setState({ catalogue: false }); return; }
    if (this.state.compose || this.state.view) {
      if (e.key === "Escape") { this.paperStrokes = []; this.paperImg = null; this.setState({ compose: null, view: null, noteTxt: "" }); }
      return;
    }
    if (this.state.naming) return;
    const ae = document.activeElement as HTMLElement | null, typing = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"));
    if (e.key === "Escape") {
      if (typing) { ae!.blur(); this.setState({ askOpen: false }); return; }
      if (this.state.open) { this.liftDir = -1; this.committing = true; this.liftWant = 1; this.tick(); e.preventDefault(); }
      return;
    }
    if (typing) return;
    if (this.state.open) return;
    const step = e.shiftKey ? 900 : 340;
    if (e.key === "ArrowUp") { this.forward(step); this.used(); this.tick(); e.preventDefault(); return; }
    if (e.key === "ArrowDown") { this.forward(-step); this.used(); this.tick(); e.preventDefault(); return; }
    if (e.key === "ArrowLeft") { this.cam.tyaw -= 9; this.used(); this.tick(); e.preventDefault(); return; }
    if (e.key === "ArrowRight") { this.cam.tyaw += 9; this.used(); this.tick(); e.preventDefault(); return; }
    if (e.key === "Enter") {
      const fx = this.state.focus;
      if (fx && fx.id !== this.state.open) { this.open(fx.id, "◉"); e.preventDefault(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 && /\S/.test(e.key)) {
      this.wantFocus = true;
      this.setState({ askOpen: true, query: this.state.query + e.key });
      e.preventDefault();
    }
  }

  // One layout pass for narrow screens: the instruments are repositioned
  // rather than restyled, so the field keeps the whole viewport on a phone.
  layout() {
    const w = window.innerWidth, narrow = w < 760;
    if (this.narrow === narrow && this.lastW === w) return;
    this.narrow = narrow; this.lastW = w;
    const set = (sel: string, styles: Record<string, string>) => { const el = document.querySelector<HTMLElement>(sel); if (el) Object.assign(el.style, styles); };

    const rail = document.querySelector<HTMLElement>('[data-keepclear="40"]');
    if (rail) {
      Object.assign(rail.style, narrow
        ? { top: "auto", right: "0", bottom: "0", width: "auto", height: "74px", flexDirection: "row", alignItems: "stretch", borderRight: "none", borderTop: "1px solid rgba(168,176,173,0.14)" }
        : { top: "0", right: "", bottom: "0", width: "clamp(78px, 8vw, 112px)", height: "", flexDirection: "column", alignItems: "", borderRight: "1px solid rgba(168,176,173,0.14)", borderTop: "none" });
      const kids = rail.children;
      const head = kids[0] as HTMLElement, list = kids[1] as HTMLElement, tally = kids[2] as HTMLElement, leave = kids[3] as HTMLElement;
      if (head) head.style.display = narrow ? "none" : "block";
      if (list) Object.assign(list.style, narrow
        ? { flexDirection: "row", alignItems: "center", overflowX: "auto", overflowY: "hidden", padding: "0 12px", gap: "18px" }
        : { flexDirection: "column", alignItems: "", overflowX: "", overflowY: "auto", padding: "4px 10px 10px", gap: "8px" });
      if (tally) Object.assign(tally.style, narrow
        ? { display: "flex", alignItems: "center", flex: "0 0 auto", maxWidth: "116px", padding: "0 10px", borderLeft: "1px solid rgba(168,176,173,0.14)" }
        : { display: "block", flex: "", maxWidth: "", padding: "10px 10px 0", borderLeft: "none" });
      if (leave) Object.assign(leave.style, narrow
        ? { display: "flex", alignItems: "center", flex: "0 0 auto", padding: "0 14px", borderTop: "none", borderLeft: "1px solid rgba(168,176,173,0.14)" }
        : { display: "block", flex: "", padding: "12px 10px 18px", borderTop: "1px solid rgba(168,176,173,0.14)", borderLeft: "none" });
    }

    const railOn = this.state.trace.length > 0;
    const railW = rail && !narrow ? rail.getBoundingClientRect().width : 0;
    set('[data-role="journeybar"]', {
      left: (narrow ? 14 : (railOn ? railW + 22 : 24)) + "px",
      top: narrow ? "14px" : "22px",
      maxWidth: narrow ? "calc(100vw - 28px)" : "min(52vw, 520px)"
    });

    const bottomGap = narrow ? (this.state.trace.length ? 92 : 26) : 30;
    set('[data-role="focusbar"]', { bottom: bottomGap + "px" });
    const fb = document.querySelector<HTMLElement>('[data-role="focusbar"]');
    if (fb) {
      const oth = document.querySelector<HTMLElement>('[data-role="others"]');
      const ob = (oth && !narrow && getComputedStyle(oth).display !== "none") ? oth.getBoundingClientRect() : null;
      const bw = fb.getBoundingClientRect().width;
      const limit = ob ? ob.left - 18 : w;
      const floor = (railOn && !narrow ? railW : 0) + 16;
      if (bw && w / 2 + bw / 2 > limit) {
        Object.assign(fb.style, { left: Math.max(floor, Math.min(limit - bw, w - bw - 16)).toFixed(0) + "px", transform: "none" });
      } else {
        Object.assign(fb.style, { left: "50%", transform: "translateX(-50%)" });
      }
    }
    set('[data-role="hint"]', { bottom: (narrow ? bottomGap + 46 : 8) + "px", padding: narrow ? "0 18px" : "0" });
    set('[data-role="others"]', { display: narrow ? "none" : "flex" });
    set('[data-role="hud"]', { top: narrow ? "14px" : "22px", right: narrow ? "14px" : "24px" });
    set('[data-role="jump"]', { top: narrow ? "96px" : "112px", right: narrow ? "14px" : "24px" });

    const hint = document.querySelector<HTMLElement>('[data-role="hint"]');
    if (hint) {
      const t = narrow ? "drag to walk and turn · tap to open" : "scroll to move · drag or sideways to turn · click or enter to open";
      if (hint.textContent !== t) hint.textContent = t;
    }
    if (this.state.narrow !== narrow) this.setState({ narrow });
  }

  // Runs every frame, possibly several times: pool.apply and the stage write are both diffed.
  syncMedia() {
    const openId = this.state.open;
    if (!this.mediaStage?.isConnected) this.mediaStage = document.querySelector<HTMLElement>('[data-role="mediastage"]');
    if (!this.mediaSlot?.isConnected) this.mediaSlot = document.querySelector<HTMLElement>('[data-part="slot"]');
    let openLive = false;
    for (const o of this.OBJECTS) {
      const m = liveMedia(o);
      if (!m) continue;
      const isOpen = openId === o.id;
      const near = this.near[o.id] || 0;
      // Live while drawn on screen or within hearing range; a far but visible card plays near-silent.
      const seen = this.els[o.id]?.style.visibility === "visible";
      const state: MediaState = isOpen ? "open" : near > 0 || seen ? "near" : "thumb";
      pool.ensure(o.id, m.item);
      pool.place(o.id, isOpen ? this.mediaSlot : this.els[o.id]?.querySelector<HTMLElement>('[data-part="media"]') ?? null);
      pool.apply(o.id, state);
      pool.level(o.id, isOpen ? 1 : near);
      if (isOpen) openLive = true;
    }
    const ms = this.mediaStage;
    if (!ms) return;
    // sheetT rather than panelT, so the stage also gives way during the sideways lift-to-dismiss.
    const on = openLive && this.sheetT > 0.02;
    const key = on ? this.sheetT.toFixed(3) : "off";
    if (this.mediaStageKey === key) return;
    this.mediaStageKey = key;
    ms.style.opacity = on ? key : "0";
    ms.style.visibility = on ? "visible" : "hidden";
  }

  frame() {
    const now = performance.now();
    const dt = Math.min(400, Math.max(1, now - (this.lastT || now)));
    this.lastT = now;
    const cam = this.cam;
    const kp = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 200));
    const ky = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 130));
    cam.x += (cam.tx - cam.x) * kp;
    cam.z += (cam.tz - cam.z) * kp;
    cam.yaw += (cam.tyaw - cam.yaw) * ky;

    const wantPanel = this.panelWant || 0;
    this.panelT = (this.panelT || 0) + (wantPanel - (this.panelT || 0)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 150)));
    if (this.panelT < 0.02 && !wantPanel) {
      this.panelT = 0;
      // one-shot: without closeQueued this would re-arm the close every frame
      // the panel sits at rest, firing setState in a tight loop
      if (this.state.open && !this.closeQueued) {
        this.lift = 0; this.liftWant = 0; this.committed = false; this.committing = false; this.edgeSince = 0;
        this.wheelBlockUntil = performance.now() + 420;
        this.closeQueued = true;
        this.setState({ open: null }, () => { this.closeQueued = false; });
      }
    }
    const pT = this.panelT;
    const panel = pT > 0 ? document.querySelector<HTMLElement>('[data-role="detail"]') : null;

    if (this.liftIdleAt && performance.now() - this.liftIdleAt > 150 && !this.committing && !this.committed) this.liftWant = 0;
    this.lift = (this.lift || 0) + ((this.liftWant || 0) - (this.lift || 0)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 110)));
    if (this.committing && this.lift > 0.9) { this.committing = false; this.committed = true; this.panelWant = 0; }
    if (this.committed) { this.liftWant = 1; this.lift = Math.max(this.lift, 1); }
    const lift = Math.min(1, this.lift || 0);
    const give = Math.max(0, (lift - 0.4) / 0.6);
    const liftVis = Math.min(1, Math.pow(give, 1.5));
    // the panel resists, then releases quickly past the give point, so a
    // dismiss reads as a decision rather than a drag reaching a wall
    const sheetT = pT * (1 - liftVis * 0.92);
    this.sheetT = sheetT;
    if (panel) {
      const pg = panel.querySelector<HTMLElement>('[data-role="page"]');
      if (pg) {
        const dir = this.liftDir || -1;
        const enter = this.committed ? 0 : (1 - pT) * (1 - liftVis);
        const slide = liftVis * 34 * dir;
        const swing = liftVis * 16 * dir;
        const shrink = 1 - (1 - pT) * 0.06 - liftVis * 0.1;
        const origin = (liftVis > 0.01 || this.committed) ? (dir < 0 ? "0% 50%" : "100% 50%") : "50% 100%";
        if (pg.style.transformOrigin !== origin) pg.style.transformOrigin = origin;
        pg.style.transform = "translate(" + slide.toFixed(2) + "%, " + (enter * 16).toFixed(2) + "%) rotateX(" + (-enter * 11).toFixed(2) + "deg) rotateY(" + swing.toFixed(2) + "deg) scale(" + shrink.toFixed(3) + ")";
        pg.style.opacity = Math.min(1, pT * 1.3 * (1 - liftVis * 0.85)).toFixed(3);
      }
      const bar = panel.querySelector<HTMLElement>('[data-role="liftbar"]');
      if (bar) bar.style.width = Math.min(100, (lift / 0.5) * 100).toFixed(1) + "%";
      const hint = panel.querySelector<HTMLElement>('[data-role="lifthint"]');
      if (hint) { const t = lift > 0.06 ? "letting it go" : (this.narrow ? "swipe sideways to put it back" : "scroll sideways to put it back"); if (hint.textContent !== t) hint.textContent = t; }
    }

    const fade = 1 - sheetT;
    this.hintW = (this.hintW === undefined ? 1 : this.hintW) + ((this.hintGone ? 0 : 1) - (this.hintW === undefined ? 1 : this.hintW)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 400)));
    document.querySelectorAll<HTMLElement>('[data-plane-ui]').forEach(el => {
      const isHint = el.getAttribute("data-role") === "hint";
      el.style.opacity = (fade * (isHint ? this.hintW! : 1)).toFixed(3);
      el.style.pointerEvents = sheetT > 0.4 ? "none" : "auto";
    });
    // Objects are positioned in camera-frame coordinates below, so the world
    // layer must stay at identity — rotating it too would apply the yaw twice.
    if (this.world && this.world.style.transform !== "none") this.world.style.transform = "none";

    const rad = (cam.yaw * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const W = window.innerWidth, H = window.innerHeight;

    const kf = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 170));
    if (!this.frameW) this.frameW = {};
    const shift = 0;
    const target = (this.pointer && now - this.pointerAt < 2600) ? this.pointer : { x: W / 2, y: H * 0.46 };
    const detail = !!this.state.open;

    this.keepClear = [];
    this.keepClearRail = 0;
    document.querySelectorAll<HTMLElement>("[data-keepclear]").forEach(p => {
      const b = p.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (parseFloat(getComputedStyle(p).opacity) < 0.06) return;
      if (b.left <= 1 && b.height > window.innerHeight * 0.6) this.keepClearRail = b.width;
      this.keepClear.push({ l: b.left, r: b.right, t: b.top, b: b.bottom, ramp: parseFloat(p.getAttribute("data-keepclear") || "") || 30 });
    });

    const fset = this.state.filter ? this.filterSet : null;
    let best: FieldNode | null = null, bestD = 1e9;
    for (const o of this.OBJECTS) {
      this.near[o.id] = 0;
      const el = this.els[o.id]; if (!el) continue;
      if (fset && !fset.has(o.id)) { el.style.visibility = "hidden"; continue; }
      const dx = this.wrap(o.hx - cam.x, this.TILE);
      const dz = this.wrap(o.hz - cam.z, this.TILE);
      // Measured before the culling below, so something just behind the camera is still heard.
      this.near[o.id] = this.smooth(this.FAR * 0.6, 300, Math.hypot(dx, dz));
      const tileX = Math.round((o.hx - cam.x - dx) / this.TILE);
      const tileZ = Math.round((o.hz - cam.z - dz) / this.TILE);
      const seed = o.id + ":" + tileX + ":" + tileZ;
      const dy = (this.rand(seed + "y") - 0.5) * 2 * this.SPREAD_Y;
      const tilt = (this.rand(seed + "t") - 0.5) * 30;

      const lx = dx * cs + dz * sn;
      const lzRaw = -dx * sn + dz * cs;
      const wr = this.wearOf(o.id);
      // attention is a kind of gravity: a worn thing stands closer than its
      // coordinate says, without ever leaving its place in the field
      const pull = Math.max(0, Math.min(wr * 340, -lzRaw - this.NEARC - 60));
      const lz = lzRaw + pull;
      const d = -lz;
      const wantW = 0;
      const w = this.frameW[o.id] = (this.frameW[o.id] || 0) + (wantW - (this.frameW[o.id] || 0)) * kf;
      const framed = w > 0.02;
      if (d < this.NEARC || (d > this.FAR && !framed) || d > this.FAR * 1.4) { el.style.visibility = "hidden"; continue; }

      const arrive = this.smooth(this.FAR, this.FAR * 0.45, d);
      let pass = this.smooth(this.NEARC, 300, d);
      if (framed) pass = Math.max(pass, 0.28 + 0.72 * w);
      const farFade = this.smooth(this.FAR * 1.35, this.FAR * 0.95, d);
      const op = Math.min(1, (0.36 + 0.64 * arrive) * (1 + wr * 0.24)) * pass * farFade * (1 - 0.55 * sheetT);
      if (op < 0.03) { el.style.visibility = "hidden"; continue; }

      const scale = this.P / (this.P - lz);
      let useLx = lx, useDy = dy, shiftUse = shift;
      if (framed) {
        const freeL = (this.keepClearRail || 0) + 12;
        const freeR = (panel ? panel.getBoundingClientRect().left : W) - 20;
        const tCx = (freeL + freeR) / 2, tCy = H * 0.5;
        const lxT = (tCx - W / 2) / scale, dyT = (tCy - H * 0.46) / scale;
        useLx = lx + (lxT - lx) * w;
        useDy = dy + (dyT - dy) * w;
        shiftUse = shift * (1 - w);
      }
      const sx = W / 2 + shiftUse + useLx * scale, sy = H * 0.46 + useDy * scale;
      if (sx < -600 || sx > W + 600) { el.style.visibility = "hidden"; continue; }

      const spared = framed || (this.state.focus && this.state.focus.id === o.id);
      let clear = 1;
      if (this.keepClear && this.keepClear.length && !spared) {
        const cw = 410 * scale, ch = 350 * scale;
        const l = sx - cw / 2, r2 = sx + cw / 2, t = sy - ch / 2, b2 = sy + ch / 2;
        for (const z of this.keepClear) {
          const gapX = Math.max(z.l - r2, l - z.r, 0);
          const gapY = Math.max(z.t - b2, t - z.b, 0);
          const gap = Math.max(gapX, gapY);
          if (gap >= z.ramp) continue;
          clear = Math.min(clear, 0.06 + 0.94 * (gap / z.ramp));
        }
      }

      el.style.visibility = "visible";
      el.style.opacity = (op * clear).toFixed(3);
      el.style.pointerEvents = op > 0.45 ? "auto" : "none";
      el.style.filter = this.reduced ? "none" : `blur(${((1 - arrive) * 1.4 + sheetT * 13).toFixed(2)}px)`;
      el.style.transform = `translate3d(${(useLx + shiftUse / Math.max(0.001, scale)).toFixed(1)}px, ${useDy.toFixed(1)}px, ${lz.toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg) translate(-50%, -50%)`;
      this.screenPos[o.id] = { sx, sy };

      // focus is decided by geometry, not by the panel fade — otherwise a
      // card dimmed behind a panel could never become the focused one
      if (op > 0.4) {
        const dist = Math.hypot(sx - target.x, sy - target.y);
        if (dist < 300 && dist < bestD) { bestD = dist; best = o; }
      }
    }

    // traces are drawn, sheet by sheet and line by line, once the object
    // comes into focus, so a per-mark delay stagger reads as ink settling
    for (const o of this.OBJECTS) {
      const el = this.els[o.id]; if (!el || el.style.visibility === "hidden") continue;
      const on = !!(best && best.id === o.id);
      const wr = this.wearOf(o.id);
      const cloud = el.querySelector<HTMLElement>('[data-part="cloud"]');
      if (cloud) { const co = (wr * 0.4).toFixed(3); if (cloud.dataset.o !== co) { cloud.style.opacity = co; cloud.dataset.o = co; } }
      const plate = el.firstElementChild as HTMLElement | null, title = el.children[2] as HTMLElement, cue = el.querySelector<HTMLElement>('[data-part="cue"]');
      const border = on ? "#6E9A8D" : (this.visited[o.id] ? "rgba(110,154,141," + (0.4 + wr * 0.35).toFixed(2) + ")" : "rgba(168,176,173," + (0.45 + wr * 0.35).toFixed(2) + ")");
      const bkey = border + ":" + (on ? 1 : 0);
      if (plate && plate.dataset.b !== bkey) {
        plate.style.borderColor = border;
        plate.style.boxShadow = on ? "0 0 0 1px rgba(110,154,141,0.5), 0 0 34px rgba(110,154,141,0.16)" : (wr > 0.45 ? "0 0 30px rgba(228,223,210," + ((wr - 0.45) * 0.16).toFixed(3) + ")" : "none");
        plate.style.background = on ? "rgba(110,154,141,0.07)" : "rgba(228,223,210," + (0.05 + wr * 0.05).toFixed(3) + ")";
        plate.dataset.b = bkey;
      }
      const tc = on ? "#6E9A8D" : "#E4DFD2";
      if (title && title.dataset.c !== tc) { title.style.color = tc; title.dataset.c = tc; }
      const cueOp = on ? "1" : "0";
      if (cue && cue.dataset.o !== cueOp) { cue.style.opacity = cueOp; cue.dataset.o = cueOp; }
      const mkState = on ? "1" : "0";
      if (el.dataset.mk !== mkState) {
        el.dataset.mk = mkState;
        el.querySelectorAll<HTMLElement>('[data-part="mark"]').forEach((mk, mi) => {
          const hold = this.reduced ? 0 : mi * 240;
          mk.style.transition = "opacity 500ms ease";
          mk.style.transitionDelay = (on ? hold : 0) + "ms";
          mk.style.opacity = on ? (mk.dataset.op || "0.8") : "0";
          mk.querySelectorAll<SVGPathElement>("path").forEach((p, pi) => {
            p.style.transition = "none";
            p.style.strokeDashoffset = "1";
            if (!on) return;
            if (this.reduced) { p.style.strokeDashoffset = "0"; return; }
            p.getBoundingClientRect(); // flush, so the dash reset above lands before the transition below starts
            p.style.transition = "stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1)";
            p.style.transitionDelay = (hold + pi * 260) + "ms";
            p.style.strokeDashoffset = "0";
          });
        });
      }
    }

    const fid = best ? best.id : null;
    if ((this.state.focus && this.state.focus.id) !== fid) {
      this.setState({ focus: best ? { id: best.id, title: best.t, stamp: best.k + (best.y ? " · " + best.y : "") } : null });
    }
    this.syncMedia();

    const dragging = !!(this.drag && this.drag.moved > 6);
    const live = this.pointer && now - this.pointerAt < 2600;
    void live;
    const sheetUp = sheetT > 0.4;
    const overSheet = sheetUp;
    const mode = overSheet ? "read" : dragging ? "turning" : best ? "open" : "look";
    if (this.stage && this.stage.dataset.mode !== mode) {
      this.stage.style.cursor = mode === "read" ? "default" : mode === "turning" ? "grabbing" : mode === "open" ? "pointer" : "grab";
      this.stage.dataset.mode = mode;
    }

    this.paintTracks(sheetT);

    if (this.state.plan) {
      const you = document.querySelector<HTMLElement>('[data-role="planyou"]');
      if (you) {
        const gx = ((((cam.x % this.TILE) + this.TILE) % this.TILE) / this.TILE * 100).toFixed(2);
        const gz = ((((cam.z % this.TILE) + this.TILE) % this.TILE) / this.TILE * 100).toFixed(2);
        you.style.left = gx + "%"; you.style.top = gz + "%";
        you.style.transform = "rotate(" + cam.yaw.toFixed(1) + "deg)";
      }
    }
    if (this.hudDepth) this.hudDepth.textContent = "DEPTH " + String(Math.round(Math.hypot(cam.x, cam.z))).padStart(5, "0");
    if (this.hudYaw) { const y = ((Math.round(cam.yaw) % 360) + 360) % 360; this.hudYaw.textContent = "BEARING " + String(y).padStart(3, "0"); }
    if (this.hudGrid) {
      const gx = Math.round(((cam.x % this.TILE) + this.TILE) % this.TILE);
      const gz = Math.round(((cam.z % this.TILE) + this.TILE) % this.TILE);
      this.hudGrid.textContent = "E" + String(gx).padStart(4, "0") + " N" + String(gz).padStart(4, "0");
    }
  }

  TRACK_HUES = ["#6E9A8D", "#A88A6A", "#7E8FB0", "#A17C93", "#8E9E6B"];
  // One hue per walk, handed out in order and kept, so two routes never read
  // as the same person.
  walkColor(name: string): string {
    if (!this.hueMap) { this.hueMap = {}; this.hueNext = 0; }
    if (!this.hueMap[name]) { this.hueMap[name] = this.TRACK_HUES[this.hueNext % this.TRACK_HUES.length]; this.hueNext += 1; }
    return this.hueMap[name];
  }

  FLOOR = 480;
  NEARZ = 30;
  BAND = 1500;

  camPt(wx: number, wz: number) {
    const cam = this.cam, rad = (cam.yaw * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const dx = wx - cam.x, dz = wz - cam.z;
    return { lx: dx * cs + dz * sn, lz: -dx * sn + dz * cs };
  }
  screenPt(p: { lx: number; lz: number }, height: number) {
    const scale = this.P / (this.P - p.lz);
    return { x: window.innerWidth / 2 + p.lx * scale, y: window.innerHeight * 0.46 + height * scale, scale };
  }
  // Coordinates are fixed, not chosen per frame. The field repeats, so each
  // repetition is treated as its own set of real coordinates and drawn in place.
  instance(o: FieldNode, ox: number, oz: number) {
    const tileX = Math.round(-ox / this.TILE), tileZ = Math.round(-oz / this.TILE);
    const dy = (this.rand(o.id + ":" + tileX + ":" + tileZ + "y") - 0.5) * 2 * this.SPREAD_Y;
    return { id: o.id, wx: o.hx + ox, wz: o.hz + oz, dy };
  }

  BANDS = [700, 1500, 2800, 5000, 9000, 1e9];
  BAND_OP = [1, 0.74, 0.5, 0.3, 0.16, 0.07];

  // The routes are not drawn between the plates. They are drawn on the floor,
  // and depth is the only thing that takes a line away: each route is cut into
  // short pieces and every piece is drawn at the strength its distance earns,
  // so a track thins toward the vanishing point instead of switching off.
  paintTracks(fade: number) {
    const svg = this.tracks; if (!svg) return;
    this.FLOOR = Math.max(440, window.innerHeight * 0.66);
    if (!this.state.tracksOn) { if (svg.childElementCount) svg.textContent = ""; this.trackEls = null; this.trackKey = null; return; }
    const stamp = [Math.round(this.cam.x), Math.round(this.cam.z), Math.round(this.cam.yaw * 4), Math.round(fade * 40), this.state.seeded.length, this.state.trace.length, this.wearRev || 0, Object.keys(this.state.kept || {}).length, window.innerWidth, window.innerHeight].join(",");
    if (this.trackKey === stamp) return;
    this.trackKey = stamp;
    const NS = "http://www.w3.org/2000/svg";
    const WEIGHTS = [1.5, 1.05, 0.75, 1.3, 0.9];
    let seeded = this.state.seeded;
    if (this.state.filter) seeded = seeded.filter(w => w.name === this.state.filter);
    // one hand per route: each walk gets its own weight and color, boosted by
    // how worn its objects are and whether it has been kept
    const walks: { key: string; steps: string[]; color: string; weight: number; mine: boolean }[] = seeded.map((w, i) => {
      const objs = w.steps.map(id => this.byId(id)).filter(Boolean);
      const avg = objs.length ? objs.reduce((s, o) => s + this.wearOf(o.id), 0) / objs.length : 0;
      const boost = 1 + avg * 0.9 + ((this.state.kept || {})[w.name] ? 0.5 : 0);
      return { key: w.name, steps: w.steps, color: this.walkColor(w.name), weight: WEIGHTS[i % WEIGHTS.length] * boost, mine: false };
    });
    if (this.state.trace.length > 1 && !this.state.filter) walks.unshift({ key: "__mine", steps: this.state.trace.map(t => t.id), color: "#B4483C", weight: 1.9, mine: true });
    if (!this.trackEls) this.trackEls = {};
    const live: Record<string, boolean> = {}, NEAR = this.NEARZ, W = window.innerWidth;
    const band = (d: number) => { for (let i = 0; i < this.BANDS.length; i++) if (d < this.BANDS[i]) return i; return this.BANDS.length - 1; };

    walks.forEach(w => {
      const lines = this.BANDS.map(() => ""), drops = this.BANDS.map(() => ""), marks = this.BANDS.map(() => "");
      const objs = w.steps.map(id => this.byId(id)).filter(Boolean);
      if (!objs.length) return;
      let cx = 0, cz = 0;
      objs.forEach(o => { cx += o.hx; cz += o.hz; });
      cx /= objs.length; cz /= objs.length;
      const kx0 = Math.round((this.cam.x - cx) / this.TILE), kz0 = Math.round((this.cam.z - cz) / this.TILE);
      // the repetitions drawn for a route are centred on the route itself,
      // not on the camera, so a track never appears to orbit as you move
      const copies: [number, number][] = [];
      for (let kx = -1; kx <= 1; kx++) for (let kz = -1; kz <= 1; kz++) copies.push([(kx0 + kx) * this.TILE, (kz0 + kz) * this.TILE]);

      copies.forEach(([ox, oz]) => {
        const pts = objs.map(o => {
          const inst = this.instance(o, ox, oz);
          const c = this.camPt(inst.wx, inst.wz);
          return { c, dy: inst.dy, d: -c.lz };
        });
        if (!pts.some(p => p.d > NEAR && p.d < 13000)) return;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (p.d > NEAR) {
            const g = this.screenPt(p.c, this.FLOOR);
            if (Math.abs(g.x) < W * 2.4) {
              const bi = band(p.d);
              const r = Math.max(1.2, (7 + this.wearOf(objs[i].id) * 10) * g.scale);
              marks[bi] += "M" + (g.x - r).toFixed(1) + "," + g.y.toFixed(1) + "L" + (g.x + r).toFixed(1) + "," + g.y.toFixed(1);
              if (p.d < this.FAR) {
                const t = this.screenPt(p.c, p.dy);
                drops[bi] += "M" + t.x.toFixed(1) + "," + t.y.toFixed(1) + "L" + g.x.toFixed(1) + "," + g.y.toFixed(1);
              }
            }
          }
          if (i === pts.length - 1) break;

          let a = { lx: p.c.lx, lz: p.c.lz }, b = { lx: pts[i + 1].c.lx, lz: pts[i + 1].c.lz };
          const da = -a.lz, db = -b.lz;
          if (da < NEAR && db < NEAR) continue;
          if (Math.min(da, db) > 12000) continue;
          if (da < NEAR) { const t = (NEAR - da) / (db - da); a = { lx: a.lx + (b.lx - a.lx) * t, lz: -NEAR }; }
          if (db < NEAR) { const t = (NEAR - db) / (da - db); b = { lx: b.lx + (a.lx - b.lx) * t, lz: -NEAR }; }

          const K = Math.min(da, db) > 4000 ? 4 : (Math.min(da, db) > 1800 ? 8 : 14);
          let prev = this.screenPt(a, this.FLOOR), prevOff = Math.abs(prev.x) > W * 8;
          for (let k = 1; k <= K; k++) {
            const t = k / K;
            const c = { lx: a.lx + (b.lx - a.lx) * t, lz: a.lz + (b.lz - a.lz) * t };
            const q = this.screenPt(c, this.FLOOR);
            const off = Math.abs(q.x) > W * 8;
            if (!off || !prevOff) {
              const bi = band(da + (db - da) * (t - 0.5 / K));
              lines[bi] += "M" + prev.x.toFixed(1) + "," + prev.y.toFixed(1) + "L" + q.x.toFixed(1) + "," + q.y.toFixed(1);
            }
            prev = q; prevOff = off;
          }
        }
      });

      const put = (key: string, d: string, width: number | string, op: number) => {
        let el = this.trackEls![key];
        if (!el) {
          el = document.createElementNS(NS, "path") as SVGPathElement;
          el.setAttribute("fill", "none");
          el.setAttribute("stroke-linecap", "round");
          svg.appendChild(el);
          this.trackEls![key] = el;
        }
        live[key] = true;
        el.setAttribute("d", d || "M0,0");
        el.setAttribute("stroke", w.color);
        el.setAttribute("stroke-width", String(width));
        el.setAttribute("opacity", (d ? op * (1 - fade) : 0).toFixed(3));
      };
      const base = w.mine ? 0.62 : 0.42;
      this.BANDS.forEach((_, bi) => {
        const g = this.BAND_OP[bi];
        put(w.key + ":l" + bi, lines[bi], (w.weight || 1) * (0.62 + 0.38 * g), base * g);
        put(w.key + ":d" + bi, drops[bi], "0.7", (w.mine ? 0.3 : 0.18) * g);
        put(w.key + ":m" + bi, marks[bi], "1", (w.mine ? 0.62 : 0.44) * g);
      });
    });
    Object.keys(this.trackEls).forEach(k => { if (!live[k]) { this.trackEls![k].remove(); delete this.trackEls![k]; } });
  }

  // Dates as the collection actually holds them: ranges, centuries, refusals.
  yearOf(o: FieldNode | null | undefined): number | null {
    const y = (o && o.y) || "";
    const c = y.match(/(\d{1,2})(?:st|nd|rd|th)\s+c/i);
    if (c) return parseInt(c[1], 10) * 100 - 50;
    const m = y.match(/\d{3,4}/);
    return m ? parseInt(m[0], 10) : null;
  }
  yearLabel(o: FieldNode): string {
    const y = this.yearOf(o);
    return y === null ? "undated" : String(y);
  }
  gap(a: FieldNode, b: FieldNode): number | null {
    const ya = this.yearOf(a), yb = this.yearOf(b);
    if (ya === null || yb === null) return null;
    return Math.abs(yb - ya);
  }

  // A journey holds only its own objects; following a lead out of it opens the
  // field back up rather than sending you to something you cannot see.
  clearFilterFor(id: string) {
    if (this.state.filter && this.filterSet && !this.filterSet.has(id)) { this.filterSet = null; this.setState({ filter: null, joined: null }); }
  }

  open(id: string, mark: string) {
    if (this.suppressClick && performance.now() - this.suppressClick < 220) return;
    this.clearFilterFor(id);
    const o = this.byId(id);
    this.visited[id] = true;
    this.visits[id] = (this.visits[id] || 0) + 1;
    const trace = this.state.trace.slice();
    const last = trace[trace.length - 1];
    if (!last || last.id !== id) trace.push({ id, mark: mark || "◉", depth: String(Math.round(Math.hypot(this.cam.x, this.cam.z))).padStart(5, "0") });

    const prev = last ? this.byId(last.id) : null;
    const paces = Math.round(Math.hypot(this.cam.x - (this.lastStandX ?? this.cam.x), this.cam.z - (this.lastStandZ ?? this.cam.z)) / 34);
    // what the leap cost, measured two ways that do not agree: association is
    // not chronology and not distance, and the readout says so
    if (prev && prev.id !== id) {
      const g = this.gap(prev, o);
      this.setState({ jump: {
        span: this.yearLabel(prev) + " → " + this.yearLabel(o),
        years: g === null ? "a gap of no known size" : g === 0 ? "the same year, by accident" : g.toLocaleString() + (g === 1 ? " year" : " years") + " in one step",
        paces: paces < 1 ? "without moving" : paces.toLocaleString() + " paces walked"
      } });
    } else if (!prev) {
      this.setState({ jump: { span: this.yearLabel(o), years: "no previous position", paces: "the walk starts here" } });
    }
    if (this.jumpTimer) clearTimeout(this.jumpTimer);
    this.jumpTimer = this.later(() => this.setState({ jump: null }), 7000);
    this.lastStandX = this.cam.x; this.lastStandZ = this.cam.z;
    this.panelWant = 1; this.lift = 0; this.liftWant = 0; this.committing = false; this.committed = false; this.liftDir = -1; this.edgeSince = 0;
    this.setState({ open: id, trace, cursor: trace.length - 1, askOpen: false });
    this.approach(id, 520);
    const dv = document.querySelector<HTMLElement>('[data-role="pagescroll"]');
    if (dv) dv.scrollTop = 0;
  }

  approach(id: string, dist: number) {
    const o = this.byId(id);
    const dx = this.wrap(o.hx - this.cam.x, this.TILE), dz = this.wrap(o.hz - this.cam.z, this.TILE);
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    this.cam.tx = this.cam.x + dx - ux * dist;
    this.cam.tz = this.cam.z + dz - uz * dist;
    this.standAt = { x: this.cam.tx, z: this.cam.tz };
    const want = (Math.atan2(ux, -uz) * 180) / Math.PI;
    this.cam.tyaw = want + Math.round((this.cam.tyaw - want) / 360) * 360;
    this.tick();
  }

  flyTo(id: string, mark: string, allowFriction: boolean, andOpen: boolean) {
    this.clearFilterFor(id);
    let target = id, m = mark;
    this.navCount += 1;
    const every = Math.max(2, this.props.frictionEvery ?? 8);
    if (allowFriction && this.navCount > 2 && !this.lastFriction && Math.random() < 1 / every) {
      this.lastFriction = true;
      const others = this.OBJECTS.filter(o => o.id !== id);
      target = others[Math.floor(Math.random() * others.length)].id;
      m = "↷";
    } else if (allowFriction) this.lastFriction = false;

    const o = this.byId(target), dist = 760;
    const dx = this.wrap(o.hx - this.cam.x, this.TILE), dz = this.wrap(o.hz - this.cam.z, this.TILE);
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    this.cam.tx = this.cam.x + dx - ux * dist;
    this.cam.tz = this.cam.z + dz - uz * dist;
    const want = (Math.atan2(ux, -uz) * 180) / Math.PI;
    const turns = Math.round((this.cam.tyaw - want) / 360);
    this.cam.tyaw = want + turns * 360;
    this.used();
    this.tick();
    if (andOpen) this.later(() => this.open(target, m), 60);
    else this.pendingMark = m;
  }

  runSearch(q: string) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return;
    let pool = this.OBJECTS.filter(o => o.tags.some(t => t.includes(s)) || o.t.toLowerCase().includes(s) || o.p.join(" ").toLowerCase().includes(s));
    if (!pool.length) pool = this.OBJECTS;
    let seen = this.seenByQuery[s] || [];
    let fresh = pool.filter(o => seen.indexOf(o.id) === -1);
    if (!fresh.length) { seen = seen.slice(-1); fresh = pool.filter(o => seen.indexOf(o.id) === -1); }
    if (!fresh.length) fresh = pool;
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    this.seenByQuery[s] = seen.concat([pick.id]);
    if (this.input) this.input.blur();
    this.setState({ joined: null, askOpen: false });
    this.flyTo(pick.id, "⌕", false, true);
  }

  passingTrace(): { trace: Walk; index: number } | null {
    const st = this.state; if (!st.open) return null;
    const inTrace = (t: Walk) => { const i = t.steps.indexOf(st.open as string); return i > -1 && i < t.steps.length - 1 ? { trace: t, index: i } : null; };
    if (st.joined) { const t = st.seeded.find(s => s.name === st.joined); if (t) { const r = inTrace(t); if (r) return r; } }
    for (const t of st.seeded) { const r = inTrace(t); if (r) return r; }
    return null;
  }

  // The traces you left join the walk you just named, so they can be found
  // from either end: from the object, or from the route somebody took.
  commitName = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const name = (this.state.nameValue || "").trim() || "Left without a name";
    this.NOTES.forEach(n => { if (n.mine && !n.walk) n.walk = name; });
    const seeded = ([{ name, steps: this.state.trace.map(t => t.id) }] as Walk[]).concat(this.state.seeded);
    this.visited = {};
    this.panelWant = 0;
    this.setState({ seeded, naming: false, nameValue: "", trace: [], cursor: -1, open: null, joined: null, query: "", askOpen: false }, () => this.recomputeWear());
  };

  notesFor(id: string) { return this.NOTES.filter(n => n.obj === id); }
  inkColor(): string { return this.props.inkColor || "#E4DFD2"; }

  // A drawn response, generated once per seeded trace: a few loose passes of a
  // hand following something. Not an illustration of the object, a reaction to it.
  scribble(seed: string) {
    const r = (k: any) => this.rand(seed + k), out: NoteMark[] = [];
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

  // The sheet itself. Strokes are kept in the sheet's own 0..1 coordinates, so
  // the same trace scales from a thumbnail in the field to the full plate.
  bindPaper(cv: HTMLCanvasElement) {
    const ctx = cv.getContext("2d")!;
    this.paper = cv; this.paperCtx = ctx;
    const fit = () => {
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.paintPaper();
    };
    this.paperFit = fit;
    fit(); requestAnimationFrame(fit);
    const at = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    cv.addEventListener("pointerdown", (e: PointerEvent) => {
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
      this.drawing = { w: this.paperW, pts: [at(e)] };
      this.paperStrokes.push(this.drawing);
      this.paintPaper();
    });
    cv.addEventListener("pointermove", (e: PointerEvent) => { if (!this.drawing) return; this.drawing.pts.push(at(e)); this.paintPaper(); });
    const end = () => {
      if (this.drawing && this.drawing.pts.length < 2) this.drawing.pts.push([this.drawing.pts[0][0] + 0.002, this.drawing.pts[0][1]]);
      if (this.drawing) { this.drawing = null; this.paintPaper(); }
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", end);
  }
  paintPaper() {
    const ctx = this.paperCtx, cv = this.paper; if (!ctx || !cv) return;
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.strokeStyle = this.inkColor(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const s = r.width / 300;
    for (const st of this.paperStrokes) {
      if (st.pts.length < 2) continue;
      ctx.lineWidth = Math.max(0.9, st.w * s);
      ctx.beginPath();
      st.pts.forEach((p, i) => { const x = p[0] * r.width, y = p[1] * r.height; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke();
    }
  }

  // An uploaded sketch is kept for its linework only: luminance becomes
  // opacity and everything pale drops out, so the paper stays paper.
  onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const W = Math.min(1100, img.width), H = Math.max(1, Math.round((W * img.height) / img.width));
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0, W, H);
      let d;
      try { d = x.getImageData(0, 0, W, H); } catch (err) { return; }
      const px = d.data, ink = this.inkColor();
      const cr = parseInt(ink.slice(1, 3), 16), cg = parseInt(ink.slice(3, 5), 16), cb = parseInt(ink.slice(5, 7), 16);
      for (let i = 0; i < px.length; i += 4) {
        const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
        const a = Math.max(0, Math.min(1, (0.74 - l) / 0.4));
        px[i] = cr; px[i + 1] = cg; px[i + 2] = cb; px[i + 3] = Math.round(a * 255);
      }
      x.putImageData(d, 0, 0);
      this.paperImg = c.toDataURL("image/png");
      URL.revokeObjectURL(img.src);
      this.forceUpdate();
    };
    img.src = URL.createObjectURL(f);
  };

  commitNote = () => {
    const objId = this.state.compose; if (!objId) return;
    const marks = this.paperStrokes.filter(s => s.pts.length > 1).map(s => ({
      d: s.pts.map((p, i) => (i ? "L" : "M") + (p[0] * 300).toFixed(1) + "," + (p[1] * 200).toFixed(1)).join(""),
      w: String(s.w)
    }));
    const txt = (this.state.noteTxt || "").trim();
    if (!marks.length && !this.paperImg && !txt) { this.setState({ compose: null }); return; }
    this.NOTES.unshift({
      id: "u" + Date.now(), obj: objId, by: "you", walk: null, kind: this.paperImg ? "sketch" : "trace",
      txt: txt || "left without words", marks, img: this.paperImg, mine: true, ink: this.inkColor()
    });
    const trace = this.state.trace.slice();
    for (let i = trace.length - 1; i >= 0; i--) if (trace[i].id === objId) { trace[i] = { id: trace[i].id, mark: trace[i].mark, depth: trace[i].depth, note: true }; break; }
    this.paperStrokes = []; this.paperImg = null;
    this.setState({ compose: null, noteTxt: "", trace, noteRev: this.state.noteRev + 1 }, () => this.recomputeWear());
  };

  nextInWalk(n: FieldNote | null | undefined): string | null {
    if (!n || !n.walk) return null;
    const w = this.state.seeded.find(s => s.name === n.walk);
    if (!w) return null;
    const i = w.steps.indexOf(n.obj);
    return i > -1 && i < w.steps.length - 1 ? w.steps[i + 1] : null;
  }

  plate(o: FieldNode, variant?: string, kind?: string): PlateSeg[] {
    const key = o.id + (variant || "");
    const r = (n: any) => this.rand(key + n), S: PlateSeg[] = [];
    const LINE = "#C2CAC7", k = kind || o.k;
    const line = (x1: number, y1: number, x2: number, y2: number, w: number, op: number) => S.push({ d: `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`, st: LINE, fl: "none", w, o: op.toFixed(2) });
    const dot = (cx: number, cy: number, rad: number, op: number) => S.push({ d: `M${(cx - rad).toFixed(1)},${cy.toFixed(1)}a${rad.toFixed(1)},${rad.toFixed(1)} 0 1,0 ${(rad * 2).toFixed(1)},0a${rad.toFixed(1)},${rad.toFixed(1)} 0 1,0 ${(-rad * 2).toFixed(1)},0`, st: "none", fl: LINE, w: 0, o: op.toFixed(2) });
    const rect = (x: number, y: number, w: number, h: number, fo: boolean, op: number) => S.push({ d: `M${x.toFixed(1)},${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}z`, st: LINE, fl: fo ? LINE : "none", w: 0.5, o: op.toFixed(2) });

    if (k === "drawing" || k === "document") {
      for (let i = 0; i < 26; i++) { const y = 6 + i * 7.4, off = r(i) * 60; line(8 + off * 0.3, y, 292 - off, y + (r("b" + i) - 0.5) * 5, 0.6, 0.3 + r("c" + i) * 0.6); }
    } else if (k === "photograph") {
      for (let i = 0; i < 240; i++) { const g = this.smooth(0, 1, r("g" + i)); dot(r("x" + i) * 300, r("y" + i) * 200, 0.7 + g * 2.6, 0.14 + g * 0.5); }
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

  key(fn: (...args: any[]) => void) {
    return (e: React.KeyboardEvent | KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };
  }

  renderVals(): Record<string, any> {
    const st = this.state;
    if (!this.nodes) {
      this.nodes = this.OBJECTS.map(o => ({
        id: o.id, title: o.t, kind: o.k, year: o.y || "—", plate: this.plate(o), live: !!liveMedia(o),
        open: () => this.open(o.id, "◉")
      }));
    }
    const fieldOn = this.props.fieldNotes ?? true;
    this.nodes.forEach(nd => {
      const drawn = !fieldOn ? [] : this.notesFor(nd.id).filter(n => n.marks && n.marks.length).slice(0, 4);
      nd.marks = drawn.map(n => ({ marks: n.marks, ink: n.ink || this.inkColor(), op: n.mine ? "0.95" : "0.65" }));
      nd.hasMarks = drawn.length > 0;
      nd.cloud = fieldOn ? this.cloudFor(nd.id, this.wearOf(nd.id)) : [];
      nd.traceLabel = drawn.length ? (drawn.length === 1 ? "one trace · " + (drawn[0].mine ? "you" : drawn[0].by) : drawn.length + " traces") : "";
      nd.openTrace = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (drawn.length) this.setState({ view: drawn[0].id }); };
    });

    const out: Record<string, any> = {
      nodes: this.nodes,
      focus: st.focus, query: st.query,
      askOpen: st.askOpen, askShut: !st.askOpen,
      naming: st.naming, nameValue: st.nameValue,
      hasTrace: st.trace.length > 0, traceCount: String(st.trace.length).padStart(2, "0"),
      jump: st.jump || null,
      openAction: st.narrow ? "tap" : "enter",
      openCue: st.narrow ? "tap to open" : "enter to open",
      others: (this.props.showOthers ?? true) && !st.naming,
      nameStamp: st.trace.length ? "name it · " + st.trace.length + " objects" + (this.NOTES.filter(n => n.mine).length ? ", " + this.NOTES.filter(n => n.mine).length + " traces left" : "") : "name it",
      noteCount: String(this.NOTES.filter(n => n.mine).length).padStart(2, "0"),
      catalogue: st.catalogue,
      journeyTally: String(st.seeded.length + (st.trace.length ? 1 : 0)).padStart(2, "0") + " in the collection",
      onCatalogue: () => { this.panelWant = 0; this.setState({ catalogue: true, open: null, compose: null, view: null }); },
      onCloseCatalogue: () => this.setState({ catalogue: false }),
      onLeaveJourney: () => { this.filterSet = null; this.setState({ filter: null, joined: null }); },
      tracksLabel: st.tracksOn ? "TRACKS ON" : "TRACKS OFF",
      tracksColor: st.tracksOn ? "#6E9A8D" : "rgba(142,148,145,0.55)",
      onTracks: () => this.setState({ tracksOn: !this.state.tracksOn }),
      onAskOpen: () => { this.wantFocus = true; this.setState({ askOpen: true }); },
      onAskBlur: () => { if (!this.state.query.trim()) this.setState({ askOpen: false }); },
      onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ query: e.target.value }),
      onSubmit: (e: React.FormEvent) => { e.preventDefault(); this.runSearch(this.state.query); },
      onClose: () => { this.liftDir = -1; this.committing = true; this.liftWant = 1; this.tick(); },
      onElsewhere: () => { const pool = this.OBJECTS.filter(q => q.id !== st.open); const pick = pool[Math.floor(Math.random() * pool.length)]; this.setState({ joined: null }); this.flyTo(pick.id, "⤳", false, true); },
      onLeaveTrace: () => { if (st.trace.length) { this.panelWant = 0; this.setState({ naming: true, nameValue: "", open: null }); } },
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ nameValue: e.target.value }),
      onCommitName: this.commitName,
      onCancelName: () => this.setState({ naming: false }),
      onFollowPassing: () => { const p = this.passingTrace(); if (!p) return; this.setState({ joined: p.trace.name }); this.flyTo(p.trace.steps[p.index + 1], "↓", false, true); }
    };
    out.onTracksKey = this.key(out.onTracks);
    out.onCatalogueKey = this.key(out.onCatalogue);
    out.onCloseCatalogueKey = this.key(out.onCloseCatalogue);
    out.onLeaveJourneyKey = this.key(out.onLeaveJourney);
    out.onAskOpenKey = this.key(out.onAskOpen);
    out.onCloseKey = this.key(out.onClose);
    out.onElsewhereKey = this.key(out.onElsewhere);
    out.onLeaveTraceKey = this.key(out.onLeaveTrace);
    out.onCommitNameKey = this.key(() => this.commitName());
    out.onCancelNameKey = this.key(out.onCancelName);
    out.onFollowPassingKey = this.key(out.onFollowPassing);

    // a walk's name only ever stands for what is on it, so the reading order
    // laid across a table and the order somebody walked read the same way
    const asBook = (name: string, steps: string[], color: string, mine: boolean) => {
      const src = this.state.seeded.find(s => s.name === name);
      const tableSet = !!(src && src.table);
      const isKept = !!(this.state.kept || {})[name];
      const objs = steps.map(id => this.byId(id)).filter(Boolean);
      const years = objs.map(o => this.yearOf(o)).filter((y): y is number => y !== null);
      const traces = this.NOTES.filter(n => n.walk === name).length + (mine ? this.NOTES.filter(n => n.mine && !n.walk).length : 0);
      const go = () => {
        this.filterSet = new Set(steps);
        this.setState({ catalogue: false, filter: mine ? null : name, joined: mine ? null : name });
        if (steps.length) this.flyTo(steps[0], "↓", false, false);
      };
      const shown = objs.slice(0, 9);
      const xs = objs.map(o => o.hx), zs = objs.map(o => o.hz);
      const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
      const minZ = Math.min.apply(null, zs), maxZ = Math.max.apply(null, zs);
      const spanX = Math.max(1, maxX - minX), spanZ = Math.max(1, maxZ - minZ);
      const kk = Math.min(168 / spanX, 100 / spanZ);
      const px = (o: FieldNode) => (100 + (o.hx - (minX + maxX) / 2) * kk).toFixed(1);
      const py = (o: FieldNode) => (65 + (o.hz - (minZ + maxZ) / 2) * kk).toFixed(1);
      let route = "", nodesPath = "";
      objs.forEach((o, i) => {
        route += (i ? "L" : "M") + px(o) + "," + py(o);
        const x = +px(o), y = +py(o), rr = 2.6;
        nodesPath += "M" + (x - rr).toFixed(1) + "," + y.toFixed(1) + "L" + (x + rr).toFixed(1) + "," + y.toFixed(1) +
                     "M" + x.toFixed(1) + "," + (y - rr).toFixed(1) + "L" + x.toFixed(1) + "," + (y + rr).toFixed(1);
      });
      const keep = (ev?: any) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        const kp = Object.assign({}, this.state.kept || {});
        if (kp[name]) delete kp[name]; else kp[name] = true;
        this.setState({ kept: kp }, () => this.recomputeWear());
      };
      const hovered = this.state.hoverJourney === name;
      return {
        route, routeNodes: nodesPath,
        routeOff: hovered ? "0" : "1", routeOp: hovered ? "1" : "0", nodeOp: hovered ? "0.95" : "0",
        spineOp: hovered ? "0.28" : "0.8",
        enter_hover: () => this.setState({ hoverJourney: name }),
        leave_hover: () => { if (this.state.hoverJourney === name) this.setState({ hoverJourney: null }); },
        name, color,
        pages: shown.map((o, i) => ({
          plate: this.plate(o),
          x: ((i - (shown.length - 1) / 2) * 22).toFixed(1) + "px",
          y: ((this.rand(o.id + name + "py") - 0.5) * 6).toFixed(1) + "px",
          op: ((0.4 + (i / Math.max(1, shown.length - 1)) * 0.58) * (hovered ? 0.26 : 1)).toFixed(2)
        })),
        spineX: ((-(shown.length - 1) / 2 - 1.15) * 22).toFixed(1) + "px", spineY: "0px",
        meta: steps.length + (steps.length === 1 ? " object" : " objects") + (traces ? " · " + traces + (traces === 1 ? " trace" : " traces") : ""),
        span: years.length > 1 ? Math.min.apply(null, years) + "–" + Math.max.apply(null, years) : years.length === 1 ? String(years[0]) : "undated throughout",
        enter: go, key: this.key(go),
        kind: mine ? "open walk" : tableSet ? "a set, read flat or walked" : "a walk somebody took",
        isTable: tableSet,
        keptLabel: isKept ? "kept" : "keep it",
        keptColor: isKept ? "#6E9A8D" : "rgba(142,148,145,0.55)",
        keep, keepKey: this.key(() => keep()),
        flatLabel: tableSet ? "open it flat" : "",
        flat: tableSet ? this.openFlat(src!) : null,
        flatKey: tableSet ? this.key(() => this.openFlat(src!)()) : null
      };
    };
    out.journeys = st.seeded.map(w => asBook(w.name, w.steps, this.walkColor(w.name), false));
    if (st.trace.length) out.journeys = [asBook("Your walk, still open", st.trace.map(t => t.id), "#B4483C", true)].concat(out.journeys);
    const jw = st.filter ? st.seeded.find(w => w.name === st.filter) : null;
    out.inJourney = jw ? { name: jw.name, color: this.walkColor(jw.name), count: jw.steps.length + " objects" } : null;

    const o = st.open ? this.byId(st.open) : null;
    if (o) {
      const idx = this.OBJECTS.indexOf(o) + 1;
      out.detail = {
        id: o.id, title: o.t, stamp: o.k + (o.y ? " · " + o.y : ""),
        ref: "[a}morf · " + String(idx).padStart(3, "0") + " / " + this.OBJECTS.length,
        plate: this.plate(o),
        media: (o.media || []).map((m, i) => ({ kind: m.kind, cap: m.cap, plate: this.plate(o, "v" + i, m.kind), img: m.img || null, imgCss: m.img ? "url(" + m.img + ")" : null })),
        paras: o.p.map(t => ({ t })),
        notes: o.notes || [],
        facts: [
          { k: "medium", v: o.k },
          { k: "date", v: o.y || "undated" },
          { k: "place", v: o.place || "unplaced" },
          { k: "source", v: o.src || "unattributed" },
          { k: "tags", v: o.tags.slice(0, 5).join(" · ") }
        ]
      };
      out.assocs = this.ASSOC.filter(a => a[0] === o.id || a[1] === o.id).slice(0, 4).map(a => {
        const other = a[0] === o.id ? a[1] : a[0];
        const go = () => this.flyTo(other, "↓", true, true);
        return { reason: a[2], title: this.byId(other).t, go, key: this.key(go) };
      });
      const p = this.passingTrace();
      out.passing = p ? p.trace.name : null;
    } else {
      out.detail = null; out.assocs = []; out.passing = null;
    }

    out.trace = st.trace.map((s, i) => {
      const obj = this.byId(s.id);
      const go = () => { this.setState({ cursor: i }); this.flyTo(s.id, "↺", false, true); };
      let label = obj.t.split(",")[0].replace(/^(a|the) /i, "");
      if (label.length > 13) {
        const words = label.split(" "); let acc = "";
        for (const wd of words) { if ((acc + " " + wd).trim().length > 13) break; acc = (acc + " " + wd).trim(); }
        label = (acc || label.slice(0, 12)) + "…";
      }
      return { label: label.toLowerCase(), mark: s.mark + (s.note ? " ✎" : ""), depth: s.depth, year: this.yearLabel(obj) === "undated" ? "—" : this.yearLabel(obj), color: i === st.cursor ? "#6E9A8D" : "rgba(228,223,210,0.5)", go, key: this.key(go) };
    });

    let crossedYears = 0, dated = 0, uncounted = 0;
    for (let i = 1; i < st.trace.length; i++) {
      const g = this.gap(this.byId(st.trace[i - 1].id), this.byId(st.trace[i].id));
      if (g !== null) { crossedYears += g; dated++; } else uncounted++;
    }
    const steps = st.trace.length - 1;
    out.crossed = st.trace.length < 2 ? "one position held"
      : (dated ? crossedYears.toLocaleString() + " years crossed" : "no datable distance")
        + " in " + steps + (steps === 1 ? " step" : " steps")
        + (uncounted ? ", " + uncounted + " uncounted" : "");
    const mineCount = this.NOTES.filter(n => n.mine).length;
    if (mineCount) out.crossed = out.crossed + " · " + mineCount + (mineCount === 1 ? " trace left behind" : " traces left behind");

    const here = st.open ? this.notesFor(st.open) : [];
    out.notesHere = here.map(n => {
      const go = () => this.setState({ view: n.id });
      return {
        marks: n.marks || [], drawn: !!(n.marks && n.marks.length), img: n.img || null,
        ink: n.ink || this.inkColor(), txt: n.txt, by: n.mine ? "left by you" : "left by " + n.by,
        imgCss: n.img ? "url(" + n.img + ")" : null,
        short: n.txt.length > 88 ? n.txt.slice(0, 86).replace(/[\s,.;]+$/, "") + "…" : n.txt,
        sheet: !!((n.marks && n.marks.length) || n.img), written: !((n.marks && n.marks.length) || n.img),
        open: go, key: this.key(go)
      };
    });
    out.noteTally = here.length === 0 ? "none yet" : here.length === 1 ? "one" : String(here.length).padStart(2, "0");
    const hand = st.hand;
    const drawnHere = here.filter(n => n.marks && n.marks.length);
    out.layers = drawnHere.map(n => ({
      marks: n.marks, ink: n.ink || this.inkColor(),
      op: hand ? (hand === n.id ? "0.95" : "0.07") : (0.34 + (n.mine ? 0.3 : 0)).toFixed(2)
    }));
    const handOf = hand ? here.find(n => n.id === hand) : null;
    out.overlayLabel = handOf ? "one hand · " + (handOf.mine ? "you" : handOf.by)
      : drawnHere.length ? drawnHere.length + (drawnHere.length === 1 ? " sheet laid over it" : " sheets laid over each other")
      : "no sheets laid over it yet";
    out.hands = here.map(n => {
      const on = hand === n.id;
      const go = () => this.setState({ view: n.id });
      return {
        by: n.mine ? "you" : n.by, short: n.txt, ink: n.ink || this.inkColor(),
        dot: on ? "1" : (n.marks && n.marks.length ? "0.45" : "0.16"),
        bg: on ? "rgba(110,154,141,0.09)" : "#090D0F",
        byColor: on ? "#6E9A8D" : "rgba(142,148,145,0.75)",
        txtColor: on ? "#E4DFD2" : "rgba(201,197,185,0.6)",
        enter: () => this.setState({ hand: n.id }),
        leave: () => { if (this.state.hand === n.id) this.setState({ hand: null }); },
        open: go, key: this.key(go)
      };
    });
    out.notesOpen = st.notesOpen && here.length > 0;
    out.gridHint = here.length === 0 ? "nothing left here yet"
      : out.notesOpen ? "fold the sheets back" : "lay all " + here.length + " out as sheets";
    out.onNotesToggle = () => this.setState({ notesOpen: !this.state.notesOpen });
    out.onNotesToggleKey = this.key(() => this.setState({ notesOpen: !this.state.notesOpen }));

    const co = st.compose ? this.byId(st.compose) : null;
    const wsel = (on: boolean) => on ? "#6E9A8D" : "rgba(142,148,145,0.6)";
    out.compose = co ? {
      title: co.t, plate: this.plate(co), img: this.paperImg || null, imgCss: this.paperImg ? "url(" + this.paperImg + ")" : null,
      uploadLabel: this.paperImg ? "sketch laid down" : "upload a sketch",
      fine: wsel(this.paperW < 1.2), medium: wsel(this.paperW >= 1.2 && this.paperW < 2.6), broad: wsel(this.paperW >= 2.6)
    } : null;
    out.noteTxt = st.noteTxt;
    out.onCompose = () => { if (!st.open) return; this.paperStrokes = []; this.paperImg = null; this.setState({ compose: st.open, noteTxt: "" }); };
    out.onDiscard = () => { this.paperStrokes = []; this.paperImg = null; this.setState({ compose: null, noteTxt: "" }); };
    out.onUndo = () => { this.paperStrokes.pop(); this.paintPaper(); };
    out.onClearPaper = () => { this.paperStrokes = []; this.paperImg = null; this.paintPaper(); this.forceUpdate(); };
    out.onFine = () => { this.paperW = 0.9; this.forceUpdate(); };
    out.onMedium = () => { this.paperW = 1.8; this.forceUpdate(); };
    out.onBroad = () => { this.paperW = 3.4; this.forceUpdate(); };
    out.onNoteTxt = (e: React.ChangeEvent<HTMLTextAreaElement>) => this.setState({ noteTxt: e.target.value });
    out.onCommitNote = this.commitNote;
    out.onUpload = this.onUpload;
    out.onComposeKey = this.key(out.onCompose);
    out.onDiscardKey = this.key(out.onDiscard);
    out.onUndoKey = this.key(out.onUndo);
    out.onClearPaperKey = this.key(out.onClearPaper);
    out.onFineKey = this.key(out.onFine);
    out.onMediumKey = this.key(out.onMedium);
    out.onBroadKey = this.key(out.onBroad);
    out.onCommitNoteKey = this.key(() => this.commitNote());

    const vn = st.view ? this.NOTES.find(n => n.id === st.view) : null;
    if (vn) {
      const vo = this.byId(vn.obj), nxt = this.nextInWalk(vn);
      const handNotes = this.NOTES.filter(n => n.by === vn.by && n.id !== vn.id);
      out.view = {
        title: vo.t, plate: this.plate(vo), marks: vn.marks || [], img: vn.img || null,
        ink: vn.ink || this.inkColor(), txt: vn.txt, imgCss: vn.img ? "url(" + vn.img + ")" : null,
        by: vn.mine ? "left by you" : "left by " + vn.by,
        stamp: vn.kind === "written" ? "written, no sheet" : "on tracing paper",
        walk: vn.walk ? "part of a walk · " + vn.walk : null
      };
      const wk = vn.walk ? st.seeded.find(s => s.name === vn.walk) : null;
      const stepsArr = wk ? wk.steps : (vn.mine ? st.trace.map(t => t.id) : []);
      out.journey = stepsArr.map((sid, i) => {
        const so = this.byId(sid), on = sid === vn.obj;
        const go = () => { this.setState({ view: null, joined: vn.walk || null }); this.flyTo(sid, "↓", false, true); };
        return { n: String(i + 1).padStart(2, "0"), title: so.t, here: on ? "this trace" : "", color: on ? "#6E9A8D" : "rgba(228,223,210,0.55)", go, key: this.key(go) };
      });
      out.viewFollow = nxt ? "follow where they went next" : (handNotes.length ? "another trace by this hand" : null);
      out.onFollowTrace = () => {
        if (nxt) { this.setState({ view: null, joined: vn.walk }); this.flyTo(nxt, "↓", false, true); }
        else if (handNotes.length) {
          const pick = handNotes[Math.floor(Math.random() * handNotes.length)];
          this.setState({ view: null });
          this.flyTo(pick.obj, "↓", false, true);
          this.later(() => this.setState({ view: pick.id }), 1100);
        }
      };
    } else { out.view = null; out.viewFollow = null; out.journey = []; out.onFollowTrace = () => {}; }
    out.onCloseNote = () => this.setState({ view: null });
    out.onCloseNoteKey = this.key(out.onCloseNote);
    out.onFollowTraceKey = this.key(() => out.onFollowTrace());

    const keptFirst = st.seeded.slice().sort((a, b) => ((st.kept[b.name] ? 1 : 0) - (st.kept[a.name] ? 1 : 0)));
    out.seeded = keptFirst.slice(0, 4).map(t => {
      const go = () => { this.setState({ joined: t.name }); this.flyTo(t.steps[0], "↓", false, true); };
      return { name: t.name, color: this.walkColor(t.name), swatch: st.tracksOn ? "0.85" : "0.25", mark: st.kept[t.name] ? "kept" : t.table ? "set" : "", join: go, key: this.key(go) };
    });

    const pc = (o: FieldNode) => (o.hx / this.TILE * 100).toFixed(2) + "," + (o.hz / this.TILE * 100).toFixed(2);
    const routeOf = (ids: string[]) => ids.map(id => this.byId(id)).filter(Boolean).map((o, i) => (i ? "L" : "M") + pc(o)).join("");
    out.plan = st.plan;
    out.onPlan = () => { this.panelWant = 0; this.setState({ plan: !this.state.plan, catalogue: false, tableOpen: false, compose: null, view: null }); };
    out.onPlanKey = this.key(() => out.onPlan());
    out.onClosePlan = () => this.setState({ plan: false });
    out.onClosePlanKey = this.key(out.onClosePlan);
    out.planNodes = this.OBJECTS.map(o => {
      const wr = this.wearOf(o.id);
      const go = () => { this.setState({ plan: false }); this.flyTo(o.id, "↓", false, true); };
      const on = st.planHover === o.id;
      const side = o.hx / this.TILE > 0.5 ? "row-reverse" : "row";
      const half = (5 + wr * 13) / 2 + 8;
      return {
        id: o.id, title: o.t,
        x: (o.hx / this.TILE * 100).toFixed(2) + "%",
        y: (o.hz / this.TILE * 100).toFixed(2) + "%",
        size: (5 + wr * 13).toFixed(1) + "px",
        op: on ? "1" : (0.3 + wr * 0.7).toFixed(2),
        ink: on ? "#6E9A8D" : this.visited[o.id] ? "#6E9A8D" : "#C9C5B9",
        lox: (side === "row" ? half : -half).toFixed(1) + "px",
        ltf: side === "row" ? "translateY(-50%)" : "translate(-100%, -50%)",
        z: on ? "3" : "1",
        labelOp: "0",
        side: side === "row" ? "right" : "left",
        labelInk: on ? "#E4DFD2" : "#C9C5B9",
        enter: () => this.setState({ planHover: o.id }),
        leave: () => { if (this.state.planHover === o.id) this.setState({ planHover: null }); },
        go, key: this.key(go)
      };
    });
    out.planEdges = (this.props.planEdges ?? true)
      ? this.ASSOC.map(a => {
          const A = this.byId(a[0]), B = this.byId(a[1]);
          return A && B ? { d: "M" + pc(A) + "L" + pc(B) } : null;
        }).filter(Boolean)
      : [];
    out.planWalks = st.seeded.map(w => {
      const objs = w.steps.map(id => this.byId(id)).filter(Boolean);
      const avg = objs.length ? objs.reduce((s, o) => s + this.wearOf(o.id), 0) / objs.length : 0;
      return { d: routeOf(w.steps), color: this.walkColor(w.name), w: (0.7 + avg * 2.6 + (st.kept[w.name] ? 1.2 : 0)).toFixed(2), op: (st.kept[w.name] ? 0.85 : 0.38).toFixed(2) };
    });
    out.planMine = st.trace.length > 1 ? routeOf(st.trace.map(t => t.id)) : "";
    const keptCount = Object.keys(st.kept).filter(k => st.kept[k]).length;
    out.planTally = this.OBJECTS.length + " entities · " + st.seeded.length + (st.seeded.length === 1 ? " route" : " routes") + (keptCount ? " · " + keptCount + " kept" : "");

    out.table = st.tableOpen;
    out.tableLabel = st.table.length ? "TABLE " + String(st.table.length).padStart(2, "0") : "TABLE —";
    out.tableColor = st.table.length ? "#6E9A8D" : "rgba(142,148,145,0.55)";
    out.onTable = () => { this.panelWant = 0; this.setState({ tableOpen: true, plan: false, catalogue: false, compose: null, view: null }); };
    out.onTableKey = this.key(() => out.onTable());
    out.onCloseTable = () => this.setState({ tableOpen: false });
    out.onCloseTableKey = this.key(out.onCloseTable);
    out.tableEmpty = st.table.length === 0;
    out.tableHint = st.tableNote
      ? st.tableNote + " · bind it or put something back"
      : st.table.length ? "drag them into relation · reading order becomes the route" : "nothing set aside yet";
    out.tableItems = st.table.map(id => {
      const o = this.byId(id), p = this.tablePos[id] || { x: 50, y: 50 };
      const off = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); this.toggleAside(id); };
      return {
        id, title: o.t, stamp: o.k + (o.y ? " · " + o.y : ""), plate: this.plate(o),
        x: p.x.toFixed(2) + "%", y: p.y.toFixed(2) + "%",
        down: this.tableDown(id), off, offKey: this.key(() => off())
      };
    });
    out.bindName = st.bindName;
    out.bindColor = st.table.length ? "#6E9A8D" : "rgba(142,148,145,0.35)";
    out.onBindName = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ bindName: e.target.value });
    out.onBind = this.bindTable;
    out.onBindKey = this.key(() => this.bindTable());
    out.onClearTable = () => this.setState({ table: [], bindName: "", tableNote: null });
    out.onClearTableKey = this.key(() => this.setState({ table: [], bindName: "", tableNote: null }));
    const asideOn = !!(st.open && st.table.indexOf(st.open) > -1);
    out.asideLabel = st.tableNote ? "the table is full" : asideOn ? "on the table" : "set it aside";
    out.asideColor = st.tableNote ? "#B4483C" : asideOn ? "#6E9A8D" : "rgba(142,148,145,0.85)";
    out.onAside = () => { if (st.open) this.toggleAside(st.open); };
    out.onAsideKey = this.key(() => out.onAside());
    out.focusAside = st.tableNote ? "table full" : st.focus ? (st.table.indexOf(st.focus.id) > -1 ? "on the table" : "set aside") : "";
    out.onFocusAside = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (st.focus) this.toggleAside(st.focus.id); };
    out.onFocusAsideKey = this.key(() => { if (this.state.focus) this.toggleAside(this.state.focus.id); });

    return out;
  }

  // Card DOM order is load-bearing: frame() reads el.firstElementChild as the plate svg
  // and el.children[2] as the <h3> title via querySelector("[data-obj]") — never reorder
  // the first three children (plate svg, kind/year row, title).
  private renderNode(n: any, v: V) {
    return (
      <div
        key={n.id}
        data-obj={n.id}
        role="button"
        tabIndex={-1}
        onClick={n.open}
        style={{ position: "absolute", left: "50%", top: "50%", width: 340, transformStyle: "preserve-3d", willChange: "transform, opacity", userSelect: "none", visibility: "hidden" }}
      >
        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: 226, border: "1px solid rgba(168,176,173,0.45)", background: "rgba(228,223,210,0.05)" }}>
          {n.plate.map((s: PlateSeg, i: number) => (
            <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />
          ))}
        </svg>
        <div className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "9px 0 4px", fontSize: 10 }}>
          <span>{n.kind}</span>
          <span>{n.year}</span>
        </div>
        <h3 className="field-title" style={{ margin: 0, fontWeight: 400, fontSize: 25, lineHeight: 1.12 }}>{n.title}</h3>
        <div data-part="cue" className="field-label" style={{ marginTop: 7, fontSize: 9, letterSpacing: "0.22em", color: "var(--field-accent)", opacity: 0 }}>{v.openCue}</div>
        <div data-part="cloud" data-o="0" style={{ position: "absolute", left: "-14%", top: "-7%", width: "128%", height: 262, pointerEvents: "none", opacity: 0 }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
            {n.cloud.map((s: NoteMark, i: number) => (
              <path key={i} d={s.d} fill="none" stroke="var(--field-line)" strokeWidth={s.w} strokeLinecap="round" opacity={0.55} />
            ))}
          </svg>
        </div>
        {n.live && <div data-part="media" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 226, pointerEvents: "none", overflow: "hidden" }} />}
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 226, pointerEvents: "none" }}>
          {n.marks.map((k: any, ki: number) => (
            <div key={ki} data-part="mark" data-op={k.op} style={{ position: "absolute", inset: 0, opacity: 0 }}>
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                {k.marks.map((s: NoteMark, si: number) => (
                  <path key={si} d={s.d} pathLength={1} fill="none" stroke={k.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.9} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                ))}
              </svg>
            </div>
          ))}
        </div>
        {n.hasMarks && (
          <div
            data-part="mark"
            data-op="0.9"
            role="button"
            tabIndex={-1}
            onClick={n.openTrace}
            className="field-label field-label-accent"
            style={{ position: "absolute", left: 9, top: 198, opacity: 0, cursor: "pointer", fontSize: 8.5, letterSpacing: "0.18em" }}
          >
            {n.traceLabel}
          </div>
        )}
      </div>
    );
  }

  // Sits beside the detail panel, not inside it: [data-role="page"] is transformed, blurred and
  // overflow-hidden, which would clip and restyle the live element.
  private renderMediaStage(v: V) {
    return (
      <div data-role="mediastage" style={{ position: "absolute", inset: 0, zIndex: 31, opacity: 0, visibility: "hidden", pointerEvents: "none" }}>
        <div data-part="slot" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />
        <div role="button" tabIndex={0} onClick={v.onClose} onKeyDown={v.onCloseKey} className="field-label field-hover-split" style={{ position: "absolute", top: 15, left: "clamp(18px, 3vw, 42px)", display: "flex", alignItems: "center", gap: 9, cursor: "pointer", outline: "none", fontSize: 10, color: "rgba(var(--field-mute-rgb), 0.85)", transition: "color 400ms ease", pointerEvents: "auto" }}>
          <span>←</span>
          <span>put it back</span>
        </div>
      </div>
    );
  }

  private renderStage(v: V) {
    return (
      <div
        data-role="stage"
        style={{ position: "absolute", inset: 0, perspective: 900, perspectiveOrigin: "50% 46%", cursor: "crosshair", touchAction: "none", background: "radial-gradient(120% 90% at 50% 45%, var(--field-bg-mid) 0%, var(--field-bg) 55%, var(--field-bg-dark) 100%)" }}
      >
        <div data-role="world" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", willChange: "transform" }}>
          {v.nodes.map((n: any) => this.renderNode(n, v))}
        </div>
        <svg data-role="tracks" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2, overflow: "visible" }} />
      </div>
    );
  }

  private renderHud(v: V) {
    return (
      <div data-role="hud" data-plane-ui="1" data-keepclear="34" style={{ position: "absolute", right: 24, top: 22, zIndex: 20, display: "flex", alignItems: "flex-start", gap: 14, willChange: "transform" }}>
        <div className="field-label" style={{ pointerEvents: "none", textAlign: "right", lineHeight: 1.9 }}>
          <div data-role="hud-depth">DEPTH 00000</div>
          <div data-role="hud-yaw">BEARING 000</div>
          <div data-role="hud-grid" className="field-label-dim">E0000 N0000</div>
          <div className="field-label-dim">WALK {v.traceCount}</div>
          <div className="field-label-accent">TRACES {v.noteCount}</div>
        </div>
        <div role="button" tabIndex={0} onClick={v.onCatalogue} onKeyDown={v.onCatalogueKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, transition: "color 400ms ease" }}>THE INDEX</div>
        <div role="button" tabIndex={0} onClick={v.onPlan} onKeyDown={v.onPlanKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, transition: "color 400ms ease" }}>PLAN</div>
        <div role="button" tabIndex={0} onClick={v.onTable} onKeyDown={v.onTableKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, color: v.tableColor, transition: "color 400ms ease" }}>{v.tableLabel}</div>
        <div role="button" tabIndex={0} onClick={v.onTracks} onKeyDown={v.onTracksKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, color: v.tracksColor, transition: "color 400ms ease" }}>{v.tracksLabel}</div>
        {v.askOpen && (
          <form onSubmit={v.onSubmit} style={{ animation: "am-in 400ms ease both" }}>
            <input
              data-role="ask"
              value={v.query}
              onChange={v.onQueryChange}
              onBlur={v.onAskBlur}
              autoComplete="off"
              spellCheck={false}
              aria-label="ask"
              placeholder="ask"
              className="field-input"
              style={{ width: "clamp(150px, 20vw, 240px)", borderBottom: "1px solid rgba(110,154,141,0.7)", padding: "2px 2px 6px", fontFamily: "var(--font-display), Didot, serif", fontSize: 16, letterSpacing: "0.04em" }}
            />
          </form>
        )}
        {v.askShut && (
          <div
            role="button"
            tabIndex={0}
            aria-label="ask"
            onClick={v.onAskOpen}
            onKeyDown={v.onAskOpenKey}
            className="field-hover-mist"
            style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-label), monospace", fontSize: 13, color: "rgba(var(--field-mute-rgb), 0.75)", cursor: "pointer", outline: "none", transition: "color 400ms ease" }}
          >
            ⌕
          </div>
        )}
      </div>
    );
  }

  private renderJump(v: V) {
    return (
      <div data-role="jump" data-plane-ui="1" data-keepclear="20" style={{ position: "absolute", right: 24, top: 112, zIndex: 20, pointerEvents: "none", textAlign: "right", willChange: "transform, opacity" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "9px 12px 9px 0", borderRight: "1px solid rgba(110,154,141,0.45)", animation: "am-in 700ms ease both" }}>
          <div className="field-label field-label-dim" style={{ fontSize: 9, letterSpacing: "0.2em" }}>{v.jump.span}</div>
          <div className="field-label field-label-accent" style={{ fontSize: 11, letterSpacing: "0.14em" }}>{v.jump.years}</div>
          <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(var(--field-mute-rgb), 0.55)" }}>{v.jump.paces}</div>
        </div>
      </div>
    );
  }

  private renderFocusbar(v: V) {
    return (
      <div data-role="focusbar" data-plane-ui="1" data-keepclear="22" style={{ position: "absolute", left: "50%", bottom: 30, transform: "translateX(-50%)", zIndex: 19, willChange: "transform, opacity" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "8px 14px", border: "1px solid rgba(110,154,141,0.32)", background: "rgba(6,10,11,0.42)", backdropFilter: "blur(3px)", animation: "am-in 350ms ease both" }}>
          <span className="field-label" style={{ fontSize: 9 }}>{v.focus.stamp}</span>
          <span className="field-title" style={{ fontSize: 17 }}>{v.focus.title}</span>
          <span className="field-label field-label-accent" style={{ fontSize: 9 }}>{v.openAction}</span>
          <span role="button" tabIndex={0} onClick={v.onFocusAside} onKeyDown={v.onFocusAsideKey} className="field-label field-hover-mist" style={{ cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>{v.focusAside}</span>
        </div>
      </div>
    );
  }

  // layout() indexes this rail's children positionally (rail.children[0..3]) to toggle
  // narrow-mode flex direction — the head/list/tally/leave order below must not change.
  private renderTraceRail(v: V) {
    return (
      <div data-plane-ui="1" data-keepclear="40" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "clamp(78px, 8vw, 112px)", zIndex: 21, borderRight: "1px solid rgba(168,176,173,0.14)", background: "rgba(6,10,11,0.6)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column" }}>
        <div className="field-label" style={{ padding: "18px 10px 10px", fontSize: 8, letterSpacing: "0.22em" }}>walk</div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "4px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {v.trace.map((t: any, i: number) => (
            <div key={i} role="button" tabIndex={0} onClick={t.go} onKeyDown={t.key} style={{ cursor: "pointer", outline: "none", display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.55)" }}>
                <span>{t.mark}</span>
                <span>{t.year}</span>
              </div>
              <div className="field-hover-accent" style={{ fontFamily: "var(--font-label), monospace", fontSize: 9.5, lineHeight: 1.38, overflowWrap: "anywhere", color: t.color }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div className="field-label" style={{ padding: "10px 10px 0", fontSize: 8, lineHeight: 1.6, letterSpacing: "0.14em" }}>{v.crossed}</div>
        <div role="button" tabIndex={0} onClick={v.onLeaveTrace} onKeyDown={v.onLeaveTraceKey} className="field-hover-accent" style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(168,176,173,0.14)", fontFamily: "var(--font-label), monospace", fontSize: 8.5, lineHeight: 1.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(110,154,141,0.8)", cursor: "pointer", outline: "none" }}>let this walk go</div>
      </div>
    );
  }

  private renderJourneybar(v: V) {
    return (
      <div data-role="journeybar" data-plane-ui="1" data-keepclear="24" style={{ position: "absolute", left: 24, top: 22, zIndex: 20, maxWidth: "min(52vw, 520px)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 16px", padding: "9px 16px", border: "1px solid rgba(168,176,173,0.2)", background: "rgba(6,10,11,0.6)", backdropFilter: "blur(3px)" }}>
        <span style={{ width: 18, height: 2, background: v.inJourney.color }} />
        <span className="field-body" style={{ fontStyle: "italic", fontWeight: 300, fontSize: 13.5, color: "var(--field-ink)" }}>{v.inJourney.name}</span>
        <span className="field-label" style={{ fontSize: 9 }}>{v.inJourney.count}</span>
        <span role="button" tabIndex={0} onClick={v.onLeaveJourney} onKeyDown={v.onLeaveJourneyKey} className="field-label field-label-accent field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>the whole field</span>
      </div>
    );
  }

  // layout() overwrites textContent here only when it differs from what it wants to set,
  // so the initial string must match verbatim or it silently never gets corrected on mount.
  private renderHint() {
    return (
      <div data-role="hint" data-plane-ui="1" className="field-label" style={{ position: "absolute", left: 0, right: 0, bottom: 8, zIndex: 18, pointerEvents: "none", textAlign: "center", fontSize: 9.5, letterSpacing: "0.22em", color: "rgba(var(--field-mute-rgb), 0.5)" }}>
        scroll to move · drag or sideways to turn · click or enter to open
      </div>
    );
  }

  private renderOthers(v: V) {
    return (
      <div data-role="others" data-plane-ui="1" data-keepclear="44" style={{ position: "absolute", right: 24, bottom: 26, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7, maxWidth: "min(34vw, 280px)", padding: "14px 16px", background: "rgba(6,10,11,0.9)", willChange: "opacity" }}>
        <div className="field-label" style={{ fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.55)" }}>others</div>
        {v.seeded.map((t: any) => (
          <div key={t.name} role="button" tabIndex={0} onClick={t.join} onKeyDown={t.key} className="field-body field-hover-split" style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "right", fontSize: 12.5, lineHeight: 1.35, color: "rgba(228,223,210,0.4)", cursor: "pointer", outline: "none", transition: "color 400ms ease" }}>
            <span style={{ flex: "0 0 auto", width: 16, height: 1, background: t.color, opacity: t.swatch }} />
            <span>{t.name}</span>
            <span className="field-label" style={{ flex: "0 0 auto", fontSize: 8, color: "rgba(110,154,141,0.8)" }}>{t.mark}</span>
          </div>
        ))}
      </div>
    );
  }

  private renderDetail(v: V) {
    const d = v.detail;
    return (
      <div data-role="detail" style={{ position: "absolute", inset: 0, zIndex: 30, padding: "clamp(12px, 2vh, 28px) clamp(12px, 2vw, 32px)", perspective: 1600, perspectiveOrigin: "50% 70%" }}>
        {/* transform/opacity below are frame()'s pre-animation baseline — it queries this
            node via [data-role="page"] every rAF and overwrites both once the panel opens. */}
        <div data-role="page" style={{ position: "relative", width: "100%", height: "100%", maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", background: "rgba(9,13,15,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(168,176,173,0.24)", boxShadow: "0 60px 160px rgba(3,6,7,0.82)", overflow: "hidden", transformOrigin: "50% 100%", willChange: "transform, opacity", transform: "translateY(16%) rotateX(-11deg) scale(0.94)", opacity: 0 }}>
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "15px clamp(18px, 3vw, 42px)", borderBottom: "1px solid rgba(168,176,173,0.16)" }}>
            <div role="button" tabIndex={0} onClick={v.onClose} onKeyDown={v.onCloseKey} className="field-label field-hover-split" style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", outline: "none", fontSize: 10, color: "rgba(var(--field-mute-rgb), 0.85)", transition: "color 400ms ease" }}>
              <span>←</span>
              <span>put it back</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(14px, 2vw, 26px)" }}>
              <div role="button" tabIndex={0} onClick={v.onAside} onKeyDown={v.onAsideKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: v.asideColor, transition: "color 400ms ease" }}>{v.asideLabel}</div>
              <div className="field-label" style={{ fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.6)" }}>{d.ref}</div>
            </div>
          </div>

          <div data-role="pagescroll" style={{ flex: "1 1 auto", overflowY: "auto", overscrollBehavior: "contain" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(26px, 3.4vw, 64px)", padding: "clamp(24px, 4vh, 52px) clamp(18px, 3vw, 42px) clamp(40px, 6vh, 72px)", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 30, minWidth: 0 }}>
                <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(220px, 34vh, 380px)", border: "1px solid rgba(168,176,173,0.4)", background: "rgba(228,223,210,0.035)" }}>
                    {d.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                  </svg>
                  <figcaption className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 9.5 }}>
                    <span>{d.stamp}</span>
                    <span role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "var(--field-accent)", transition: "color 400ms ease" }}>lay tracing paper</span>
                  </figcaption>
                </figure>
                {d.media.filter((m: { kind: string }) => !rendererFor(m.kind)).map((m: any, i: number) => (
                  <figure key={i} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    {m.img ? (
                      <div aria-hidden="true" style={{ width: "100%", height: "clamp(150px, 22vh, 250px)", border: "1px solid rgba(168,176,173,0.28)", backgroundImage: m.imgCss, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1) contrast(1.08)" }} />
                    ) : (
                      <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(150px, 22vh, 250px)", border: "1px solid rgba(168,176,173,0.28)", background: "rgba(228,223,210,0.02)" }}>
                        {m.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                      </svg>
                    )}
                    <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{m.kind}</span>
                      <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{m.cap}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div className="field-label" style={{ fontSize: 10 }}>{d.stamp}</div>
                <h1 className="field-title" style={{ margin: "10px 0 22px", fontWeight: 400, fontSize: "clamp(32px, 3.6vw, 54px)", lineHeight: 1.05, textWrap: "pretty" }}>{d.title}</h1>

                {/* one Fragment per fact — a wrapping div would break the parent's
                    2-column "auto 1fr" grid, since each child pair must land as two
                    direct grid items, not one nested box. */}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 20px", padding: "14px 0 18px", borderTop: "1px solid rgba(168,176,173,0.2)", borderBottom: "1px solid rgba(168,176,173,0.2)", fontFamily: "var(--font-label), monospace", fontSize: 10, letterSpacing: "0.08em" }}>
                  {d.facts.map((f: any) => (
                    <React.Fragment key={f.k}>
                      <div style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(var(--field-mute-rgb), 0.7)" }}>{f.k}</div>
                      <div style={{ color: "var(--field-ink-warm)" }}>{f.v}</div>
                    </React.Fragment>
                  ))}
                </div>

                {d.paras.map((p: any, i: number) => (
                  <p key={i} className="field-body" style={{ margin: "20px 0 0", fontSize: "clamp(15px, 1.1vw, 17px)", lineHeight: 1.68, maxWidth: "60ch" }}>{p.t}</p>
                ))}

                <div className="field-label" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginTop: 34, fontSize: 9 }}>
                  <span>traces left here</span>
                  <span style={{ color: "rgba(110,154,141,0.85)" }}>{v.noteTally}</span>
                </div>
                <div style={{ position: "relative", marginTop: 12, aspectRatio: "3 / 2", border: "1px solid rgba(168,176,173,0.3)", background: "rgba(228,223,210,0.03)" }}>
                  <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.42 }}>
                    {d.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                  </svg>
                  {v.layers.map((l: any, li: number) => (
                    <svg key={li} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: l.op, transition: "opacity 420ms ease" }}>
                      {l.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={l.ink} strokeWidth={s.w} strokeLinecap="round" />)}
                    </svg>
                  ))}
                  <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.65)" }}>{v.overlayLabel}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 1, marginTop: 1, background: "rgba(168,176,173,0.16)" }}>
                  {v.hands.map((h: any, hi: number) => (
                    <div key={hi} role="button" tabIndex={0} onMouseEnter={h.enter} onMouseLeave={h.leave} onFocus={h.enter} onBlur={h.leave} onClick={h.open} onKeyDown={h.key} style={{ padding: "12px 13px 13px", background: h.bg, cursor: "pointer", outline: "none", transition: "background 400ms ease" }}>
                      <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, color: h.byColor }}>
                        <span style={{ width: 7, height: 7, background: h.ink, opacity: h.dot }} />
                        <span>{h.by}</span>
                      </div>
                      <div className="field-body" style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.45, color: h.txtColor, transition: "color 400ms ease" }}>{h.short}</div>
                    </div>
                  ))}
                </div>

                <div role="button" tabIndex={0} onClick={v.onNotesToggle} onKeyDown={v.onNotesToggleKey} className="field-label field-label-accent field-hover-accent" style={{ marginTop: 12, cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>{v.gridHint}</div>

                {v.notesOpen && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "16px 14px", marginTop: 14, animation: "am-in 300ms ease both" }}>
                    {v.notesHere.map((nn: any, ni: number) => (
                      <div key={ni} role="button" tabIndex={0} onClick={nn.open} onKeyDown={nn.key} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 7, cursor: "pointer", outline: "none", opacity: 0.72, transition: "opacity 400ms ease" }}>
                        {nn.sheet && (
                          <div style={{ height: 98, border: "1px solid rgba(228,223,210,0.16)", backgroundColor: "rgba(11,16,18,0.9)", backgroundImage: nn.imgCss || undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
                            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                              {nn.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={nn.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.85} />)}
                            </svg>
                          </div>
                        )}
                        {nn.written && (
                          <div className="field-label" style={{ display: "flex", alignItems: "flex-end", height: 98, padding: "0 0 8px", borderBottom: "1px solid rgba(228,223,210,0.16)", fontSize: 8, color: "rgba(var(--field-mute-rgb), 0.55)" }}>written · no sheet</div>
                        )}
                        <div className="field-body" style={{ fontSize: 12, lineHeight: 1.4 }}>{nn.short}</div>
                        <div className="field-label" style={{ fontSize: 8.5, letterSpacing: "0.16em" }}>{nn.by}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-bg" style={{ marginTop: 14, padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--field-accent)", transition: "background 500ms ease" }}>leave a trace of your own</div>

                {v.passing && (
                  <div role="button" tabIndex={0} onClick={v.onFollowPassing} onKeyDown={v.onFollowPassingKey} className="field-hover-bg" style={{ marginTop: 26, padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", transition: "background 500ms ease" }}>
                    <div className="field-label" style={{ fontSize: 9 }}>someone came through here</div>
                    <div className="field-body" style={{ marginTop: 5, fontSize: 14, lineHeight: 1.4 }}>{v.passing}</div>
                  </div>
                )}

                <div className="field-label" style={{ marginTop: 34, fontSize: 9 }}>leads elsewhere</div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                  {v.assocs.map((a: any, ai: number) => (
                    <div key={ai} role="button" tabIndex={0} onClick={a.go} onKeyDown={a.key} className="field-hover-padleft" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px 12px 0", borderTop: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", transition: "padding-left 500ms cubic-bezier(0.22,1,0.36,1), background 500ms ease" }}>
                      <span style={{ flex: "0 0 auto", fontFamily: "var(--font-label), monospace", fontSize: 10, color: "rgba(110,154,141,0.85)" }}>↓</span>
                      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <span className="field-body" style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--field-mist)" }}>{a.reason}</span>
                        <span className="field-title" style={{ display: "block", marginTop: 3, fontSize: 17, lineHeight: 1.2 }}>{a.title}</span>
                      </span>
                    </div>
                  ))}
                  <div role="button" tabIndex={0} onClick={v.onElsewhere} onKeyDown={v.onElsewhereKey} className="field-hover-mist" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px", borderTop: "1px solid rgba(168,176,173,0.2)", borderBottom: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", color: "rgba(var(--field-mute-rgb), 0.7)", transition: "color 400ms ease" }}>
                    <span style={{ fontFamily: "var(--font-label), monospace", fontSize: 10 }}>⤳</span>
                    <span className="field-label" style={{ fontSize: 10 }}>somewhere unrelated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: "0 0 auto", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid rgba(168,176,173,0.16)" }}>
            <div data-role="liftbar" style={{ position: "absolute", left: 0, top: -1, height: 1, width: "0%", background: "var(--field-accent)" }} />
            <span data-role="lifthint" className="field-label" style={{ fontSize: 9 }}>scroll sideways to put it back</span>
          </div>
        </div>
      </div>
    );
  }

  private renderCatalogue(v: V) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 38, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)" }}>The index</span>
            <span className="field-label" style={{ fontSize: 9.5 }}>{v.journeyTally}</span>
          </div>
          <div role="button" tabIndex={0} onClick={v.onCloseCatalogue} onKeyDown={v.onCloseCatalogueKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>back to the field</div>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "clamp(24px, 4vh, 46px) clamp(20px, 4vw, 56px) 60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: "clamp(30px, 4vw, 58px) clamp(24px, 3vw, 44px)" }}>
            {v.journeys.map((j: any, ji: number) => (
              <div key={j.name + ji} role="button" tabIndex={0} onClick={j.enter} onKeyDown={j.key} onMouseEnter={j.enter_hover} onMouseLeave={j.leave_hover} onFocus={j.enter_hover} onBlur={j.leave_hover} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", outline: "none", opacity: 0.82, transition: "opacity 420ms ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, perspective: 1500, perspectiveOrigin: "50% 50%", borderBottom: "1px solid rgba(168,176,173,0.14)" }}>
                  <div style={{ position: "relative", width: "100%", height: 240, transformStyle: "preserve-3d" }}>
                    {j.pages.map((pg: any, pi: number) => (
                      <div key={pi} style={{ position: "absolute", left: "50%", top: "50%", width: 250, height: 172, margin: "-86px 0 0 -125px", transform: `translate3d(${pg.x}, ${pg.y}, 0) rotateY(-62deg)`, transformOrigin: "50% 50%", border: "1px solid rgba(228,223,210,0.2)", background: "var(--field-bg-mid)", opacity: pg.op, transition: "opacity 420ms ease" }}>
                        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                          {pg.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                        </svg>
                      </div>
                    ))}
                    <div style={{ position: "absolute", left: "50%", top: "50%", width: 250, height: 172, margin: "-86px 0 0 -125px", transform: `translate3d(${j.spineX}, ${j.spineY}, 0) rotateY(-62deg)`, transformOrigin: "50% 50%", background: j.color, opacity: j.spineOp, transition: "opacity 420ms ease" }} />
                    <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ position: "absolute", inset: -14, width: "calc(100% + 28px)", height: "calc(100% + 28px)", pointerEvents: "none", overflow: "visible" }}>
                      <path d={j.route} pathLength={1} fill="none" stroke={j.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" style={{ strokeDashoffset: j.routeOff, opacity: j.routeOp, transition: "stroke-dashoffset 1500ms cubic-bezier(0.22,1,0.36,1), opacity 500ms ease" }} />
                      <path d={j.routeNodes} fill="none" stroke={j.color} strokeWidth={1.7} strokeLinecap="round" style={{ opacity: j.nodeOp, transition: "opacity 700ms ease 500ms" }} />
                    </svg>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="field-body" style={{ fontSize: 14.5, lineHeight: 1.4, color: "var(--field-ink)" }}>{j.name}</div>
                  <div className="field-label" style={{ fontSize: 9 }}>{j.meta}</div>
                  <div style={{ fontFamily: "var(--font-label), monospace", fontSize: 9, letterSpacing: "0.1em", color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.span}</div>
                  <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px 18px", marginTop: 5, fontFamily: "var(--font-label), monospace", fontSize: 8.5, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    <span style={{ color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.kind}</span>
                    <span role="button" tabIndex={0} onClick={j.keep} onKeyDown={j.keepKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: j.keptColor, transition: "color 400ms ease" }}>{j.keptLabel}</span>
                    {j.isTable && (
                      <span role="button" tabIndex={0} onClick={j.flat} onKeyDown={j.flatKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "rgba(110,154,141,0.8)", transition: "color 400ms ease" }}>{j.flatLabel}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  private renderView(v: V) {
    const view = v.view;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 44, background: "rgba(6,10,11,0.95)", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 3vh, 40px)", animation: "am-in 400ms ease both" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(22px, 3.4vw, 52px)", alignItems: "center", width: "min(1120px, 100%)", maxHeight: "100%", overflowY: "auto" }}>
          <div style={{ position: "relative", aspectRatio: "3 / 2", border: "1px solid rgba(168,176,173,0.28)" }}>
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}>
              {view.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
            </svg>
            {view.img && (
              <div role="img" aria-label="an uploaded sketch" style={{ position: "absolute", inset: 0, backgroundImage: view.imgCss, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
            )}
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {view.marks.map((s: NoteMark, i: number) => <path key={i} d={s.d} fill="none" stroke={view.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.9} />)}
            </svg>
            <div className="field-label" style={{ position: "absolute", left: 10, bottom: 8, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.65)" }}>{view.stamp}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.24em" }}>a trace laid over</div>
            <div className="field-title" style={{ fontSize: "clamp(24px, 2.6vw, 38px)", lineHeight: 1.08, textWrap: "pretty" }}>{view.title}</div>
            <div className="field-body" style={{ marginTop: 6, fontSize: "clamp(16px, 1.4vw, 20px)", lineHeight: 1.55, maxWidth: "46ch" }}>{view.txt}</div>
            <div className="field-label" style={{ fontSize: 9 }}>{view.by}</div>
            {view.walk && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10, paddingLeft: 13, borderLeft: "1px solid rgba(110,154,141,0.4)" }}>
                <div className="field-label" style={{ fontSize: 9, lineHeight: 1.6, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{view.walk}</div>
                {v.journey.map((j: any, ji: number) => (
                  <div key={ji} role="button" tabIndex={0} onClick={j.go} onKeyDown={j.key} className="field-hover-accent" style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 9.5, letterSpacing: "0.08em", color: j.color, transition: "color 400ms ease" }}>
                    <span style={{ flex: "0 0 auto", color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.n}</span>
                    <span style={{ flex: "1 1 auto", minWidth: 0 }}>{j.title}</span>
                    <span style={{ flex: "0 0 auto", color: "rgba(110,154,141,0.8)" }}>{j.here}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="field-label" style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 16, fontSize: 10, letterSpacing: "0.22em" }}>
              {v.viewFollow && (
                <div role="button" tabIndex={0} onClick={v.onFollowTrace} onKeyDown={v.onFollowTraceKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>{v.viewFollow}</div>
              )}
              <div role="button" tabIndex={0} onClick={v.onCloseNote} onKeyDown={v.onCloseNoteKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.65)", cursor: "pointer", outline: "none" }}>put it back</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderCompose(v: V) {
    const c = v.compose;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(6,10,11,0.97)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "15px clamp(18px, 3vw, 42px)", borderBottom: "1px solid rgba(168,176,173,0.16)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, minWidth: 0 }}>
            <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9.5, letterSpacing: "0.24em", color: "var(--field-accent)" }}>tracing paper</span>
            <span className="field-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 17 }}>{c.title}</span>
          </div>
          <div role="button" tabIndex={0} onClick={v.onDiscard} onKeyDown={v.onDiscardKey} className="field-label field-hover-accent" style={{ flex: "0 0 auto", cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.75)", transition: "color 400ms ease" }}>lift the paper off</div>
        </div>
        <div style={{ flex: "1 1 auto", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "clamp(16px, 3vh, 32px) clamp(16px, 3vw, 40px) 34px" }}>
          <div style={{ position: "relative", width: "min(840px, 92vw, 93vh)", aspectRatio: "3 / 2", border: "1px solid rgba(168,176,173,0.3)" }}>
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
              {c.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
            </svg>
            <div style={{ position: "absolute", inset: 0, background: "rgba(228,223,210,0.04)", pointerEvents: "none" }} />
            {c.img && (
              <div role="img" aria-label="an uploaded sketch" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: c.imgCss, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
            )}
            {/* bindPaper() owns width/height attrs on this canvas for DPR-correct drawing —
                JSX only sets CSS size, never the element's width/height attributes. */}
            <canvas data-role="paper" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }} />
            <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.6)" }}>draw straight onto the sheet</div>
          </div>
          <div className="field-label" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 26, fontSize: 9.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div role="button" tabIndex={0} onClick={v.onFine} onKeyDown={v.onFineKey} style={{ cursor: "pointer", outline: "none", color: c.fine }}>fine</div>
              <div role="button" tabIndex={0} onClick={v.onMedium} onKeyDown={v.onMediumKey} style={{ cursor: "pointer", outline: "none", color: c.medium }}>medium</div>
              <div role="button" tabIndex={0} onClick={v.onBroad} onKeyDown={v.onBroadKey} style={{ cursor: "pointer", outline: "none", color: c.broad }}>broad</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 15, color: "rgba(var(--field-mute-rgb), 0.75)" }}>
              <div role="button" tabIndex={0} onClick={v.onUndo} onKeyDown={v.onUndoKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none" }}>undo</div>
              <div role="button" tabIndex={0} onClick={v.onClearPaper} onKeyDown={v.onClearPaperKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none" }}>clear</div>
              <label className="field-hover-accent" style={{ position: "relative", cursor: "pointer" }}>
                {c.uploadLabel}
                <input type="file" accept="image/*" onChange={v.onUpload} style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0 }} />
              </label>
            </div>
          </div>
          <input
            value={v.noteTxt}
            onChange={v.onNoteTxt}
            autoComplete="off"
            spellCheck={false}
            aria-label="what it did to your perception"
            placeholder="what it did to your perception"
            className="field-input field-body field-focus-border"
            style={{ width: "min(680px, 92vw)", borderBottom: "1px solid rgba(228,223,210,0.22)", padding: "8px 2px 10px", textAlign: "center", fontSize: "clamp(15px, 1.6vw, 20px)", color: "var(--field-ink)" }}
          />
          <div className="field-label" style={{ display: "flex", gap: 28, fontSize: 10, letterSpacing: "0.24em" }}>
            <div role="button" tabIndex={0} onClick={v.onCommitNote} onKeyDown={v.onCommitNoteKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>leave it here</div>
            <div role="button" tabIndex={0} onClick={v.onDiscard} onKeyDown={v.onDiscardKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.6)", cursor: "pointer", outline: "none" }}>discard</div>
          </div>
        </div>
      </div>
    );
  }

  private renderPlan(v: V) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 36, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px 16px" }}>
              <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)", lineHeight: 1 }}>The field from above</span>
              <span className="field-label" style={{ fontSize: 9.5 }}>{v.planTally}</span>
            </div>
            <span className="field-label" style={{ fontSize: 8.5, lineHeight: 1.6, letterSpacing: "0.2em", color: "rgba(var(--field-mute-rgb), 0.45)" }}>worn things sit larger · kept routes run heavier · point at a mark for its name</span>
          </div>
          <div role="button" tabIndex={0} onClick={v.onClosePlan} onKeyDown={v.onClosePlanKey} className="field-label field-hover-accent" style={{ flex: "0 0 auto", whiteSpace: "nowrap", cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>stand back up</div>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(14px, 3vh, 34px)" }}>
          <div data-role="planbox" style={{ position: "relative", height: "100%", aspectRatio: "1 / 1", maxWidth: "100%", border: "1px solid rgba(168,176,173,0.16)" }}>
            <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
              {/* out.planEdges (an array) shadows props.planEdges (the boolean gate) at
                  runtime since renderVals() spreads last — cast past V's static boolean type. */}
              {(v.planEdges as any as { d: string }[]).map((e: any, ei: number) => (
                <path key={ei} d={e.d} fill="none" stroke="var(--field-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.12} />
              ))}
              {v.planWalks.map((w: any, wi: number) => (
                <path key={wi} d={w.d} fill="none" stroke={w.color} strokeWidth={w.w} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={w.op} />
              ))}
              <path d={v.planMine} fill="none" stroke="var(--field-walk)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
            </svg>
            {/* placePlanLabels() reads n.children[0] as the marker dot and n.children[1] as
                the label span by position — keep exactly these two children, in this order. */}
            {v.planNodes.map((p: any) => (
              <div key={p.id} data-pid={p.id} data-side={p.side} role="button" tabIndex={0} onClick={p.go} onKeyDown={p.key} onMouseEnter={p.enter} onMouseLeave={p.leave} onFocus={p.enter} onBlur={p.leave} style={{ position: "absolute", left: p.x, top: p.y, width: 0, height: 0, zIndex: p.z, cursor: "pointer", outline: "none", opacity: p.op, transition: "opacity 300ms ease" }}>
                <span style={{ position: "absolute", left: 0, top: 0, transform: "translate(-50%, -50%)", width: p.size, height: p.size, border: `1px solid ${p.ink}`, background: "rgba(228,223,210,0.07)" }} />
                <span style={{ position: "absolute", top: 0, left: p.lox, transform: p.ltf, whiteSpace: "nowrap", fontFamily: "var(--font-label), monospace", fontSize: 8.5, letterSpacing: "0.1em", color: p.labelInk, opacity: p.labelOp, transition: "opacity 260ms ease" }}>{p.title}</span>
              </div>
            ))}
            <div data-role="planyou" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, border: "1px solid var(--field-walk)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", left: 0, top: -22, width: 1, height: 22, background: "var(--field-walk)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderTable(v: V) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 37, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)" }}>The table</span>
            <span className="field-label" style={{ fontSize: 9.5 }}>{v.tableHint}</span>
          </div>
          <div role="button" tabIndex={0} onClick={v.onCloseTable} onKeyDown={v.onCloseTableKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>back to the field</div>
        </div>
        <div data-role="tablesurface" style={{ flex: "1 1 auto", position: "relative", minHeight: 0, margin: "clamp(12px, 2vh, 26px) clamp(20px, 4vw, 56px)", border: "1px solid rgba(168,176,173,0.12)", background: "rgba(228,223,210,0.012)", touchAction: "none", overflow: "hidden" }}>
          {v.tableItems.map((it: any) => (
            <div key={it.id} onPointerDown={it.down} style={{ position: "absolute", left: it.x, top: it.y, width: "clamp(132px, 12vw, 172px)", transform: "translate(-50%, -50%)", cursor: "grab", touchAction: "none", userSelect: "none" }}>
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(88px, 8vw, 114px)", border: "1px solid rgba(168,176,173,0.42)", background: "rgba(228,223,210,0.05)" }}>
                {it.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
              </svg>
              <div className="field-label" style={{ height: 12, marginTop: 7, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 8.5, lineHeight: "12px" }}>{it.stamp}</div>
              <div className="field-title" style={{ height: 36, marginTop: 3, overflow: "hidden", fontSize: 15, lineHeight: 1.16 }}>{it.title}</div>
              <div role="button" tabIndex={0} onClick={it.off} onKeyDown={it.offKey} className="field-hover-walk" style={{ height: 11, lineHeight: "11px", marginTop: 6, cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--field-mute-rgb), 0.45)", transition: "color 400ms ease" }}>put it back</div>
            </div>
          ))}
          {v.tableEmpty && (
            <div className="field-body" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.6, color: "rgba(201,197,185,0.45)", maxWidth: "46ch", margin: "auto" }}>Nothing has been set aside yet. Walk the field, and set aside anything you want to see next to something else.</div>
          )}
        </div>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px clamp(18px, 3vw, 34px)", padding: "0 clamp(20px, 4vw, 56px) clamp(18px, 3vh, 30px)" }}>
          <input
            value={v.bindName}
            onChange={v.onBindName}
            autoComplete="off"
            spellCheck={false}
            aria-label="name this set"
            placeholder="name this set"
            className="field-input field-body field-focus-border"
            style={{ flex: "1 1 260px", minWidth: 0, borderBottom: "1px solid rgba(228,223,210,0.22)", padding: "7px 2px 9px", fontSize: "clamp(15px, 1.5vw, 19px)", color: "var(--field-ink)" }}
          />
          <div className="field-label" style={{ display: "flex", alignItems: "center", gap: "clamp(18px, 3vw, 30px)", fontSize: 9.5, letterSpacing: "0.22em" }}>
            <div role="button" tabIndex={0} onClick={v.onBind} onKeyDown={v.onBindKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: v.bindColor, transition: "color 400ms ease" }}>bind it</div>
            <div role="button" tabIndex={0} onClick={v.onClearTable} onKeyDown={v.onClearTableKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "rgba(var(--field-mute-rgb), 0.55)", transition: "color 400ms ease" }}>clear the table</div>
          </div>
        </div>
      </div>
    );
  }

  private renderNaming(v: V) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(6,10,11,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, animation: "am-in 600ms ease both" }}>
        <form onSubmit={v.onCommitName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "min(560px, 100%)" }}>
          <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.28em", color: "var(--field-mist)" }}>{v.nameStamp}</div>
          <input
            value={v.nameValue}
            onChange={v.onNameChange}
            autoComplete="off"
            aria-label="name this trace"
            className="field-input field-body field-focus-border"
            style={{ width: "100%", borderBottom: "1px solid rgba(228,223,210,0.28)", padding: "8px 2px 10px", textAlign: "center", fontSize: "clamp(17px, 2vw, 26px)", color: "var(--field-ink)" }}
          />
          <div className="field-label" style={{ display: "flex", gap: 26, fontSize: 10, letterSpacing: "0.24em" }}>
            <div role="button" tabIndex={0} onClick={v.onCommitName} onKeyDown={v.onCommitNameKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>let it go</div>
            <div role="button" tabIndex={0} onClick={v.onCancelName} onKeyDown={v.onCancelNameKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.6)", cursor: "pointer", outline: "none" }}>keep walking</div>
          </div>
        </form>
      </div>
    );
  }

  render() {
    // renderVals() is called exactly once per render — it mutates this.nodes in place
    // and allocates fresh handler closures, so calling it twice would double that work
    // and churn identities every commit.
    const v: V = { ...this.props, ...this.renderVals() };
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--field-bg)", color: "var(--field-ink)", fontFamily: "var(--font-body), Georgia, serif" }}>
        {this.renderStage(v)}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, background: "radial-gradient(140% 110% at 50% 50%, transparent 44%, rgba(6,10,11,0.84) 100%)" }} />
        {this.renderHud(v)}
        {v.jump && this.renderJump(v)}
        {v.focus && this.renderFocusbar(v)}
        {v.hasTrace && this.renderTraceRail(v)}
        {v.inJourney && this.renderJourneybar(v)}
        {this.renderHint()}
        {v.others && this.renderOthers(v)}
        {v.detail && this.renderDetail(v)}
        {this.renderMediaStage(v)}
        {v.catalogue && this.renderCatalogue(v)}
        {v.view && this.renderView(v)}
        {v.compose && this.renderCompose(v)}
        {v.plan && this.renderPlan(v)}
        {v.table && this.renderTable(v)}
        {v.naming && this.renderNaming(v)}
      </div>
    );
  }
}
