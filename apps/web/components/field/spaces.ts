// Spaces: the table curation as a walkable place, entered from the field through a threshold; everything here is inert unless the URL has ?spaces=blend|gate.
import type Field from "./Field";
import type { State, TableMetrics } from "./types";
import { key, smooth } from "./util";

export type SpaceMode = "blend" | "gate";
type Phase = "field" | "enter" | "space" | "leave";
type Cam = { x: number; z: number; tx: number; tz: number; yaw: number; tyaw: number };
type Pt = { x: number; z: number };

export type SpaceRt = {
  mode: SpaceMode | null;
  phase: Phase;
  t0: number;
  saved: Cam | null;
  from: { x: number; z: number; yaw: number };
  m: TableMetrics | null;
  floor: Map<string, Pt>;
  gateEl: HTMLElement | null;
  fogKey: string;
  stored: string;
};

// What the per-frame card pass reads; p is 0 in the field and 1 in the space.
export type SpaceFrame = {
  p: number;
  cards: boolean;
  view: { x: number; z: number; yaw: number };
  cs: number;
  sn: number;
  fieldAlpha: number;
  spaceAlpha: number;
  density: number;
};

const STORE_KEY = "amorf.space";
export const DURATION = 1400;
// World distance the camera travels through the threshold, and where the gate stands on that path.
const CROSS = 900;
const GATE_AHEAD = 520;
const GATE_Z = CROSS - GATE_AHEAD;
// The table's usable extent maps to this floor; the entrance faces the table's bottom edge so the plan reads as the walk.
const SPAN_X = 2400;
const SPAN_Z = 1500;
const ENTRY_GAP = 450;
const MARGIN = 450;
const BACK_ROOM = 250;

// Fog colour and density are the only axes a space differs on; colours are tokens, mixed in CSS.
export const ATMOSPHERE = {
  field: { fog: "var(--field-bg-dark)", mid: "var(--field-bg-mid)", density: 0 },
  space: { fog: "var(--space-room-fog)", mid: "var(--space-room-fog-mid)", density: 1 / 2200 }
};

export function newSpace(): SpaceRt {
  return { mode: null, phase: "field", t0: 0, saved: null, from: { x: 0, z: 0, yaw: 0 }, m: null, floor: new Map(), gateEl: null, fogKey: "", stored: "" };
}

export function parseMode(search: string): SpaceMode | null {
  const v = new URLSearchParams(search).get("spaces");
  return v === "blend" || v === "gate" ? v : null;
}

export const inSpace = (f: Field) => !!f.sp.mode && f.sp.phase !== "field";
export const canEnter = (f: Field) => !!f.sp.mode && f.sp.phase === "field" && f.state.table.length > 0;

function floorAt(m: TableMetrics, p: { x: number; y: number }): Pt {
  const b = m.b, ex = Math.max(1, b.xMax - b.xMin), ey = Math.max(1, b.yMax - b.yMin);
  return { x: ((p.x - 50) / ex) * SPAN_X, z: -(ENTRY_GAP + ((b.yMax - p.y) / ey) * SPAN_Z) };
}

// Flag, then the saved table; ids that no longer exist are dropped.
export function init(f: Field) {
  const s = f.sp;
  s.mode = parseMode(location.search);
  if (!s.mode) return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const j = raw ? JSON.parse(raw) : null;
    if (!j || !Array.isArray(j.table)) return;
    const ids: string[] = [];
    for (const id of j.table) if (typeof id === "string" && !ids.includes(id) && f.OBJECTS.some(o => o.id === id)) ids.push(id);
    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(100, v)) : 50);
    ids.forEach(id => { const p = j.pos && j.pos[id]; f.tablePos[id] = { x: num(p && p.x), y: num(p && p.y) }; });
    s.stored = raw as string;
    if (ids.length) f.setState({ table: ids });
  } catch { /* unreadable storage: start with an empty table */ }
}

