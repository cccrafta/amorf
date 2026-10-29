// Interior: an entity's pannable composition — its layout, panning with momentum and rubber-band, and the pull-back that returns to the field.
import type Field from "./Field";
import type { FieldNode, State, Vals } from "./types";
import { rand, key } from "./util";
import { plate } from "./plate";
import { stowMedia } from "./media";
import { liveMedia, rendererFor } from "@/lib/media/registry";

// Pull (0..1) at which letting go leaves; depth falls by DEPTH_DROP at full pull so the dive visibly loosens.
const COMMIT = 0.55;
const DEPTH_DROP = 0.8;
// Momentum decay constant (ms). A wheel impulse of delta/PAN_TAU travels exactly delta in total.
const PAN_TAU = 240;
const EDGE = 48;
const PAD = 36;
// Card height is ~300px against a 226px plate, so the plate centre sits this far above the card centre.
const PLATE_DROP = 37;

export type Phase = "idle" | "approach" | "inside" | "leaving";
type Rect = { x: number; y: number; w: number; h: number };
type Item = { key: string; kind: string; w: number; h: number; data?: unknown; at?: [number, number] };
type Layout = { w: number; h: number; focus: { x: number; y: number }; pos: Record<string, { x: number; y: number }> };
export type Comp = { id: string; dims: string; w: number; h: number; focus: { x: number; y: number } };

export type Interior = {
  phase: Phase;
  depth: number;
  depthWant: number;
  pullWant: number;
  enterAt: number;
  panX: number;
  panY: number;
  vx: number;
  vy: number;
  panKey: string;
  panDims: string;
  panLoX: number;
  panLoY: number;
  goal: { x: number; y: number } | null;
  comp: Comp | null;
  drag: { id: number; x: number; y: number; t: number; moved: number; captured: boolean } | null;
  pointers: Map<number, { x: number; y: number }>;
  pinchD0: number;
  gesture: boolean;
  pinchPull: number;
  wheelAt: number;
  wasHolding: boolean;
  movedAt: number;
  cardRect: Rect | null;
  leaveTo: { id: string; mark: string; friction: boolean } | null;
  layoutKey: string;
  layout: Layout | null;
  placed: { id: string; dims: string; pos: Layout["pos"] } | null;
  paintKey: string;
  compKey: string;
  barKey: string;
  stageKey: string;
  root: HTMLElement | null;
  surface: HTMLElement | null;
  bar: HTMLElement | null;
  hint: HTMLElement | null;
};

export const newInterior = (): Interior => ({
  phase: "idle", depth: 0, depthWant: 0, pullWant: 0, enterAt: 0,
  panX: 0, panY: 0, vx: 0, vy: 0, panKey: "", panDims: "", panLoX: 0, panLoY: 0, goal: null, comp: null,
  drag: null, pointers: new Map(), pinchD0: 1, gesture: false, pinchPull: 0, wheelAt: 0, wasHolding: false, movedAt: 0,
  cardRect: null, leaveTo: null, layoutKey: "", layout: null, placed: null,
  paintKey: "", compKey: "", barKey: "", stageKey: "",
  root: null, surface: null, bar: null, hint: null,
});

const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function begin(f: Field) {
  const ix = f.ix;
  ix.phase = "approach"; ix.enterAt = performance.now();
  ix.depthWant = 0; ix.pullWant = 0; ix.pinchPull = 0; ix.wasHolding = false;
  ix.drag = null; ix.pointers.clear(); ix.gesture = false; ix.vx = 0; ix.vy = 0; ix.goal = null;
  ix.panKey = ""; ix.cardRect = null; ix.leaveTo = null;
}

// Pull back out: depth runs to zero, then step() closes the interior and, if a destination was set, flies there.
// Never ticks: glide() calls this from inside frame(); event-handler callers go through Field.collapse().
export function collapse(f: Field) {
  const ix = f.ix;
  if (ix.phase === "leaving" || (!f.state.open && ix.depth < 0.02)) return;
  ix.phase = "leaving"; ix.depthWant = 0;
}

export function leaveToward(f: Field, id: string, mark = "↓", friction = true) {
  if (!f.state.open) { f.flyTo(id, mark, friction, true); return; }
  f.ix.leaveTo = { id, mark, friction };
  collapse(f);
}

