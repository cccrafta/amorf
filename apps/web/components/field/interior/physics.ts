// Interior physics: pan momentum, rubber-band, edge pull toward a neighbour and the eased dive depth, stepped once per frame.
import type Field from "../Field";
import { stowMedia } from "../media";
import { scroll } from "../scroll";
import { clampN, SLIDE_MS, ZOOM_FLOOR, ZOOM_MAX, SLIDE_OUT_MS, SLIDE_REDUCED_MS, type Comp } from "./state";
import { switchTo } from "../navigation";

// Pan range at scale z: a board wider than the viewport pans between lo and 0; a narrower one is held centred (lo = hi).
export const limits = (comp: Comp, z = 1) => {
  const W = window.innerWidth, H = window.innerHeight, w = comp.w * z, h = comp.h * z;
  const loX = w > W ? W - w : (W - w) / 2, loY = h > H ? H - h : (H - h) / 2;
  return { W, H, loX, loY, hiX: w > W ? 0 : loX, hiY: h > H ? 0 : loY, L: Math.min(0.3 * Math.min(W, H), 220) };
};

// The smallest scale is the overview: the whole board in view, never above 1 or below ZOOM_FLOOR.
export const zoomMin = (comp: Comp) => clampN(Math.min(window.innerWidth / comp.w, window.innerHeight / comp.h), ZOOM_FLOOR, 1);

// Scales the board to z keeping the board point under screen point (px, py) in place: pinch, ctrl-wheel, Safari gestures.
export function zoomAt(f: Field, z: number, px: number, py: number) {
  const ix = f.ix, c = ix.comp; if (!c) return;
  const z0 = ix.zoom, z1 = clampN(z, zoomMin(c), ZOOM_MAX);
  if (Math.abs(z1 - z0) < 1e-4) return;
  const bx = (px - ix.panX) / z0, by = (py - ix.panY) / z0, { loX, loY, hiX, hiY } = limits(c, z1);
  ix.zoom = z1; ix.zoomTo = null; ix.vx = 0; ix.vy = 0; ix.goal = null;
  ix.panX = clampN(px - bx * z1, loX, hiX); ix.panY = clampN(py - by * z1, loY, hiY);
}

// Eased zoom for keys and the overview click: board point (bx, by) ends at screen point (sx, sy) at scale z.
export function zoomToward(f: Field, z: number, bx: number, by: number, sx: number, sy: number) {
  const c = f.ix.comp; if (!c) return;
  f.ix.zoomTo = { z: clampN(z, zoomMin(c), ZOOM_MAX), bx, by, sx, sy };
  f.ix.vx = 0; f.ix.vy = 0; f.ix.goal = null;
}

export function nudge(f: Field, dx: number, dy: number) {
  const ix = f.ix, c = ix.comp; if (!c) return;
  // Edges are hard walls: the board stops at them, with no stretch past and no spring back, and a glide dies there.
  const { loX, loY, hiX, hiY } = limits(c, ix.zoom);
  const x = clampN(ix.panX + dx, loX, hiX), y = clampN(ix.panY + dy, loY, hiY);
  if (x !== ix.panX + dx) ix.vx = 0;
  if (y !== ix.panY + dy) ix.vy = 0;
  ix.panX = x; ix.panY = y;
}

const SLIDE_WAIT_MS = 400;
const picturesIn = (el: HTMLElement | null) => !el || Array.from(el.querySelectorAll("img")).every(i => i.complete);

const KEY_TAU = 240;
export const kick = (f: Field, dx: number, dy: number) => {
  const ix = f.ix;
  if (f.reduced) { nudge(f, dx, dy); return; }
  // keys glide a fixed 240 ms whatever the drag glide is set to, so a key press always travels its full distance
  ix.vx = clampN(ix.vx + dx / KEY_TAU, -6, 6);
  ix.vy = clampN(ix.vy + dy / KEY_TAU, -6, 6);
  ix.keyGlide = true;
};

