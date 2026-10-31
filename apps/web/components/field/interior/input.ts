// Interior input: wheel, pointer and keyboard bindings for the entity view; pinches are swallowed, never acted on.
import type Field from "../Field";
import { clampN, type Dir } from "./state";
import { kick, limits, nudge } from "./physics";
import { goNeighbour } from "./lifecycle";

const JUMP: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

export function keyPan(f: Field, e: KeyboardEvent): boolean {
  const ix = f.ix;
  if (ix.phase !== "inside" || e.metaKey || e.ctrlKey) return false;
  if ((e.target as HTMLElement | null)?.closest?.("video, input, textarea, select")) return false;
  // Alt + arrow jumps to that edge's neighbour; the caller's preventDefault keeps Alt+Left from going back in history
  if (e.altKey) {
    const dir = JUMP[e.key]; if (!dir) return false;
    goNeighbour(f, dir); f.tick();
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
  const { W, H, loX, loY } = limits(c), m = 48, r = piece.getBoundingClientRect();
  const fit = (lo: number, hi: number, size: number) => hi - lo > size - 2 * m || lo < m ? m - lo : hi > size - m ? size - m - hi : 0;
  const dx = fit(r.left, r.right, W), dy = fit(r.top, r.bottom, H);
  if (!dx && !dy) return;
  ix.vx = 0; ix.vy = 0;
  ix.goal = { x: clampN(ix.panX + dx, loX, 0), y: clampN(ix.panY + dy, loY, 0) };
}

export function bindInterior(f: Field, host: HTMLElement) {
  const el = host as HTMLElement & { __amorfAbort?: AbortController };
  if (el.__amorfAbort) el.__amorfAbort.abort();
  const ac = new AbortController();
  el.__amorfAbort = ac;
  const sig = { signal: ac.signal };
  const ix = f.ix;

  el.addEventListener("wheel", (e: WheelEvent) => {
    // the drawer scrolls natively; everywhere else the wheel pans the board
    if ((e.target as HTMLElement).closest('[data-role="drawer"]')) return;
    e.preventDefault(); f.used();
    if (ix.phase !== "inside") return;
    // a trackpad pinch arrives as a ctrl-wheel: swallowed so the page does not zoom, and it never leaves
    if (e.ctrlKey) return;
    ix.wheelAt = performance.now(); ix.goal = null;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    // the wheel moves the composition directly: any glide after it stops comes from the device, not from here
    ix.vx = 0; ix.vy = 0;
    nudge(f, -(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit, e.shiftKey ? 0 : -e.deltaY * unit);
    f.tick();
  }, { passive: false, signal: ac.signal });

  el.addEventListener("pointerdown", (e: PointerEvent) => {
    // secondary and ctrl-clicks never get a matching pointerup worth trusting, so they are not tracked at all
    if (ix.phase !== "inside" || e.button !== 0) return;
    ix.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    ix.goal = null; ix.vx = 0; ix.vy = 0;
    // a second finger ends the drag; the pinch itself does nothing
    if (ix.pointers.size === 2) { ix.drag = null; return; }
    if ((e.target as HTMLElement).closest("video, [data-nodrag]")) return;
    ix.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0, captured: false };
  }, sig);

  el.addEventListener("pointermove", (e: PointerEvent) => {
    const p = ix.pointers.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (ix.pointers.size > 1) return;
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
    const d = ix.drag;
    if (d && d.id === e.pointerId) {
      ix.drag = null;
      if (d.moved > 6) ix.movedAt = performance.now();
      // holding still before letting go means no fling
      if (f.reduced || e.timeStamp - d.t > 90) { ix.vx = 0; ix.vy = 0; }
      ix.vx = clampN(ix.vx, -4, 4); ix.vy = clampN(ix.vy, -4, 4);
    }
    f.tick();
  };
  el.addEventListener("pointerup", end, sig);
  el.addEventListener("pointercancel", end, sig);

  // Anything that can swallow a pointerup must not leave a pointer behind: a stale one reads as the first finger of a pinch.
  const reset = () => { ix.pointers.clear(); ix.drag = null; ix.gesture = false; };
  el.addEventListener("lostpointercapture", (e: PointerEvent) => { ix.pointers.delete(e.pointerId); if (ix.drag && ix.drag.id === e.pointerId) ix.drag = null; }, sig);
  el.addEventListener("contextmenu", reset, sig);
  window.addEventListener("blur", reset, sig);

  // Safari reports a trackpad pinch as gesture events, not ctrl-wheel.
  el.addEventListener("gesturestart", (e: Event) => { e.preventDefault(); if (ix.phase === "inside") ix.gesture = true; }, { passive: false, signal: ac.signal });
  el.addEventListener("gesturechange", (e: Event) => e.preventDefault(), { passive: false, signal: ac.signal });
  el.addEventListener("gestureend", (e: Event) => { e.preventDefault(); ix.gesture = false; f.tick(); }, { passive: false, signal: ac.signal });

  el.addEventListener("click", (e: MouseEvent) => {
    if (performance.now() - ix.movedAt < 160) { e.stopPropagation(); e.preventDefault(); }
  }, { capture: true, signal: ac.signal });

  el.addEventListener("focusin", (e: FocusEvent) => reveal(f, e.target as HTMLElement), sig);
}
