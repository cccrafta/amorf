// Interior input: wheel, pointer and keyboard bindings for the entity view, including zoom (pinch, ctrl-wheel, Safari gestures, + - 0).
import type Field from "../Field";
import { clampN, type Dir } from "./state";
import { kick, limits, nudge, zoomAt, zoomMin, zoomToward } from "./physics";
import { goNeighbour } from "./lifecycle";
import { scroll } from "../scroll";

const JUMP: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

export function keyPan(f: Field, e: KeyboardEvent): boolean {
  const ix = f.ix;
  if (ix.phase === "slide" || ix.slide) return true;
  if (ix.phase !== "inside" || e.metaKey || e.ctrlKey) return false;
  if ((e.target as HTMLElement | null)?.closest?.("video, input, textarea, select")) return false;
  // Alt + arrow jumps to that edge's neighbour; the caller's preventDefault keeps Alt+Left from going back in history
  if (e.altKey) {
    const dir = JUMP[e.key]; if (!dir) return false;
    goNeighbour(f, dir); f.tick();
    return true;
  }
  // + and - zoom about the viewport centre, 0 returns to 1x; the browser's own zoom keeps its modifier keys
  const zk = e.key === "+" || e.key === "=" ? 1.25 : e.key === "-" || e.key === "_" ? 0.8 : e.key === "0" ? 0 : null;
  if (zk !== null && ix.comp) {
    const W = window.innerWidth, H = window.innerHeight, z = ix.zoomTo ? ix.zoomTo.z : ix.zoom;
    zoomToward(f, zk ? z * zk : 1, (W / 2 - ix.panX) / ix.zoom, (H / 2 - ix.panY) / ix.zoom, W / 2, H / 2); f.tick();
    return true;
  }
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
  const { W, H, loX, loY, hiX, hiY } = limits(c, ix.zoom), m = 48, r = piece.getBoundingClientRect();
  const fit = (lo: number, hi: number, size: number) => hi - lo > size - 2 * m || lo < m ? m - lo : hi > size - m ? size - m - hi : 0;
  const dx = fit(r.left, r.right, W), dy = fit(r.top, r.bottom, H);
  if (!dx && !dy) return;
  ix.vx = 0; ix.vy = 0;
  ix.goal = { x: clampN(ix.panX + dx, loX, hiX), y: clampN(ix.panY + dy, loY, hiY) };
}

