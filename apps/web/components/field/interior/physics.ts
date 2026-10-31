// Interior physics: pan momentum, rubber-band, edge pull toward a neighbour and the eased dive depth, stepped once per frame.
import type Field from "../Field";
import { stowMedia } from "../media";
import { clampN, COMMIT, PAN_TAU, type Comp, type Dir } from "./state";
import { goNeighbour } from "./lifecycle";

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

export const limits = (comp: Comp) => {
  const W = window.innerWidth, H = window.innerHeight;
  return { W, H, loX: Math.min(0, W - comp.w), loY: Math.min(0, H - comp.h), L: Math.min(0.3 * Math.min(W, H), 220) };
};

export function nudge(f: Field, dx: number, dy: number) {
  const ix = f.ix, c = ix.comp; if (!c) return;
  const { loX, loY, L } = limits(c);
  ix.panX = axis(ix.panX, dx, loX, 0, L);
  ix.panY = axis(ix.panY, dy, loY, 0, L);
}

export const kick = (f: Field, dx: number, dy: number) => {
  const ix = f.ix;
  if (f.reduced) { nudge(f, dx, dy); return; }
  ix.vx = clampN(ix.vx + dx / PAN_TAU, -6, 6);
  ix.vy = clampN(ix.vy + dy / PAN_TAU, -6, 6);
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
  ix.depthWant = ix.phase === "inside" ? 1 : 0;
  if (ix.phase !== "inside") ix.edge = null;
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

  // Only the dominant edge counts, so a corner pull goes to one neighbour.
  const over: [Dir, number][] = [["left", ix.panX], ["right", loX - ix.panX], ["up", ix.panY], ["down", loY - ix.panY]];
  const [dir, most] = over.reduce((a, b) => (b[1] > a[1] ? b : a));
  ix.edge = most > 0.5 ? { dir, pull: Math.min(1, most / L) } : null;
  // with the drawer open a pull rubber-bands but never commits: its right edge would be ambiguous
  if (ix.wasHolding && !holding && ix.edge && ix.edge.pull >= COMMIT && !ix.drawer) goNeighbour(f, ix.edge.dir);
  ix.wasHolding = holding;
}