// Per-frame physics and depth: runs from frame() before the field is drawn, so the field can read the eased depth.
export function step(f: Field, dt: number, now: number) {
  const ix = f.ix, st = f.state;
  const comp = ix.comp && ix.comp.id === st.open ? ix.comp : null;

  if (ix.phase === "approach") {
    const c = f.cam;
    if ((Math.hypot(c.tx - c.x, c.tz - c.z) < 90 && Math.abs(c.tyaw - c.yaw) < 3) || now - ix.enterAt > 1500) ix.phase = "inside";
  }
  if (ix.phase === "inside" && comp) glide(f, comp, dt, now);

  // an edge pull stretches the board and lights the neighbour's label; the dive itself stays put
  // once the preview covers the view the entity switches in place under it, then the preview fades off the real board
  const sl = ix.slide;
  if (ix.phase === "slide" && sl && !sl.switched && now - sl.start >= (f.reduced ? SLIDE_REDUCED_MS : SLIDE_MS)) { sl.switched = true; switchTo(f, sl.to, sl.mark); }
  // the fade-out waits until the new entity's board is rendered, panned to its opening place (glide sets panKey) and its
  // pictures have arrived, so the cover never fades onto empty frames; a slow picture is waited for at most SLIDE_WAIT_MS
  if (sl && sl.switched && !sl.out && ix.comp && ix.comp.id === sl.to && ix.panKey === sl.to
    && (picturesIn(ix.surface) || now - sl.start > SLIDE_MS + SLIDE_WAIT_MS)) sl.out = now;
  if (sl && sl.out && now - sl.out >= SLIDE_OUT_MS) { ix.slide = null; f.forceUpdate(); }

  ix.depthWant = ix.phase === "inside" || ix.phase === "slide" ? 1 : 0;
  if (ix.phase !== "inside") ix.edge = null;
  const k = f.reduced ? 1 : 1 - Math.exp(-dt / 170);
  ix.depth = clampN(ix.depth + (ix.depthWant - ix.depth) * k, 0, 1);
  if (!ix.depthWant && ix.depth < 0.002) ix.depth = 0;

  // One-shot by phase: without leaving "leaving" first this would close again every frame until the state flushed.
  if (ix.phase === "leaving" && ix.depth < 0.02) {
    ix.depth = 0; ix.phase = "idle";
    const to = ix.leaveTo; ix.leaveTo = null;
    if (to) f.routeHold = performance.now() + 4000;
    const go = () => { if (to) f.flyTo(to.id, to.mark, to.friction, true); };
    if (st.open) { stowMedia(f, st.open); f.setState({ open: null, hand: null }, go); } else go();
  }
}

function glide(f: Field, comp: Comp, dt: number, now: number) {
  const ix = f.ix;
  if (ix.zoom < zoomMin(comp)) ix.zoom = zoomMin(comp);
  const { W, H, loX, loY, hiX, hiY } = limits(comp, ix.zoom);
  if (ix.panKey !== comp.id) {
    ix.panKey = comp.id;
    ix.panX = clampN(W / 2 - comp.focus.x, loX, hiX);
    ix.panY = clampN(H / 2 - comp.focus.y, loY, hiY);
    ix.vx = 0; ix.vy = 0; ix.goal = null;
  } else if (ix.panDims !== comp.dims) {
    // a resize keeps the same place in the composition, as a fraction of its travel
    ix.panX = ix.panLoX ? clampN((ix.panX / ix.panLoX) * loX, loX, hiX) : hiX;
    ix.panY = ix.panLoY ? clampN((ix.panY / ix.panLoY) * loY, loY, hiY) : hiY;
    ix.vx = 0; ix.vy = 0; ix.goal = null;
  }
  ix.panDims = comp.dims; ix.panLoX = loX; ix.panLoY = loY;
  if (ix.zoomTo) {
    const t = ix.zoomTo, k = f.reduced ? 1 : 1 - Math.exp(-dt / 90);
    t.z = clampN(t.z, zoomMin(comp), ZOOM_MAX);
    const lz = limits(comp, t.z), px = clampN(t.sx - t.bx * t.z, lz.loX, lz.hiX), py = clampN(t.sy - t.by * t.z, lz.loY, lz.hiY);
    ix.zoom += (t.z - ix.zoom) * k; ix.panX += (px - ix.panX) * k; ix.panY += (py - ix.panY) * k;
    if (Math.abs(t.z - ix.zoom) < 0.001 && Math.abs(px - ix.panX) < 0.5 && Math.abs(py - ix.panY) < 0.5) { ix.zoom = t.z; ix.panX = px; ix.panY = py; ix.zoomTo = null; }
  }
  const dragging = !!ix.drag || ix.pointers.size > 1 || ix.gesture;
  const holding = dragging || now - ix.wheelAt < 140;
  if (!dragging) {
    if (ix.goal) {
      const kg = f.reduced ? 1 : 1 - Math.exp(-dt / 120);
      ix.panX += (ix.goal.x - ix.panX) * kg; ix.panY += (ix.goal.y - ix.panY) * kg;
      if (Math.abs(ix.goal.x - ix.panX) < 0.5 && Math.abs(ix.goal.y - ix.panY) < 0.5) ix.goal = null;
    } else {
      const tau = ix.keyGlide ? KEY_TAU : Math.max(1, scroll.glide), decay = Math.exp(-dt / tau), travel = tau * (1 - decay);
      nudge(f, ix.vx * travel, ix.vy * travel);
      ix.vx *= decay; ix.vy *= decay;
      if (Math.abs(ix.vx) < 0.01) ix.vx = 0;
      if (Math.abs(ix.vy) < 0.01) ix.vy = 0;
      if (!ix.vx && !ix.vy) ix.keyGlide = false;
    }
  }
  if (!holding) {
    const ks = f.reduced ? 1 : 1 - Math.exp(-dt / 110);
    const back = (p: number, lo: number, hi: number): [number, boolean] => {
      const t = p < lo ? lo : p > hi ? hi : p;
      return t === p ? [p, false] : [Math.abs(t - p) < 0.5 ? t : p + (t - p) * ks, true];
    };
    const [x, bx] = back(ix.panX, loX, hiX), [y, by] = back(ix.panY, loY, hiY);
    ix.panX = x; ix.panY = y;
    if (bx) ix.vx = 0;
    if (by) ix.vy = 0;
  }

  // Edges are walls, not doors: panning stays inside this entity; neighbours are reached by their labels or Alt+arrow.
  ix.edge = null;
  ix.wasHolding = holding;
}
