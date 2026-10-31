// Navigation: opening an object, flying to it, searching, and naming the walk.
import type React from "react";
import type Field from "./Field";
import type { Walk } from "./types";
import { gap, yearLabel } from "./chronology";
import { wrap } from "./util";
import { begin, dismiss } from "./interior";

// A journey holds only its own objects; following a lead out of it opens the
// field back up rather than sending you to something you cannot see.
export function clearFilterFor(f: Field, id: string) {
  if (f.state.filter && f.filterSet && !f.filterSet.has(id)) { f.filterSet = null; f.setState({ filter: null, joined: null }); }
}

export function open(f: Field, id: string, mark: string) {
  if (f.suppressClick && performance.now() - f.suppressClick < 220) return;
  // Reaching for another entity from inside one is a pull-back first; the leave opens it once the field is back.
  if (f.state.open) { if (f.state.open !== id) f.leaveToward(id, mark, false); return; }
  f.clearFilterFor(id);
  const o = f.byId(id);
  f.visited[id] = true;
  f.visits[id] = (f.visits[id] || 0) + 1;
  const trace = f.state.trace.slice();
  const last = trace[trace.length - 1];
  if (!last || last.id !== id) trace.push({ id, mark: mark || "◉", depth: String(Math.round(Math.hypot(f.cam.x, f.cam.z))).padStart(5, "0") });

  const prev = last ? f.byId(last.id) : null;
  const paces = Math.round(Math.hypot(f.cam.x - (f.lastStandX ?? f.cam.x), f.cam.z - (f.lastStandZ ?? f.cam.z)) / 34);
  // what the leap cost, measured two ways that do not agree: association is
  // not chronology and not distance, and the readout says so
  if (prev && prev.id !== id) {
    const g = gap(prev, o);
    f.setState({ jump: {
      span: yearLabel(prev) + " → " + yearLabel(o),
      years: g === null ? "a gap of no known size" : g === 0 ? "the same year, by accident" : g.toLocaleString() + (g === 1 ? " year" : " years") + " in one step",
      paces: paces < 1 ? "without moving" : paces.toLocaleString() + " paces walked"
    } });
  } else if (!prev) {
    f.setState({ jump: { span: yearLabel(o), years: "no previous position", paces: "the walk starts here" } });
  }
  if (f.jumpTimer) clearTimeout(f.jumpTimer);
  f.jumpTimer = f.later(() => f.setState({ jump: null }), 7000);
  f.lastStandX = f.cam.x; f.lastStandZ = f.cam.z;
  begin(f);
  f.setState({ open: id, trace, cursor: trace.length - 1, askOpen: false });
  f.approach(id, 520);
}

export function approach(f: Field, id: string, dist: number) {
  const o = f.byId(id);
  const dx = wrap(o.hx - f.cam.x, f.TILE), dz = wrap(o.hz - f.cam.z, f.TILE);
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  f.cam.tx = f.cam.x + dx - ux * dist;
  f.cam.tz = f.cam.z + dz - uz * dist;
  f.standAt = { x: f.cam.tx, z: f.cam.tz };
  const want = (Math.atan2(ux, -uz) * 180) / Math.PI;
  f.cam.tyaw = want + Math.round((f.cam.tyaw - want) / 360) * 360;
  f.tick();
}

export function flyTo(f: Field, id: string, mark: string, allowFriction: boolean, andOpen: boolean) {
  if (andOpen && f.state.open) { f.leaveToward(id, mark, allowFriction); return; }
  f.clearFilterFor(id);
  let target = id, m = mark;
  f.navCount += 1;
  const every = Math.max(2, f.props.frictionEvery ?? 8);
  if (allowFriction && f.navCount > 2 && !f.lastFriction && Math.random() < 1 / every) {
    f.lastFriction = true;
    const others = f.OBJECTS.filter(o => o.id !== id);
    target = others[Math.floor(Math.random() * others.length)].id;
    m = "↷";
  } else if (allowFriction) f.lastFriction = false;

  const o = f.byId(target), dist = 760;
  const dx = wrap(o.hx - f.cam.x, f.TILE), dz = wrap(o.hz - f.cam.z, f.TILE);
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  f.cam.tx = f.cam.x + dx - ux * dist;
  f.cam.tz = f.cam.z + dz - uz * dist;
  const want = (Math.atan2(ux, -uz) * 180) / Math.PI;
  const turns = Math.round((f.cam.tyaw - want) / 360);
  f.cam.tyaw = want + turns * 360;
  f.used();
  f.tick();
  if (andOpen) f.later(() => f.open(target, m), 60);
  else f.pendingMark = m;
}

export function runSearch(f: Field, q: string) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return;
  let pool = f.OBJECTS.filter(o => o.tags.some(t => t.includes(s)) || o.t.toLowerCase().includes(s) || o.p.join(" ").toLowerCase().includes(s));
  if (!pool.length) pool = f.OBJECTS;
  let seen = f.seenByQuery[s] || [];
  let fresh = pool.filter(o => seen.indexOf(o.id) === -1);
  if (!fresh.length) { seen = seen.slice(-1); fresh = pool.filter(o => seen.indexOf(o.id) === -1); }
  if (!fresh.length) fresh = pool;
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  f.seenByQuery[s] = seen.concat([pick.id]);
  if (f.input) f.input.blur();
  f.setState({ joined: null, askOpen: false });
  f.flyTo(pick.id, "⌕", false, true);
}

export function passingTrace(f: Field): { trace: Walk; index: number } | null {
  const st = f.state; if (!st.open) return null;
  const inTrace = (t: Walk) => { const i = t.steps.indexOf(st.open as string); return i > -1 && i < t.steps.length - 1 ? { trace: t, index: i } : null; };
  if (st.joined) { const t = st.seeded.find(s => s.name === st.joined); if (t) { const r = inTrace(t); if (r) return r; } }
  for (const t of st.seeded) { const r = inTrace(t); if (r) return r; }
  return null;
}

// The traces you left join the walk you just named, so they can be found
// from either end: from the object, or from the route somebody took.
export function commitName(f: Field, e?: React.FormEvent) {
  if (e && e.preventDefault) e.preventDefault();
  const name = (f.state.nameValue || "").trim() || "Left without a name";
  f.NOTES.forEach(n => { if (n.mine && !n.walk) n.walk = name; });
  const seeded = ([{ name, steps: f.state.trace.map(t => t.id) }] as Walk[]).concat(f.state.seeded);
  f.visited = {};
  dismiss(f);
  f.setState({ seeded, naming: false, nameValue: "", trace: [], cursor: -1, open: null, joined: null, query: "", askOpen: false }, () => f.recomputeWear());
}
