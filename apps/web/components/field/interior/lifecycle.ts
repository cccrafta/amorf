// Interior lifecycle: entering, leaving and dismissing an entity view, moving to a neighbour, and the tools drawer.
import type Field from "../Field";
import { stowMedia } from "../media";
import { neighbour } from "./neighbours";
import type { Dir, Tab } from "./state";

const MARK: Record<Dir, string> = { left: "←", up: "↑", right: "→", down: "↓" };
const DIR_OF: Record<string, Dir> = { "←": "left", "↑": "up", "→": "right", "↓": "down" };

export function begin(f: Field) {
  const ix = f.ix;
  ix.phase = "approach"; ix.enterAt = performance.now();
  ix.depthWant = 0; ix.edge = null; ix.drawer = null; ix.wasHolding = false;
  ix.drag = null; ix.pointers.clear(); ix.gesture = false; ix.vx = 0; ix.vy = 0; ix.goal = null;
  ix.panKey = ""; ix.cardRect = null; ix.leaveTo = null; ix.slid = ""; ix.zoom = 1; ix.zoomTo = null; ix.pinch = null;
}

// Pull back out: depth runs to zero, then step() closes the interior and, if a destination was set, flies there.
// Never ticks: glide() calls this from inside frame(); event-handler callers go through Field.collapse().
export function collapse(f: Field) {
  const ix = f.ix;
  if (ix.phase === "leaving" || (!f.state.open && ix.depth < 0.02)) return;
  ix.phase = "leaving"; ix.depthWant = 0; ix.slide = null;
}

// From inside an entity, going to another one slides the next entity's preview in from dir (continuing a pull's
// reveal), then step() calls navigation.switchTo; the interior never closes.
export function slideTo(f: Field, id: string, mark: string, dir: Dir | null) {
  const ix = f.ix, from = f.state.open;
  if (!from || from === id || ix.slide || (ix.phase !== "inside" && ix.phase !== "approach")) return;
  ix.phase = "slide"; ix.edge = null; ix.drawer = null; ix.menu = false; ix.drag = null; ix.pointers.clear(); ix.vx = 0; ix.vy = 0;
  const now = performance.now();
  ix.slide = { to: id, mark, dir, start: now, r0: -1, switched: false, out: 0 };
  ix.wheelMags = []; ix.wheelMute = now - ix.wheelAt < 200 ? now : 0; ix.wheelMuteMag = Infinity; ix.wheelMuteFrom = now;
  f.forceUpdate();
}

// Inside an entity this is the slide; the field's friction detour only applies when travelling the field.
export function leaveToward(f: Field, id: string, mark = "↓", friction = true) {
  if (!f.state.open) { f.flyTo(id, mark, friction, true); return; }
  if (f.ix.slide) return;
  if (f.ix.phase === "inside" || f.ix.phase === "approach") { slideTo(f, id, mark, DIR_OF[mark] ?? null); return; }
  f.ix.leaveTo = { id, mark, friction };
  collapse(f);
}

// A walk's next step joins that walk, as following it from the card does. Never ticks, like collapse().
export function goNeighbour(f: Field, dir: Dir) {
  const id = f.state.open, n = id ? neighbour(f, id, dir) : null;
  if (!n) return;
  if (n.walk) f.setState({ joined: n.walk });
  if (f.ix.slide) return;
  if (f.ix.phase === "inside") slideTo(f, n.id, MARK[dir], dir);
  else leaveToward(f, n.id, MARK[dir], false);
}

// The drawer lives on ix, outside React state, so opening it re-renders and repaints by hand.
// Esc peels back one layer at a time: menu, drawer, expanded text. False means nothing was open, so Esc leaves.
export function escInterior(f: Field): boolean {
  const ix = f.ix;
  if (ix.phase === "slide") return true;
  if (ix.menu) ix.menu = false;
  else if (ix.scrollPanel) ix.scrollPanel = false;
  else if (ix.drawer) ix.drawer = null;
  else if (ix.floatOpen) ix.floatOpen = false;
  else return false;
  f.forceUpdate(); f.tick();
  return true;
}

export function setDrawer(f: Field, tab: Tab | null) {
  if (f.ix.drawer === tab) return;
  f.ix.drawer = tab;
  f.forceUpdate();
  f.tick();
}

// For callers that unmount the interior themselves: the live element has to leave its slot first.
export function dismiss(f: Field) {
  const ix = f.ix;
  if (f.state.open) stowMedia(f, f.state.open);
  ix.phase = "idle"; ix.depthWant = 0; ix.edge = null; ix.drawer = null; ix.leaveTo = null; ix.slide = null;
  ix.drag = null; ix.pointers.clear(); ix.gesture = false;
}