// For callers that unmount the interior themselves: the live element has to leave its slot first.
export function dismiss(f: Field) {
  const ix = f.ix;
  if (f.state.open) stowMedia(f, f.state.open);
  ix.phase = "idle"; ix.depthWant = 0; ix.pullWant = 0; ix.pinchPull = 0; ix.leaveTo = null;
  ix.drag = null; ix.pointers.clear(); ix.gesture = false;
}

// Beyond an edge a step is scaled down quadratically with the distance already past it, so the
// composition stretches and then refuses; a step crossing the edge from inside is halved past it.
function axis(p: number, d: number, lo: number, hi: number, L: number): number {
  if (!d) return p;
  const over = p < lo ? lo - p : p > hi ? p - hi : 0;
  if ((p < lo && d < 0) || (p > hi && d > 0)) d *= Math.pow(Math.max(0, 1 - over / L), 2);
  let n = p + d;
  if (p >= lo && p <= hi && (n < lo || n > hi)) { const e = n < lo ? lo : hi; n = e + (n - e) * 0.5; }
  return clampN(n, lo - L * 0.97, hi + L * 0.97);
}

const limits = (comp: Comp) => {
  const W = window.innerWidth, H = window.innerHeight;
  return { W, H, loX: Math.min(0, W - comp.w), loY: Math.min(0, H - comp.h), L: Math.min(0.3 * Math.min(W, H), 220) };
};

function nudge(f: Field, dx: number, dy: number) {
  const ix = f.ix, c = ix.comp; if (!c) return;
  const { loX, loY, L } = limits(c);
  ix.panX = axis(ix.panX, dx, loX, 0, L);
  ix.panY = axis(ix.panY, dy, loY, 0, L);
}

const kick = (f: Field, dx: number, dy: number) => {
  const ix = f.ix;
  if (f.reduced) { nudge(f, dx, dy); return; }
  ix.vx = clampN(ix.vx + dx / PAN_TAU, -6, 6);
  ix.vy = clampN(ix.vy + dy / PAN_TAU, -6, 6);
};

export function keyPan(f: Field, e: KeyboardEvent): boolean {
  const ix = f.ix;
  if (ix.phase !== "inside" || e.metaKey || e.ctrlKey || e.altKey) return false;
  if ((e.target as HTMLElement | null)?.closest?.("video, input, textarea, select")) return false;
  const s = e.shiftKey ? 680 : 260;
  const d: Record<string, [number, number]> = { ArrowLeft: [s, 0], ArrowRight: [-s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] };
  const v = d[e.key]; if (!v) return false;
  ix.goal = null; kick(f, v[0], v[1]); f.tick();
  return true;
}

// Native focus scrolling does not know about the transform, so a focused piece is brought into view by panning.
function reveal(f: Field, t: HTMLElement) {
  const ix = f.ix, c = ix.comp, piece = t.closest<HTMLElement>("[data-piece]");
  if (!c || !piece) return;
  const { W, H, loX, loY } = limits(c), m = 48, r = piece.getBoundingClientRect();
  const fit = (lo: number, hi: number, size: number) => hi - lo > size - 2 * m || lo < m ? m - lo : hi > size - m ? size - m - hi : 0;
  const dx = fit(r.left, r.right, W), dy = fit(r.top, r.bottom, H);
  if (!dx && !dy) return;
  ix.vx = 0; ix.vy = 0;
  ix.goal = { x: clampN(ix.panX + dx, loX, 0), y: clampN(ix.panY + dy, loY, 0) };
}