export function persist(f: Field) {
  const s = f.sp;
  if (!s.mode) return;
  const pos: Record<string, { x: number; y: number }> = {};
  f.state.table.forEach(id => { if (f.tablePos[id]) pos[id] = f.tablePos[id]; });
  const out = JSON.stringify({ table: f.state.table, pos });
  if (out === s.stored) return;
  s.stored = out;
  try { localStorage.setItem(STORE_KEY, out); } catch { /* storage blocked: the table lasts this visit only */ }
}

export function enter(f: Field) {
  const s = f.sp;
  if (!canEnter(f)) return;
  // measured while the overlay's surface is still in the DOM
  s.m = f.tableMetrics();
  s.saved = { ...f.cam };
  s.phase = "enter";
  s.t0 = performance.now();
  f.setState({ tableOpen: false, plan: false, catalogue: false, compose: null, view: null });
}

export function leave(f: Field) {
  const s = f.sp;
  if (s.phase !== "space") return;
  const yaw = f.cam.yaw;
  s.from = { x: f.cam.x, z: f.cam.z, yaw: yaw - Math.round(yaw / 360) * 360 };
  s.phase = "leave";
  s.t0 = performance.now();
  f.forceUpdate();
}

// Alt+W walks in (the plain letters all feed the search); Escape walks out once nothing else is open.
export function keydown(f: Field, e: KeyboardEvent): boolean {
  const s = f.sp, st = f.state;
  if (!s.mode) return false;
  if (e.altKey && e.code === "KeyW" && !e.metaKey && !e.ctrlKey) {
    if (st.open || st.plan || st.catalogue || st.compose || st.view || st.naming || !canEnter(f)) return false;
    enter(f); e.preventDefault();
    return true;
  }
  if (e.key === "Escape" && s.phase === "space") {
    if (st.plan || st.tableOpen || st.catalogue || st.compose || st.view || st.naming) return false;
    const ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return false;
    leave(f); e.preventDefault();
    return true;
  }
  return false;
}

// Advances the threshold and returns the frame's space view, or null when the flag is off so frame() runs exactly as before.
export function step(f: Field, now: number): SpaceFrame | null {
  const s = f.sp, cam = f.cam;
  if (!s.mode) return null;
  let p = s.phase === "space" ? 1 : 0;
  let view = { x: cam.x, z: cam.z, yaw: cam.yaw };

  if (s.phase === "space") {
    const lx = SPAN_X / 2 + MARGIN, zMin = -(ENTRY_GAP + SPAN_Z + MARGIN);
    const cx = (v: number) => Math.max(-lx, Math.min(lx, v)), cz = (v: number) => Math.max(zMin, Math.min(BACK_ROOM, v));
    cam.tx = cx(cam.tx); cam.x = cx(cam.x); cam.tz = cz(cam.tz); cam.z = cz(cam.z);
    view = { x: cam.x, z: cam.z, yaw: cam.yaw };
  } else if (s.phase === "enter" || s.phase === "leave") {
    const sv = s.saved as Cam;
    const t = f.reduced ? 1 : Math.min(1, (now - s.t0) / DURATION);
    const e = smooth(0, 1, t);
    const entering = s.phase === "enter";
    let disp: number;
    if (entering) {
      p = e; disp = CROSS * e;
      view = { x: 0, z: CROSS * (1 - e), yaw: 0 };
    } else {
      // the visitor first drifts back to the entrance, then retreats through the threshold
      p = 1 - e; const u = smooth(0, 0.4, e), b = smooth(0.25, 1, e);
      disp = CROSS * (1 - b);
      view = { x: s.from.x * (1 - u), z: s.from.z * (1 - u) + CROSS * b, yaw: s.from.yaw * (1 - u) };
    }
    // the field camera is driven here, so input written to its targets this frame is overwritten
    const a = (sv.tyaw * Math.PI) / 180;
    cam.x = cam.tx = sv.x + Math.sin(a) * disp;
    cam.z = cam.tz = sv.z - Math.cos(a) * disp;
    cam.yaw = sv.yaw; cam.tyaw = sv.tyaw;
    if (t >= 1) {
      if (entering) {
        Object.assign(cam, { x: 0, z: 0, tx: 0, tz: 0, yaw: 0, tyaw: 0 });
        s.phase = "space"; view = { x: 0, z: 0, yaw: 0 };
      } else {
        Object.assign(cam, sv);
        s.phase = "field";
      }
      f.forceUpdate();
    }
  }

  s.floor.clear();
  if (s.phase !== "field") {
    const m = s.m || (s.m = f.tableMetrics());
    f.state.table.forEach(id => s.floor.set(id, floorAt(m, f.tablePos[id] || { x: 50, y: 50 })));
  }

  const rad = (view.yaw * Math.PI) / 180;
  const A = ATMOSPHERE;
  return {
    p, cards: p >= 0.5, view, cs: Math.cos(rad), sn: Math.sin(rad),
    fieldAlpha: 1 - smooth(0, 0.6, p), spaceAlpha: smooth(0.4, 1, p),
    density: A.field.density + (A.space.density - A.field.density) * p
  };
}

