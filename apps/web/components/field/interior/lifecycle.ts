// Interior lifecycle: entering, leaving and dismissing an entity view, moving to a neighbour, and the tools drawer.
import type Field from "../Field";
import { stowMedia } from "../media";
import { neighbour } from "./neighbours";
import type { Dir, Tab } from "./state";

const MARK: Record<Dir, string> = { left: "←", up: "↑", right: "→", down: "↓" };

export function begin(f: Field) {
  const ix = f.ix;
  ix.phase = "approach"; ix.enterAt = performance.now();
  ix.depthWant = 0; ix.edge = null; ix.drawer = null; ix.wasHolding = false;
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

// A walk's next step joins that walk, as following it from the card does. Never ticks, like collapse().
export function goNeighbour(f: Field, dir: Dir) {
  const id = f.state.open, n = id ? neighbour(f, id, dir) : null;
  if (!n) return;
  if (n.walk) f.setState({ joined: n.walk });
  leaveToward(f, n.id, MARK[dir], false);
}

// The drawer lives on ix, outside React state, so opening it re-renders and repaints by hand.
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
  ix.phase = "idle"; ix.depthWant = 0; ix.edge = null; ix.drawer = null; ix.leaveTo = null;
  ix.drag = null; ix.pointers.clear(); ix.gesture = false;
}