export function bindInterior(f: Field, host: HTMLElement) {
  const el = host as HTMLElement & { __amorfAbort?: AbortController };
  if (el.__amorfAbort) el.__amorfAbort.abort();
  const ac = new AbortController();
  el.__amorfAbort = ac;
  const sig = { signal: ac.signal };
  const ix = f.ix;
  const pair = () => Array.from(ix.pointers.values());

  el.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault(); f.used();
    if (ix.phase !== "inside") return;
    ix.wheelAt = performance.now(); ix.goal = null;
    // a trackpad pinch arrives as a ctrl-wheel; deltaY > 0 is fingers closing, i.e. pulling back
    if (e.ctrlKey) {
      ix.pinchPull = clampN(ix.pinchPull + e.deltaY * 0.011, 0, 1);
      if (ix.pinchPull >= COMMIT) collapse(f);
      f.tick();
      return;
    }
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    kick(f, -(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit, e.shiftKey ? 0 : -e.deltaY * unit);
    f.tick();
  }, { passive: false, signal: ac.signal });

  el.addEventListener("pointerdown", (e: PointerEvent) => {
    // secondary and ctrl-clicks never get a matching pointerup worth trusting, so they are not tracked at all
    if (ix.phase !== "inside" || e.button !== 0) return;
    ix.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    ix.goal = null; ix.vx = 0; ix.vy = 0;
    if (ix.pointers.size === 2) {
      const [a, b] = pair();
      ix.pinchD0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      ix.drag = null;
      return;
    }
    if ((e.target as HTMLElement).closest("video, [data-nodrag]")) return;
    ix.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0, captured: false };
  }, sig);

  el.addEventListener("pointermove", (e: PointerEvent) => {
    const p = ix.pointers.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (ix.pointers.size > 1) {
      const [a, b] = pair();
      ix.pinchPull = clampN((1 - Math.hypot(a.x - b.x, a.y - b.y) / ix.pinchD0) / 0.4, 0, 1);
      f.tick();
      return;
    }
    const d = ix.drag; if (!d || d.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && e.buttons === 0) { ix.drag = null; ix.pointers.delete(e.pointerId); return; }
    const dx = e.clientX - d.x, dy = e.clientY - d.y, ms = Math.max(1, e.timeStamp - d.t);
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX; d.y = e.clientY; d.t = e.timeStamp;
    // captured only once it is a drag, otherwise the click on a piece would retarget to this element
    if (!d.captured && d.moved > 6) { d.captured = true; try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } }
    nudge(f, dx, dy);
    ix.vx = ix.vx * 0.6 + (dx / ms) * 0.4;
    ix.vy = ix.vy * 0.6 + (dy / ms) * 0.4;
    f.tick();
  }, sig);

  const end = (e: PointerEvent) => {
    ix.pointers.delete(e.pointerId);
    const d = ix.drag;
    if (d && d.id === e.pointerId) {
      ix.drag = null;
      if (d.moved > 6) ix.movedAt = performance.now();
      // holding still before letting go means no fling
      if (f.reduced || e.timeStamp - d.t > 90) { ix.vx = 0; ix.vy = 0; }
      ix.vx = clampN(ix.vx, -4, 4); ix.vy = clampN(ix.vy, -4, 4);
    }
    f.tick();
  };
  el.addEventListener("pointerup", end, sig);
  el.addEventListener("pointercancel", end, sig);

  // Anything that can swallow a pointerup must not leave a pointer behind: a stale one reads as the first finger of a pinch.
  const reset = () => { ix.pointers.clear(); ix.drag = null; ix.pinchPull = 0; ix.gesture = false; };
  el.addEventListener("lostpointercapture", (e: PointerEvent) => { ix.pointers.delete(e.pointerId); if (ix.drag && ix.drag.id === e.pointerId) ix.drag = null; }, sig);
  el.addEventListener("contextmenu", reset, sig);
  window.addEventListener("blur", reset, sig);

  // Safari reports a trackpad pinch as gesture events, not ctrl-wheel.
  el.addEventListener("gesturestart", (e: Event) => { e.preventDefault(); if (ix.phase === "inside") ix.gesture = true; }, { passive: false, signal: ac.signal });
  el.addEventListener("gesturechange", (e: Event) => {
    e.preventDefault();
    if (ix.phase !== "inside") return;
    ix.pinchPull = clampN((1 - (e as Event & { scale: number }).scale) / 0.4, 0, 1);
    f.tick();
  }, { passive: false, signal: ac.signal });
  el.addEventListener("gestureend", (e: Event) => { e.preventDefault(); ix.gesture = false; f.tick(); }, { passive: false, signal: ac.signal });

  el.addEventListener("click", (e: MouseEvent) => {
    if (performance.now() - ix.movedAt < 160) { e.stopPropagation(); e.preventDefault(); }
  }, { capture: true, signal: ac.signal });

  el.addEventListener("focusin", (e: FocusEvent) => reveal(f, e.target as HTMLElement), sig);
}

