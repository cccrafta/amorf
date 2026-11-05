// Walk minimap (on by default; ?map=0 brings back the walk rail): a pocket version of the plan's drawing that follows
// the visitor, painted from frame(). Limit: hidden inside a space, where the plan is the table rather than the field.
import type Field from "./Field";
import type { State } from "./types";
import { wrap } from "./util";
import { mediaUrl } from "@/lib/media/url";
import { planRoute } from "./plan";
import { inSpace } from "./spaces";

// viewBox side, and the world distance from the visitor to the map's edge (the draw distance, so the cone ends where cards fade out).
export const MAP_VIEW = 180;
const HALF = 2700;
const C = MAP_VIEW / 2, S = C / HALF;
// Full angle of the facing cone; narrower than the real field of view so it reads as a direction.
const CONE_DEG = 50;
const CONE_R = 62;
const MARK = 2.2;
const TICK = 1.9;
// A visited entity with a thumbnail shows it at this size (map units, 3:2), so the walk reads as what was seen, not as dots.
const THUMB_W = 15, THUMB_H = 10;
const SVG_NS = "http://www.w3.org/2000/svg";

export const parseMap = (search: string) => new URLSearchParams(search).get("map") !== "0";

export const MAP_CONE = (() => {
  const a = (CONE_DEG / 2) * Math.PI / 180, x = CONE_R * Math.sin(a), y = -CONE_R * Math.cos(a);
  return `M0,0L${(-x).toFixed(1)},${y.toFixed(1)}L${x.toFixed(1)},${y.toFixed(1)}Z`;
})();

// Same visibility rules as the rail it replaces (a walk exists), minus every overlay that covers the field.
export function mapVals(f: Field, st: State) {
  const shown = f.mapOn && st.trace.length > 0 && !st.open && !st.plan && !st.catalogue && !st.tableOpen && !st.view && !st.compose && !st.naming;
  return { mapOn: f.mapOn, mapShown: shown };
}

// The route unwrapped from the camera outwards, then drawn once per torus copy that reaches the window, so a wrap
// breaks the line instead of crossing the map.
function routeD(f: Field, ids: string[]): string {
  const T = f.TILE, cam = f.cam;
  const pts: { x: number; z: number }[] = [];
  let prev = null as { hx: number; hz: number } | null;
  for (const id of ids) {
    const o = f.byId(id);
    if (!o) continue;
    const last = pts[pts.length - 1];
    pts.push(prev && last ? { x: last.x + wrap(o.hx - prev.hx, T), z: last.z + wrap(o.hz - prev.hz, T) } : { x: wrap(o.hx - cam.x, T), z: wrap(o.hz - cam.z, T) });
    prev = o;
  }
  if (pts.length < 2) return "";
  const xs = pts.map(p => p.x), zs = pts.map(p => p.z);
  const kr = (lo: number, hi: number) => [Math.ceil((-HALF - hi) / T), Math.floor((HALF - lo) / T)];
  const [kx0, kx1] = kr(Math.min(...xs), Math.max(...xs)), [kz0, kz1] = kr(Math.min(...zs), Math.max(...zs));
  const pt = (p: { x: number; z: number }, kx: number, kz: number) => (C + (p.x + kx * T) * S).toFixed(1) + "," + (C + (p.z + kz * T) * S).toFixed(1);
  const hits = (p: { x: number; z: number }, q: { x: number; z: number }, kx: number, kz: number) => {
    const ax = p.x + kx * T, bx = q.x + kx * T, az = p.z + kz * T, bz = q.z + kz * T;
    return Math.max(ax, bx) >= -HALF && Math.min(ax, bx) <= HALF && Math.max(az, bz) >= -HALF && Math.min(az, bz) <= HALF;
  };
  let d = "";
  for (let kx = kx0; kx <= kx1; kx++) for (let kz = kz0; kz <= kz1; kz++) {
    let joined = false;
    for (let i = 1; i < pts.length; i++) {
      if (!hits(pts[i - 1], pts[i], kx, kz)) { joined = false; continue; }
      d += (joined ? "L" : "M" + pt(pts[i - 1], kx, kz) + "L") + pt(pts[i], kx, kz);
      joined = true;
    }
  }
  return d;
}

// Called every frame: the visitor sits at the centre, so only the cone turns; everything else is rewritten only when the camera has moved.
export function paintMap(f: Field) {
  const root = document.querySelector<HTMLElement>('[data-role="map"]');
  if (!root) return;
  const hide = inSpace(f);
  // display, not visibility: frame() skips keep-clear zones with no box, so a hidden map stops pushing cards away.
  if (root.style.display !== (hide ? "none" : "block")) root.style.display = hide ? "none" : "block";
  if (hide) return;
  const cam = f.cam, tr = f.state.trace;
  const k = [cam.x.toFixed(0), cam.z.toFixed(0), cam.yaw.toFixed(1), tr.length, tr[tr.length - 1]?.id].join("|");
  if (root.dataset.k === k) return;
  root.dataset.k = k;

  const part = (n: string) => root.querySelector<SVGElement>('[data-part="' + n + '"]');
  const cone = part("cone"), route = part("route"), ticks = part("ticks"), marks = part("marks"), thumbs = part("thumbs");
  if (cone) cone.setAttribute("transform", "rotate(" + cam.yaw.toFixed(1) + ")");

  const walked = new Set(tr.map(t => t.id));
  // One <image> per visited entity, created once and kept by id; only position and display change per repaint.
  const imgs = new Map<string, SVGImageElement>();
  thumbs?.querySelectorAll<SVGImageElement>("image").forEach(el => { if (el.dataset.id) imgs.set(el.dataset.id, el); });
  let dt = "", dm = "";
  for (const o of f.OBJECTS) {
    const x = wrap(o.hx - cam.x, f.TILE), z = wrap(o.hz - cam.z, f.TILE);
    const inside = Math.abs(x) <= HALF && Math.abs(z) <= HALF;
    const px = C + x * S, pz = C + z * S;
    if (walked.has(o.id) && o.thumb && thumbs) {
      let el = imgs.get(o.id);
      if (!el) {
        el = document.createElementNS(SVG_NS, "image");
        el.dataset.id = o.id;
        el.setAttribute("href", mediaUrl(o.thumb));
        el.setAttribute("width", String(THUMB_W)); el.setAttribute("height", String(THUMB_H));
        el.setAttribute("preserveAspectRatio", "xMidYMid slice");
        thumbs.appendChild(el);
      }
      el.style.display = inside ? "" : "none";
      if (inside) { el.setAttribute("x", (px - THUMB_W / 2).toFixed(1)); el.setAttribute("y", (pz - THUMB_H / 2).toFixed(1)); }
      imgs.delete(o.id);
      continue;
    }
    if (!inside) continue;
    if (walked.has(o.id)) dm += "M" + (px - MARK).toFixed(1) + "," + (pz - MARK).toFixed(1) + "h" + MARK * 2 + "v" + MARK * 2 + "h" + -MARK * 2 + "z";
    else dt += "M" + px.toFixed(1) + "," + (pz - TICK).toFixed(1) + "v" + TICK * 2;
  }
  // Whatever is left was dropped from the walk (the walk was let go), so its picture leaves the map too.
  imgs.forEach(el => el.remove());
  ticks?.setAttribute("d", dt);
  marks?.setAttribute("d", dm);
  route?.setAttribute("d", routeD(f, planRoute(f.state)));
}
