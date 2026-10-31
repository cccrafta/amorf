// Interior paint: writes the dive transform, pan offset and edge-label pull feedback to the DOM each frame.
import type Field from "../Field";
import { COMMIT, DIRS, PLATE_DROP, type Dir, type Interior } from "./state";

function mount(ix: Interior): HTMLElement | null {
  if (ix.root && ix.root.isConnected) return ix.root;
  const root = document.querySelector<HTMLElement>('[data-role="interior"]');
  ix.root = root;
  ix.surface = root ? root.querySelector<HTMLElement>('[data-role="comp"]') : null;
  ix.edges = {};
  DIRS.forEach(d => {
    const q = (role: string) => (root ? root.querySelector<HTMLElement>('[data-role="' + role + d + '"]') : null);
    ix.edges[d] = { label: q("edge-"), line: q("edgeline-"), sub: q("edgesub-") };
  });
  ix.paintKey = ""; ix.compKey = ""; ix.edgeKey = "";
  return root;
}

// Toward the board's centre: the pulled label comes in to meet the reader.
const INWARD: Record<Dir, [number, number]> = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };

// At rest every label sits at 0.45; the pulled one brightens, moves in and draws its edge line out to COMMIT.
// Narrow screens show left and right only while pulled. The drawer hides them all: it covers the right edge.
function paintEdges(f: Field, ix: Interior) {
  const e = ix.phase === "inside" && !ix.drawer ? ix.edge : null;
  const ek = (e ? e.dir + e.pull.toFixed(3) : "-") + (f.narrow ? "n" : "w") + (ix.drawer ? "d" : "");
  if (ek === ix.edgeKey) return;
  ix.edgeKey = ek;
  DIRS.forEach(d => {
    const el = ix.edges[d]; if (!el || !el.label) return;
    const p = e && e.dir === d ? e.pull : 0, k = Math.min(1, p / COMMIT);
    const side = d === "left" || d === "right", hidden = !!ix.drawer || (f.narrow && side && p < 0.02);
    el.label.style.opacity = hidden ? "0" : (0.45 + 0.55 * k).toFixed(3);
    el.label.style.pointerEvents = hidden ? "none" : "auto";
    const [ux, uy] = INWARD[d], t = f.reduced ? 0 : 24 * k;
    el.label.style.translate = (ux * t).toFixed(1) + "px " + (uy * t).toFixed(1) + "px";
    if (el.line) el.line.style.transform = (side ? "scaleY(" : "scaleX(") + k.toFixed(3) + ")";
    if (el.sub) {
      const s = p >= COMMIT ? "release to go" : el.sub.dataset.rest || "";
      if (el.sub.textContent !== s) el.sub.textContent = s;
    }
  });
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

  paintEdges(f, ix);
}