// Per-frame physics and depth: runs from frame() before the field is drawn, so the field can read the eased depth.
export function step(f: Field, dt: number, now: number) {
  const ix = f.ix, st = f.state;
  const comp = ix.comp && ix.comp.id === st.open ? ix.comp : null;

  if (ix.phase === "approach") {
    const c = f.cam;
    if ((Math.hypot(c.tx - c.x, c.tz - c.z) < 90 && Math.abs(c.tyaw - c.yaw) < 3) || now - ix.enterAt > 1500) ix.phase = "inside";
  }
  if (ix.phase === "inside" && comp) glide(f, comp, dt, now);

  ix.depthWant = ix.phase === "inside" ? 1 - DEPTH_DROP * ix.pullWant : 0;
  if (ix.phase !== "inside" && ix.phase !== "leaving") ix.pullWant = 0;
  const k = f.reduced ? 1 : 1 - Math.exp(-dt / 170);
  ix.depth = clampN(ix.depth + (ix.depthWant - ix.depth) * k, 0, 1);
  if (!ix.depthWant && ix.depth < 0.002) ix.depth = 0;

  // One-shot by phase: without leaving "leaving" first this would close again every frame until the state flushed.
  if (ix.phase === "leaving" && ix.depth < 0.02) {
    ix.depth = 0; ix.phase = "idle";
    const to = ix.leaveTo; ix.leaveTo = null;
    const go = () => { if (to) f.flyTo(to.id, to.mark, to.friction, true); };
    if (st.open) { stowMedia(f, st.open); f.setState({ open: null, hand: null }, go); } else go();
  }
}

function glide(f: Field, comp: Comp, dt: number, now: number) {
  const ix = f.ix, { W, H, loX, loY, L } = limits(comp);
  if (ix.panKey !== comp.id) {
    ix.panKey = comp.id;
    ix.panX = clampN(W / 2 - comp.focus.x, loX, 0);
    ix.panY = clampN(H / 2 - comp.focus.y, loY, 0);
    ix.vx = 0; ix.vy = 0; ix.goal = null;
  } else if (ix.panDims !== comp.dims) {
    // a resize keeps the same place in the composition, as a fraction of its travel
    ix.panX = ix.panLoX ? clampN((ix.panX / ix.panLoX) * loX, loX, 0) : 0;
    ix.panY = ix.panLoY ? clampN((ix.panY / ix.panLoY) * loY, loY, 0) : 0;
    ix.vx = 0; ix.vy = 0; ix.goal = null;
  }
  ix.panDims = comp.dims; ix.panLoX = loX; ix.panLoY = loY;
  const dragging = !!ix.drag || ix.pointers.size > 1 || ix.gesture;
  const holding = dragging || now - ix.wheelAt < 140;
  if (!dragging) {
    if (ix.goal) {
      const kg = f.reduced ? 1 : 1 - Math.exp(-dt / 120);
      ix.panX += (ix.goal.x - ix.panX) * kg; ix.panY += (ix.goal.y - ix.panY) * kg;
      if (Math.abs(ix.goal.x - ix.panX) < 0.5 && Math.abs(ix.goal.y - ix.panY) < 0.5) ix.goal = null;
    } else {
      const decay = Math.exp(-dt / PAN_TAU), travel = PAN_TAU * (1 - decay);
      nudge(f, ix.vx * travel, ix.vy * travel);
      ix.vx *= decay; ix.vy *= decay;
      if (Math.abs(ix.vx) < 0.01) ix.vx = 0;
      if (Math.abs(ix.vy) < 0.01) ix.vy = 0;
    }
  }
  if (!holding) {
    const ks = f.reduced ? 1 : 1 - Math.exp(-dt / 110);
    const back = (p: number, lo: number): [number, boolean] => {
      const t = p < lo ? lo : p > 0 ? 0 : p;
      return t === p ? [p, false] : [Math.abs(t - p) < 0.5 ? t : p + (t - p) * ks, true];
    };
    const [x, bx] = back(ix.panX, loX), [y, by] = back(ix.panY, loY);
    ix.panX = x; ix.panY = y;
    if (bx) ix.vx = 0;
    if (by) ix.vy = 0;
  }

  const over = Math.max(loX - ix.panX, ix.panX, loY - ix.panY, ix.panY, 0);
  ix.pullWant = Math.min(1, Math.max(over / L, ix.pinchPull));
  if (ix.wasHolding && !holding && ix.pullWant >= COMMIT) collapse(f);
  ix.wasHolding = holding;
  if (!holding) ix.pinchPull = 0;
}