// Where an object stands in the space this frame, or null when it keeps its field placement.
export function cardAt(f: Field, sl: SpaceFrame, id: string): Pt | null {
  return sl.cards ? f.sp.floor.get(id) || null : null;
}

// How far a card has faded into the fog at distance d; zero while the density is zero.
export function tint(sl: SpaceFrame, d: number): number {
  return sl.density ? Math.min(0.85, Math.pow(Math.max(0, d) * sl.density, 1.3)) : 0;
}

export function fogCard(el: HTMLElement, t: number) {
  const fog = el.lastElementChild as HTMLElement | null;
  if (!fog || fog.dataset.part !== "fog") return;
  const o = t.toFixed(2);
  if (fog.dataset.o !== o) { fog.style.opacity = o; fog.dataset.o = o; }
}

// Per-frame writes outside the card loop: atmosphere variables, the gate, and the field's tracks, which only make sense in the field.
export function paint(f: Field, sl: SpaceFrame, depth: number) {
  const s = f.sp, A = ATMOSPHERE;
  const root = f.stage && f.stage.parentElement;
  const pct = (sl.p * 100).toFixed(1);
  if (root && s.fogKey !== pct) {
    s.fogKey = pct;
    root.style.setProperty("--space-fog", `color-mix(in srgb, ${A.space.fog} ${pct}%, ${A.field.fog})`);
    root.style.setProperty("--space-fog-mid", `color-mix(in srgb, ${A.space.mid} ${pct}%, ${A.field.mid})`);
    root.style.setProperty("--space-fog-amount", (sl.density / A.space.density).toFixed(3));
  }

  if (sl.p > 0) {
    if (f.tracks && f.tracks.childElementCount) f.tracks.textContent = "";
    f.trackEls = null; f.trackKey = null;
  } else f.paintTracks(depth);

  if (s.mode !== "gate") return;
  if (!s.gateEl || !s.gateEl.isConnected) s.gateEl = f.stage ? f.stage.querySelector<HTMLElement>('[data-role="gate"]') : null;
  const g = s.gateEl;
  if (!g) return;
  const { view, cs, sn } = sl;
  const dx = -view.x, dz = GATE_Z - view.z;
  const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs, d = -lz;
  if (s.phase === "field" || d < 40 || d > f.FAR) { if (g.style.visibility !== "hidden") g.style.visibility = "hidden"; return; }
  g.style.visibility = "visible";
  g.style.opacity = smooth(40, 200, d).toFixed(3);
  // a world-fixed plane turns with the camera by the same rotation that places its centre
  g.style.transform = `translate3d(${lx.toFixed(1)}px, 0px, ${lz.toFixed(1)}px) rotateY(${view.yaw.toFixed(2)}deg) translate(-50%, -50%)`;
}

export function vals(f: Field, st: State) {
  const s = f.sp;
  const walkIn = () => enter(f), leaveSpace = () => leave(f);
  return {
    spaceOn: !!s.mode,
    spaceGate: s.mode === "gate",
    spaceIn: s.phase === "space",
    walkIn: canEnter(f),
    onWalkIn: walkIn, onWalkInKey: key(walkIn),
    onLeaveSpace: leaveSpace, onLeaveSpaceKey: key(leaveSpace),
    walkInHint: st.table.length ? "alt + w" : ""
  };
}
