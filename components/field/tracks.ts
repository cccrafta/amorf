// Tracks: the routes drawn on the floor of the field, one SVG path per route and distance band.
import type Field from "./Field";
import type { FieldNode } from "./types";
import { rand } from "./util";

export const TRACK_HUES = ["#6E9A8D", "#A88A6A", "#7E8FB0", "#A17C93", "#8E9E6B"];
export const NEARZ = 30;
export const BAND = 1500;
export const BANDS = [700, 1500, 2800, 5000, 9000, 1e9];
export const BAND_OP = [1, 0.74, 0.5, 0.3, 0.16, 0.07];

// One hue per walk, handed out in order and kept, so two routes never read
// as the same person.
export function walkColor(f: Field, name: string): string {
  if (!f.hueMap) { f.hueMap = {}; f.hueNext = 0; }
  if (!f.hueMap[name]) { f.hueMap[name] = TRACK_HUES[f.hueNext % TRACK_HUES.length]; f.hueNext += 1; }
  return f.hueMap[name];
}

export function camPt(f: Field, wx: number, wz: number) {
  const cam = f.cam, rad = (cam.yaw * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
  const dx = wx - cam.x, dz = wz - cam.z;
  return { lx: dx * cs + dz * sn, lz: -dx * sn + dz * cs };
}

export function screenPt(f: Field, p: { lx: number; lz: number }, height: number) {
  const scale = f.P / (f.P - p.lz);
  return { x: window.innerWidth / 2 + p.lx * scale, y: window.innerHeight * 0.46 + height * scale, scale };
}

// Coordinates are fixed, not chosen per frame. The field repeats, so each
// repetition is treated as its own set of real coordinates and drawn in place.
export function instance(f: Field, o: FieldNode, ox: number, oz: number) {
  const tileX = Math.round(-ox / f.TILE), tileZ = Math.round(-oz / f.TILE);
  const dy = (rand(o.id + ":" + tileX + ":" + tileZ + "y") - 0.5) * 2 * f.SPREAD_Y;
  return { id: o.id, wx: o.hx + ox, wz: o.hz + oz, dy };
}

// The routes are not drawn between the plates. They are drawn on the floor,
// and depth is the only thing that takes a line away: each route is cut into
// short pieces and every piece is drawn at the strength its distance earns,
// so a track thins toward the vanishing point instead of switching off.
export function paintTracks(f: Field, fade: number) {
  const svg = f.tracks; if (!svg) return;
  f.FLOOR = Math.max(440, window.innerHeight * 0.66);
  if (!f.state.tracksOn) { if (svg.childElementCount) svg.textContent = ""; f.trackEls = null; f.trackKey = null; return; }
  const stamp = [Math.round(f.cam.x), Math.round(f.cam.z), Math.round(f.cam.yaw * 4), Math.round(fade * 40), f.state.seeded.length, f.state.trace.length, f.wearRev || 0, Object.keys(f.state.kept || {}).length, window.innerWidth, window.innerHeight].join(",");
  if (f.trackKey === stamp) return;
  f.trackKey = stamp;
  const NS = "http://www.w3.org/2000/svg";
  const WEIGHTS = [1.5, 1.05, 0.75, 1.3, 0.9];
  let seeded = f.state.seeded;
  if (f.state.filter) seeded = seeded.filter(w => w.name === f.state.filter);
  // one hand per route: each walk gets its own weight and color, boosted by
  // how worn its objects are and whether it has been kept
  const walks: { key: string; steps: string[]; color: string; weight: number; mine: boolean }[] = seeded.map((w, i) => {
    const objs = w.steps.map(id => f.byId(id)).filter(Boolean);
    const avg = objs.length ? objs.reduce((s, o) => s + f.wearOf(o.id), 0) / objs.length : 0;
    const boost = 1 + avg * 0.9 + ((f.state.kept || {})[w.name] ? 0.5 : 0);
    return { key: w.name, steps: w.steps, color: f.walkColor(w.name), weight: WEIGHTS[i % WEIGHTS.length] * boost, mine: false };
  });
  if (f.state.trace.length > 1 && !f.state.filter) walks.unshift({ key: "__mine", steps: f.state.trace.map(t => t.id), color: "#B4483C", weight: 1.9, mine: true });
  if (!f.trackEls) f.trackEls = {};
  const live: Record<string, boolean> = {}, NEAR = NEARZ, W = window.innerWidth;
  const band = (d: number) => { for (let i = 0; i < BANDS.length; i++) if (d < BANDS[i]) return i; return BANDS.length - 1; };

  walks.forEach(w => {
    const lines = BANDS.map(() => ""), drops = BANDS.map(() => ""), marks = BANDS.map(() => "");
    const objs = w.steps.map(id => f.byId(id)).filter(Boolean);
    if (!objs.length) return;
    let cx = 0, cz = 0;
    objs.forEach(o => { cx += o.hx; cz += o.hz; });
    cx /= objs.length; cz /= objs.length;
    const kx0 = Math.round((f.cam.x - cx) / f.TILE), kz0 = Math.round((f.cam.z - cz) / f.TILE);
    // the repetitions drawn for a route are centred on the route itself,
    // not on the camera, so a track never appears to orbit as you move
    const copies: [number, number][] = [];
    for (let kx = -1; kx <= 1; kx++) for (let kz = -1; kz <= 1; kz++) copies.push([(kx0 + kx) * f.TILE, (kz0 + kz) * f.TILE]);

    copies.forEach(([ox, oz]) => {
      const pts = objs.map(o => {
        const inst = f.instance(o, ox, oz);
        const c = f.camPt(inst.wx, inst.wz);
        return { c, dy: inst.dy, d: -c.lz };
      });
      if (!pts.some(p => p.d > NEAR && p.d < 13000)) return;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.d > NEAR) {
          const g = f.screenPt(p.c, f.FLOOR);
          if (Math.abs(g.x) < W * 2.4) {
            const bi = band(p.d);
            const r = Math.max(1.2, (7 + f.wearOf(objs[i].id) * 10) * g.scale);
            marks[bi] += "M" + (g.x - r).toFixed(1) + "," + g.y.toFixed(1) + "L" + (g.x + r).toFixed(1) + "," + g.y.toFixed(1);
            if (p.d < f.FAR) {
              const t = f.screenPt(p.c, p.dy);
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
        let prev = f.screenPt(a, f.FLOOR), prevOff = Math.abs(prev.x) > W * 8;
        for (let k = 1; k <= K; k++) {
          const t = k / K;
          const c = { lx: a.lx + (b.lx - a.lx) * t, lz: a.lz + (b.lz - a.lz) * t };
          const q = f.screenPt(c, f.FLOOR);
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
      let el = f.trackEls![key];
      if (!el) {
        el = document.createElementNS(NS, "path") as SVGPathElement;
        el.setAttribute("fill", "none");
        el.setAttribute("stroke-linecap", "round");
        svg.appendChild(el);
        f.trackEls![key] = el;
      }
      live[key] = true;
      el.setAttribute("d", d || "M0,0");
      el.setAttribute("stroke", w.color);
      el.setAttribute("stroke-width", String(width));
      el.setAttribute("opacity", (d ? op * (1 - fade) : 0).toFixed(3));
    };
    const base = w.mine ? 0.62 : 0.42;
    BANDS.forEach((_, bi) => {
      const g = BAND_OP[bi];
      put(w.key + ":l" + bi, lines[bi], (w.weight || 1) * (0.62 + 0.38 * g), base * g);
      put(w.key + ":d" + bi, drops[bi], "0.7", (w.mine ? 0.3 : 0.18) * g);
      put(w.key + ":m" + bi, marks[bi], "1", (w.mine ? 0.62 : 0.44) * g);
    });
  });
  Object.keys(f.trackEls).forEach(k => { if (!live[k]) { f.trackEls![k].remove(); delete f.trackEls![k]; } });
}