function mount(ix: Interior): HTMLElement | null {
  if (ix.root && ix.root.isConnected) return ix.root;
  const root = document.querySelector<HTMLElement>('[data-role="interior"]');
  ix.root = root;
  ix.surface = root ? root.querySelector<HTMLElement>('[data-role="comp"]') : null;
  ix.bar = root ? root.querySelector<HTMLElement>('[data-role="liftbar"]') : null;
  ix.hint = root ? root.querySelector<HTMLElement>('[data-role="lifthint"]') : null;
  ix.paintKey = ""; ix.compKey = ""; ix.barKey = "";
  return root;
}

// Writes the dive transform, pan offset and pull readout. Runs after the cards are placed so the
// rect it grows from is this frame's, not the last one's.
export function paint(f: Field) {
  const ix = f.ix, st = f.state, d = ix.depth;
  if (f.stage) {
    const s = f.reduced || d < 0.001 ? "" : "scale(" + (1 - 0.05 * d).toFixed(4) + ")";
    if (ix.stageKey !== s) { ix.stageKey = s; f.stage.style.transformOrigin = "50% 46%"; f.stage.style.transform = s; }
  }
  if (!st.open) { ix.root = null; return; }
  const root = mount(ix); if (!root) return;
  const W = window.innerWidth, H = window.innerHeight;

  // The plate's rect comes from the card's projected centre and scale (frame() already computed them),
  // not from a layout read; the plate sits PLATE_DROP card-pixels above the card's centre.
  const sp = f.screenPos[st.open];
  if (sp && d < 0.999 && f.els[st.open]?.style.visibility !== "hidden") {
    const ss = f.reduced ? 1 : 1 - 0.05 * d, k = sp.scale * ss, y0 = H * 0.46;
    ix.cardRect = { x: W / 2 + (sp.sx - W / 2) * ss - 170 * k, y: y0 + (sp.sy - y0) * ss - (PLATE_DROP + 113) * k, w: 340 * k, h: 226 * k };
  }
  const c = ix.cardRect || { x: W / 2 - 107, y: H * 0.46 - 71, w: 214, h: 142 };

  // The surface is laid out at full viewport size and scaled so that, clipped, it shows exactly the
  // card's rect at depth 0 and the whole viewport at depth 1.
  let tf = "none", clip = "none";
  const op = f.reduced ? d : Math.min(1, d * 2.2);
  if (!f.reduced && d < 0.999) {
    const e = d * d * (3 - 2 * d);
    const s0 = Math.max(c.w / W, c.h / H), s = s0 + (1 - s0) * e;
    const rw = c.w + (W - c.w) * e, rh = c.h + (H - c.h) * e;
    const rcx = c.x + c.w / 2 + (W / 2 - c.x - c.w / 2) * e, rcy = c.y + c.h / 2 + (H / 2 - c.y - c.h / 2) * e;
    tf = "translate(" + (rcx - (s * W) / 2).toFixed(1) + "px, " + (rcy - (s * H) / 2).toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
    clip = "inset(" + Math.max(0, H / 2 - rh / (2 * s)).toFixed(1) + "px " + Math.max(0, W / 2 - rw / (2 * s)).toFixed(1) + "px)";
  }
  const live = d > 0.4 ? "auto" : "none";
  const pk = tf + "|" + clip + "|" + op.toFixed(3) + "|" + live;
  if (pk !== ix.paintKey) {
    ix.paintKey = pk;
    root.style.transform = tf; root.style.clipPath = clip; root.style.opacity = op.toFixed(3); root.style.pointerEvents = live;
  }
  const cur = ix.drag && ix.drag.moved > 6 ? "grabbing" : "grab";
  if (root.dataset.cur !== cur) { root.dataset.cur = cur; root.style.cursor = cur; }

  const ck = ix.panX.toFixed(1) + "," + ix.panY.toFixed(1);
  if (ix.surface && ck !== ix.compKey) { ix.compKey = ck; ix.surface.style.transform = "translate3d(" + ix.panX.toFixed(1) + "px, " + ix.panY.toFixed(1) + "px, 0)"; }

  const pull = ix.phase === "leaving" ? 1 : ix.pullWant;
  const bk = pull.toFixed(3) + (f.narrow ? "n" : "w");
  if (bk !== ix.barKey) {
    ix.barKey = bk;
    if (ix.bar) ix.bar.style.width = Math.min(100, (pull / COMMIT) * 100).toFixed(1) + "%";
    const t = pull > 0.06 ? "letting it go" : f.narrow ? "pinch in or drag past the edge to leave" : "pinch in, drag past the edge, or esc to leave";
    if (ix.hint && ix.hint.textContent !== t) ix.hint.textContent = t;
  }
}

