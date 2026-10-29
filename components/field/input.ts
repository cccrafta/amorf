// Input: pointer, wheel, touch and keyboard bindings for the field stage.
import type Field from "./Field";
import { keyPan } from "./interior";

export function used(f: Field) { if (!f.hintGone) f.hintGone = true; }

// Travel along the heading you are pointing at, not the one the easing has
// caught up to, so a turn-then-scroll goes where you just aimed.
export function forward(f: Field, dist: number) {
  const a = (f.cam.tyaw * Math.PI) / 180;
  f.cam.tx += Math.sin(a) * dist;
  f.cam.tz -= Math.cos(a) * dist;
}

// One binding per element: a hot reload keeps the DOM but makes a new logic
// instance, and re-binding would multiply every scroll and drag.
export function bindStage(f: Field, el: HTMLElement) {
  if ((el as any).__amorfAbort) (el as any).__amorfAbort.abort();
  const ac = new AbortController();
  (el as any).__amorfAbort = ac;
  const sig = { signal: ac.signal };

  el.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault(); f.used();
    // inside an entity the field camera stays put; its own composition takes the gesture
    if (f.state.open) return;
    const lateral = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const dx = lateral ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    const dy = (lateral || e.shiftKey) ? 0 : e.deltaY;
    f.forward(-dy * 1.9);
    f.cam.tyaw += dx * 0.085;
    f.tick();
  }, { passive: false, signal: ac.signal });

  el.addEventListener("pointermove", (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    f.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    f.pointerAt = performance.now();
    if (f.drag && e.pointerId === f.drag.id) {
      if (e.buttons === 0 && e.pointerType === "mouse") { f.drag = null; f.tick(); return; }
      if (!f.drag.captured && f.drag.moved > 6) {
        f.drag.captured = true;
        try { if (el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      const mdx = e.clientX - f.drag.x, mdy = e.clientY - f.drag.y;
      f.cam.tyaw += mdx * -0.14;
      if (e.pointerType !== "mouse") f.forward(mdy * -5.2);
      f.drag.moved += Math.abs(mdx) + Math.abs(mdy);
      f.drag.x = e.clientX; f.drag.y = e.clientY;
      f.used();
    }
    f.tick();
  }, sig);
  el.addEventListener("pointerdown", (e: PointerEvent) => { if (f.state.open) return; f.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, captured: false }; }, sig);
  el.addEventListener("pointercancel", () => { f.drag = null; }, sig);
  el.addEventListener("pointerup", (e: PointerEvent) => {
    const d = f.drag; f.drag = null;
    if (f.state.open) return;
    if (d && d.moved > 8) { f.suppressClick = performance.now(); return; }
    if (e.pointerType !== "mouse") {
      const r = el.getBoundingClientRect();
      f.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      f.pointerAt = performance.now();
      f.tick();
    }
    if (e.target && (e.target as HTMLElement).closest && (e.target as HTMLElement).closest("[data-obj]")) return;
    const fx = f.state.focus;
    if (fx && fx.id !== f.state.open && !f.state.naming) f.open(fx.id, "◉");
  }, sig);
  el.addEventListener("pointerleave", () => { f.drag = null; f.pointer = null; }, sig);

  let touch: any = null;
  el.addEventListener("touchstart", () => { f.used(); }, { passive: true, signal: ac.signal });
  el.addEventListener("touchmove", (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); }, { passive: false, signal: ac.signal });
  el.addEventListener("touchend", () => { touch = null; }, sig);
}

export function keydown(f: Field, e: KeyboardEvent) {
  if (f.state.plan) { if (e.key === "Escape") f.setState({ plan: false }); return; }
  if (f.state.tableOpen) { if (e.key === "Escape" && !(document.activeElement && document.activeElement.tagName === "INPUT")) f.setState({ tableOpen: false }); return; }
  if (f.state.catalogue) { if (e.key === "Escape") f.setState({ catalogue: false }); return; }
  if (f.state.compose || f.state.view) {
    if (e.key === "Escape") { f.paperStrokes = []; f.paperImg = null; f.setState({ compose: null, view: null, noteTxt: "" }); }
    return;
  }
  if (f.state.naming) return;
  const ae = document.activeElement as HTMLElement | null, typing = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"));
  if (e.key === "Escape") {
    if (typing) { ae!.blur(); f.setState({ askOpen: false }); return; }
    if (f.state.open) { f.collapse(); e.preventDefault(); }
    return;
  }
  if (typing) return;
  if (f.state.open) { if (keyPan(f, e)) e.preventDefault(); return; }
  const step = e.shiftKey ? 900 : 340;
  if (e.key === "ArrowUp") { f.forward(step); f.used(); f.tick(); e.preventDefault(); return; }
  if (e.key === "ArrowDown") { f.forward(-step); f.used(); f.tick(); e.preventDefault(); return; }
  if (e.key === "ArrowLeft") { f.cam.tyaw -= 9; f.used(); f.tick(); e.preventDefault(); return; }
  if (e.key === "ArrowRight") { f.cam.tyaw += 9; f.used(); f.tick(); e.preventDefault(); return; }
  if (e.key === "Enter") {
    const fx = f.state.focus;
    if (fx && fx.id !== f.state.open) { f.open(fx.id, "◉"); e.preventDefault(); }
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1 && /\S/.test(e.key)) {
    f.wantFocus = true;
    f.setState({ askOpen: true, query: f.state.query + e.key });
    e.preventDefault();
  }
}