export function bindInterior(f: Field, host: HTMLElement) {
  const el = host as HTMLElement & { __amorfAbort?: AbortController };
  if (el.__amorfAbort) el.__amorfAbort.abort();
  const ac = new AbortController();
  el.__amorfAbort = ac;
  const sig = { signal: ac.signal };
  const ix = f.ix;

  el.addEventListener("wheel", (e: WheelEvent) => {
    // the drawer and the expanded text scroll natively; everywhere else the wheel pans the board
    const t = e.target as HTMLElement;
    if (t.closest('[data-role="drawer"], [data-role="float"][data-open]')) return;
    e.preventDefault(); f.used();
    // Momentum left over from the pull that started a slide is swallowed until the stream pauses, so it never pans
    // the next entity or pulls on through to the one after.
    const now = performance.now();
    // Momentum only ever shrinks, so a delta that grows is a new gesture and ends the mute at once; so do a pause and a
    // hard cap, because trackpad momentum can run on for over a second.
    if (ix.wheelMute) {
      const mag = Math.hypot(e.deltaX, e.deltaY);
      const live = now - ix.wheelMute > 120 || now - ix.wheelMuteFrom > 900 || mag > ix.wheelMuteMag * 1.3 + 1;
      if (live) ix.wheelMute = 0;
      else { ix.wheelMute = now; ix.wheelMuteMag = mag; return; }
    }
    if (ix.phase !== "inside" || ix.slide) return;
    // a trackpad pinch arrives as a ctrl-wheel: it zooms the board about the pointer
    if (e.ctrlKey) { zoomAt(f, ix.zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); f.tick(); return; }
    ix.wheelAt = now; ix.goal = null; ix.zoomTo = null;
    const mag = Math.hypot(e.deltaX, e.deltaY), prev = ix.wheelMags[ix.wheelMags.length - 1];
    ix.wheelMags = [...ix.wheelMags.slice(-2), mag];
    // a shrinking delta is the device's momentum, not the hand: only scroll.momentum of it moves the board
    const k = scroll.wheel * (prev !== undefined && mag < prev ? scroll.momentum : 1);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    // the wheel moves the composition directly: any glide after it stops comes from the device, not from here
    ix.vx = 0; ix.vy = 0;
    nudge(f, -(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit * k, e.shiftKey ? 0 : -e.deltaY * unit * k);
    f.tick();
  }, { passive: false, signal: ac.signal });

  el.addEventListener("pointerdown", (e: PointerEvent) => {
    // secondary and ctrl-clicks never get a matching pointerup worth trusting, so they are not tracked at all
    // a press anywhere outside the open menu dismisses it
    if (ix.menu && !(e.target as HTMLElement).closest('[data-role="menu"], [data-role="menu-btn"]')) { ix.menu = false; f.forceUpdate(); }
    if (ix.phase !== "inside" || ix.slide || e.button !== 0) return;
    ix.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    ix.goal = null; ix.zoomTo = null; ix.vx = 0; ix.vy = 0;
    // a second finger ends the drag and starts a pinch
    if (ix.pointers.size === 2) {
      const [a, b] = [...ix.pointers.values()];
      ix.drag = null; ix.pinch = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: ix.zoom };
      return;
    }
    if ((e.target as HTMLElement).closest("video, [data-nodrag]")) return;
    ix.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0, captured: false };
  }, sig);

  el.addEventListener("pointermove", (e: PointerEvent) => {
    const p = ix.pointers.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (ix.pointers.size > 1) {
      const [a, b] = [...ix.pointers.values()];
      if (ix.pinch && b) { zoomAt(f, ix.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / ix.pinch.d0, (a.x + b.x) / 2, (a.y + b.y) / 2); f.tick(); }
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
    if (ix.pointers.size < 2) ix.pinch = null;
    const d = ix.drag;
    if (d && d.id === e.pointerId) {
      ix.drag = null;
      if (d.moved > 6) ix.movedAt = performance.now();
      // holding still before letting go means no fling
      if (f.reduced || e.timeStamp - d.t > 90) { ix.vx = 0; ix.vy = 0; }
      ix.vx = clampN(ix.vx, -scroll.fling, scroll.fling); ix.vy = clampN(ix.vy, -scroll.fling, scroll.fling); ix.keyGlide = false;
    }
    f.tick();
  };
  el.addEventListener("pointerup", end, sig);
  el.addEventListener("pointercancel", end, sig);

  // Anything that can swallow a pointerup must not leave a pointer behind: a stale one reads as the first finger of a pinch.
  const reset = () => { ix.pointers.clear(); ix.drag = null; ix.gesture = false; ix.pinch = null; };
  el.addEventListener("lostpointercapture", (e: PointerEvent) => { ix.pointers.delete(e.pointerId); if (ix.drag && ix.drag.id === e.pointerId) ix.drag = null; }, sig);
  el.addEventListener("contextmenu", reset, sig);
  window.addEventListener("blur", reset, sig);

  // Safari reports a trackpad pinch as gesture events, not ctrl-wheel.
  type Gesture = Event & { scale: number; clientX: number; clientY: number };
  el.addEventListener("gesturestart", (e: Event) => { e.preventDefault(); if (ix.phase === "inside" && !ix.slide) { ix.gesture = true; ix.gestureZ = ix.zoom; } }, { passive: false, signal: ac.signal });
  el.addEventListener("gesturechange", (e: Event) => {
    e.preventDefault();
    const g = e as Gesture;
    if (ix.gesture) { zoomAt(f, ix.gestureZ * g.scale, g.clientX, g.clientY); f.tick(); }
  }, { passive: false, signal: ac.signal });
  el.addEventListener("gestureend", (e: Event) => { e.preventDefault(); ix.gesture = false; f.tick(); }, { passive: false, signal: ac.signal });

  el.addEventListener("click", (e: MouseEvent) => {
    if (performance.now() - ix.movedAt < 160) { e.stopPropagation(); e.preventDefault(); }
  }, { capture: true, signal: ac.signal });

  // In the overview (fully zoomed out) a click on a piece zooms back to 1x centred on it. Pieces take no pointer
  // events (view.tsx), so the piece is found from the layout boxes.
  el.addEventListener("click", (e: MouseEvent) => {
    const c = ix.comp, lay = ix.layout;
    if (ix.phase !== "inside" || ix.slide || !c || !lay || ix.zoom > zoomMin(c) + 0.02) return;
    if ((e.target as HTMLElement).closest("[data-nodrag], video")) return;
    const bx = (e.clientX - ix.panX) / ix.zoom, by = (e.clientY - ix.panY) / ix.zoom;
    const b = Object.values(lay.pos).find(p => bx >= p.x && bx <= p.x + p.w && by >= p.y && by <= p.y + p.h);
    if (!b) return;
    zoomToward(f, 1, b.x + b.w / 2, b.y + b.h / 2, window.innerWidth / 2, window.innerHeight / 2); f.tick();
  }, sig);

  el.addEventListener("focusin", (e: FocusEvent) => reveal(f, e.target as HTMLElement), sig);
}