// Seeded placement. The title and the primary piece sit together near the middle (the start view);
// a few pieces straddle that view's edges so there is always something reaching past it; the rest are
// spread by best-of-N sampling against what is already placed.
function compose(id: string, items: Item[], W: number, H: number, narrow: boolean, primary: string, known: Layout["pos"]): Layout {
  const cw = W * (narrow ? 2.6 : 2.2), ch = H * (narrow ? 2.4 : 1.8);
  const pos: Layout["pos"] = {};
  const boxes: { l: number; t: number; r: number; b: number }[] = [];
  const r = (it: Item, tag: string, n = 0) => rand(id + tag + it.key + n);
  const cx = (it: Item, x: number) => clampN(x, EDGE + it.w / 2, cw - EDGE - it.w / 2);
  const cy = (it: Item, y: number) => clampN(y, EDGE + it.h / 2, ch - EDGE - it.h / 2);
  const crowd = (it: Item, x: number, y: number) => {
    let s = 0;
    for (const q of boxes) {
      const ox = Math.min(x + it.w / 2, q.r + PAD) - Math.max(x - it.w / 2, q.l - PAD);
      const oy = Math.min(y + it.h / 2, q.b + PAD) - Math.max(y - it.h / 2, q.t - PAD);
      if (ox > 0 && oy > 0) s += ox * oy;
    }
    return s;
  };
  const put = (it: Item, x: number, y: number) => {
    pos[it.key] = { x, y };
    boxes.push({ l: x - it.w / 2, t: y - it.h / 2, r: x + it.w / 2, b: y + it.h / 2 });
  };
  const best = (it: Item, tries: number, at: (n: number) => [number, number]) => {
    let bx = 0, by = 0, bs = Infinity;
    for (let n = 0; n < tries; n++) {
      const [x, y] = at(n), s = crowd(it, x, y);
      if (s < bs) { bx = x; by = y; bs = s; if (!s) break; }
    }
    put(it, bx, by);
  };

  // Pieces already placed for this entity and viewport keep their spot; only newcomers are placed.
  const fresh = Object.keys(known).length === 0;
  items.forEach(it => { if (known[it.key]) put(it, known[it.key].x, known[it.key].y); });
  items.forEach(it => { if (it.at && !pos[it.key]) put(it, cx(it, it.at[0] * cw), cy(it, it.at[1] * ch)); });

  const title = items.find(i => i.kind === "title") as Item, prim = items.find(i => i.key === primary) as Item;
  if (!pos[prim.key] || !pos[title.key]) {
    const pinned = !!pos[prim.key];
    let px = pinned ? pos[prim.key].x : cw / 2, py = pinned ? pos[prim.key].y : ch / 2;
    let side = r(title, "side") > 0.5 ? 1 : -1;
    const gap = 44;
    let tx = narrow ? px : px + side * ((prim.w + title.w) / 2 + gap);
    let ty = narrow ? py - (prim.h + title.h) / 2 - gap : py - prim.h / 2 + title.h / 2;
    if (!pinned) {
      const sx0 = Math.min(px - prim.w / 2, tx - title.w / 2), sx1 = Math.max(px + prim.w / 2, tx + title.w / 2);
      const sy0 = Math.min(py - prim.h / 2, ty - title.h / 2), sy1 = Math.max(py + prim.h / 2, ty + title.h / 2);
      const sx = cw / 2 + (r(prim, "jx") - 0.5) * W * 0.1 - (sx0 + sx1) / 2, sy = ch / 2 + (r(prim, "jy") - 0.5) * H * 0.08 - (sy0 + sy1) / 2;
      px += sx; tx += sx; py += sy; ty += sy;
      put(prim, px, py);
    }
    if (!pos[title.key]) {
      // the clamp must not drag the title onto the primary piece: flip it to the other side instead
      if (narrow && cy(title, ty) !== ty) ty = py + (prim.h + title.h) / 2 + gap;
      if (!narrow && cx(title, tx) !== tx) { side = -side; tx = px + side * ((prim.w + title.w) / 2 + gap); }
      put(title, cx(title, tx), cy(title, ty));
    }
  }
  const P = pos[prim.key], T = pos[title.key];
  const gl = Math.min(P.x - prim.w / 2, T.x - title.w / 2), gr = Math.max(P.x + prim.w / 2, T.x + title.w / 2);
  const gt = Math.min(P.y - prim.h / 2, T.y - title.h / 2), gb = Math.max(P.y + prim.h / 2, T.y + title.h / 2);
  const focus = { x: (gl + gr) / 2, y: (gt + gb) / 2 };

  const vx0 = clampN(focus.x - W / 2, 0, cw - W), vy0 = clampN(focus.y - H / 2, 0, ch - H), vx1 = vx0 + W, vy1 = vy0 + H;
  const rest = items.filter(i => !pos[i.key]);
  if (fresh) rest.filter(i => ["media", "video", "para", "traces", "note"].indexOf(i.kind) > -1)
    .sort((a, b) => r(a, "b") - r(b, "b"))
    .slice(0, 3)
    .forEach(it => {
      const edge = Math.floor(r(it, "e") * 4);
      best(it, 14, n => {
        const u = 0.18 + 0.64 * r(it, "u", n), j = (r(it, "j", n) - 0.5) * 0.3;
        if (edge === 0) return [cx(it, vx1 + it.w * j), cy(it, vy0 + H * u)];
        if (edge === 1) return [cx(it, vx0 + it.w * j), cy(it, vy0 + H * u)];
        if (edge === 2) return [cx(it, vx0 + W * u), cy(it, vy1 + it.h * j)];
        return [cx(it, vx0 + W * u), cy(it, vy0 + it.h * j)];
      });
    });
  rest.filter(i => !pos[i.key])
    .sort((a, b) => b.w * b.h - a.w * a.h || (a.key < b.key ? -1 : 1))
    .forEach(it => best(it, 90, n => [
      EDGE + it.w / 2 + r(it, "x", n) * Math.max(0, cw - 2 * EDGE - it.w),
      EDGE + it.h / 2 + r(it, "y", n) * Math.max(0, ch - 2 * EDGE - it.h),
    ]));
  return { w: cw, h: ch, focus, pos };
}

export function interiorVals(f: Field, st: State, out: Vals): void {
  const o: FieldNode | null = st.open ? f.byId(st.open) : null;
  if (!o) { out.interior = null; return; }
  const W = window.innerWidth, H = window.innerHeight, narrow = W < 760;
  const tw = narrow ? W * 0.8 : clampN(W * 0.3, 340, 520);
  const tfs = narrow ? 32 : Math.round(clampN(W * 0.032, 38, 56));
  const pw = narrow ? Math.min(W * 0.72, 300) : clampN(W * 0.23, 270, 380);
  const pfs = narrow ? 15 : 16.5;
  const textH = (s: string, w: number, fs: number) => Math.ceil((s.length * fs * 0.56) / w) * fs * 1.68 + 24;
  const stamp = o.k + (o.y ? " · " + o.y : "");

  const items: Item[] = [];
  const add = (k: string, kind: string, w: number, h: number, data?: unknown, at?: [number, number]) => items.push({ key: k, kind, w, h, data, at });
  add("title", "title", tw, Math.ceil((o.t.length * tfs * 0.52) / tw) * tfs * 1.08 + 44, { stamp, title: o.t, fs: tfs });
  const plateW = narrow ? W * 0.74 : clampN(W * 0.3, 340, 560);
  add("plate", "plate", plateW, plateW * 0.62 + 36, { plate: plate(o), stamp });
  const yfs = narrow ? 40 : Math.round(clampN(W * 0.04, 48, 76));
  add("year", "year", narrow ? 190 : 250, yfs * 1.2 + 30, { year: o.y || "undated", fs: yfs });
  add("place", "place", narrow ? 250 : 290, 170, {
    place: o.place || "unplaced",
    facts: [{ k: "medium", v: o.k }, { k: "source", v: o.src || "unattributed" }, { k: "tags", v: o.tags.slice(0, 5).join(" · ") }],
  });
  o.p.forEach((t, i) => add("p" + i, "para", pw, textH(t, pw, pfs), { t, fs: pfs }));

  const live = liveMedia(o);
  (o.media || []).forEach((m, i) => {
    if (rendererFor(m.kind)) {
      if (live && live.index === i) { const vw = narrow ? W * 0.84 : clampN(W * 0.4, 420, 680); add("m" + i, "video", vw, vw * 0.5625 + 48, { kind: m.kind, cap: m.cap }, m.at); }
      return;
    }
    const mw = (narrow ? W * 0.6 : clampN(W * 0.22, 250, 400)) * (0.85 + rand(o.id + "mw" + i) * 0.3), ar = 0.62 + rand(o.id + "ma" + i) * 0.2;
    add("m" + i, "media", mw, mw * ar + 56, { kind: m.kind, cap: m.cap, img: m.img || null, imgCss: m.img ? "url(" + m.img + ")" : null, plate: plate(o, "v" + i, m.kind), ar }, m.at);
  });

  (out.notesHere as Vals[]).forEach(n => add("n" + n.id, "note", narrow ? 190 : 215, 170 + Math.ceil(n.short.length / 28) * 18, n));
  add("traces", "traces", narrow ? 250 : 300, 270, { plate: plate(o) });
  add("actions", "actions", 260, 120, null);

  const p = f.passingTrace();
  if (p) {
    const nextId = p.trace.steps[p.index + 1], go = () => { f.setState({ joined: p.trace.name }); f.leaveToward(nextId, "↓", false); };
    add("passing", "passing", 260, 96, { name: p.trace.name, go, key: key(go) });
  }
  f.ASSOC.filter(a => a[0] === o.id || a[1] === o.id).slice(0, 4).forEach((a, i) => {
    const other = a[0] === o.id ? a[1] : a[0], go = () => f.leaveToward(other, "↓", true);
    add("a" + i, "assoc", 270, 100, { reason: a[2], title: f.byId(other).t, go, key: key(go) });
  });
  add("elsewhere", "elsewhere", 230, 56, null);
  out.onElsewhere = () => {
    const others = f.OBJECTS.filter(q => q.id !== st.open), pick = others[Math.floor(Math.random() * others.length)];
    f.setState({ joined: null });
    f.leaveToward(pick.id, "⤳", false);
  };
  out.onElsewhereKey = key(out.onElsewhere);

  const ix = f.ix;
  const dims = W + "x" + H, lk = o.id + ":" + dims + ":" + items.map(i => i.key + Math.round(i.h)).join(",");
  if (!ix.placed || ix.placed.id !== o.id || ix.placed.dims !== dims) ix.placed = { id: o.id, dims, pos: {} };
  if (ix.layoutKey !== lk || !ix.layout) {
    ix.layout = compose(o.id, items, W, H, narrow, live ? "m" + live.index : "plate", ix.placed.pos);
    Object.assign(ix.placed.pos, ix.layout.pos);
    ix.layoutKey = lk;
  }
  const lay = ix.layout;
  ix.comp = { id: o.id, dims, w: lay.w, h: lay.h, focus: lay.focus };
  out.interior = {
    ref: "[a}morf · " + String(f.OBJECTS.indexOf(o) + 1).padStart(3, "0") + " / " + f.OBJECTS.length,
    w: lay.w, h: lay.h,
    pieces: items.map(it => ({ key: it.key, kind: it.kind, w: it.w, x: lay.pos[it.key].x, y: lay.pos[it.key].y, data: it.data })),
  };
}
