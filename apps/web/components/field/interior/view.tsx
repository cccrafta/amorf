// Interior view: the open entity's board — pieces placed by placement.ts on a surface larger than the viewport, panned by
// paint() — the text overlay over it, and the fixed frame over both. Pieces render through their kind.
import type React from "react";
import type { V } from "../types";
import { FLOAT } from "./state";
import type { InteriorView, Placed, Preview } from "./layout";
import { peekAt } from "./paint";
import { pieceFor } from "./pieces";
import { frameLine } from "./pieces/media";
import { renderFrame } from "./frame";

// The text overlay sits still over the board, bottom-left. At rest it is capped at FLOAT.rest of the viewport and,
// when longer, fades out at the bottom; that fade is the control that opens it to the full height, scrolling.
// Box and column are shared with the slide preview's still copy, so both lay the text out identically.
const floatBox = (open: boolean): React.CSSProperties => ({
  position: "absolute", left: FLOAT.l, bottom: FLOAT.b, width: FLOAT.w, maxWidth: "calc(100% - " + 2 * FLOAT.l + "px)", top: open ? 56 : undefined, maxHeight: open ? undefined : FLOAT.rest * 100 + "vh",
  overflowY: open ? "auto" : "hidden", padding: "18px 0 20px",
});
const floatColumn = (floats: InteriorView["floats"], fade: boolean) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 22, maskImage: fade ? "linear-gradient(#000 55%, transparent)" : undefined }}>
    {floats.map(p => <div key={p.key} data-float={p.key}>{pieceFor(p.kind)?.render(p.data, null)}</div>)}
  </div>
);

function renderFloat(it: InteriorView) {
  if (!it.floats.length) return null;
  const open = it.floatOpen, fade = it.floatOverflow && !open;
  return (
    <div data-role="float" data-open={open ? "" : undefined} data-nodrag=""
      style={{ ...floatBox(open), overscrollBehavior: "contain", touchAction: open ? "pan-y" : "none", scrollbarWidth: "none", cursor: "default", userSelect: "text",
        opacity: it.drawer ? 0 : 1, pointerEvents: it.drawer ? "none" : undefined, transition: "opacity 400ms ease" }}>
      {open && (
        <span role="button" tabIndex={0} aria-expanded onClick={it.onFloat} onKeyDown={it.onFloatKey} className="field-label field-hover-accent"
          style={{ position: "sticky", top: 0, float: "right", fontSize: 9, cursor: "pointer", outline: "none", transition: "color 400ms ease" }}>less ×</span>
      )}
      {floatColumn(it.floats, fade)}
      {fade && (
        <div role="button" tabIndex={0} aria-label="read all" aria-expanded={false} onClick={it.onFloat} onKeyDown={it.onFloatKey}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", cursor: "s-resize", outline: "none" }} />
      )}
    </div>
  );
}

// Pieces take no pointer events, so the wheel always lands on the board surface, which outlives an entity switch: Chrome
// keeps sending the wheel to a removed element until the mouse moves. Interactive kinds opt back in.
function renderPiece(p: Placed, key: string, anim: React.CSSProperties | null, still: boolean) {
  return (
    <div key={key} data-piece={still ? undefined : p.key} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h || undefined, zIndex: p.z, pointerEvents: "none", ...anim }}>
      {/* a still copy must not carry the video slot: media.ts moves the live element into the first slot in the document */}
      {still && p.item.kind === "video" ? <div style={{ width: "100%", aspectRatio: "16 / 9", border: frameLine }} /> : pieceFor(p.item.kind)?.render(p.item.data, p.h)}
    </div>
  );
}

// The next entity's board exactly as it will open, with no background so it reads as more of the same table: a
// neighbour's waits off its side and follows an edge pull (paint.ts); the cover finishes the slide and then fades off
// the real board, which by then shows the same picture underneath.
function renderPreview(p: Preview, role: string, transform: string, opacity = 1) {
  return (
    <div key={role} data-role={role} aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none", willChange: "transform, opacity", transform, opacity, visibility: role === "cover" ? undefined : "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: p.w, height: p.h, transformOrigin: "0 0", transform: "translate3d(" + p.x.toFixed(1) + "px, " + p.y.toFixed(1) + "px, 0)" }}>
        {p.pieces.map(q => renderPiece(q, q.key, null, true))}
      </div>
      {p.floats.length > 0 && <div style={floatBox(false)}>{floatColumn(p.floats, p.floatOverflow)}</div>}
    </div>
  );
}

// paint.ts owns transform/opacity/clip-path on the root, the board transform and the edge labels, found via
// data-role (interior, comp, float, edge-*); the inline values here are only the hidden baseline.
export function renderInterior(v: V, it: InteriorView) {
  return (
    <div data-role="interior" style={{ position: "absolute", inset: 0, zIndex: 30, overflow: "clip", touchAction: "none", userSelect: "none", cursor: "grab", transformOrigin: "0 0", willChange: "transform, opacity, clip-path", background: "color-mix(in srgb, var(--field-bg) 96%, transparent)", opacity: 0, pointerEvents: "none" }}>
      <div data-role="comp" style={{ position: "absolute", left: 0, top: 0, width: it.w, height: it.h, transformOrigin: "0 0", willChange: "transform", opacity: it.drawer ? 0.55 : 1, transition: "opacity 400ms ease" }}>
        <style>{"@keyframes am-unfold { from { opacity: 0; translate: var(--ox) var(--oy) } to { opacity: 1; translate: 0 0 } }"}</style>
        {/* keyed by entity so each opening replays the unfold; reduced motion keeps the fade without the movement */}
        {it.pieces.map(p => renderPiece(p, it.entity + p.key,
          p.enter && it.unfold ? { "--ox": (it.reduced ? 0 : p.enter.ox) + "px", "--oy": (it.reduced ? 0 : p.enter.oy) + "px", animation: "am-unfold 420ms cubic-bezier(0.22, 1, 0.36, 1) " + p.enter.dl + "ms both" } as React.CSSProperties : null, false))}
      </div>
      {renderFloat(it)}
      {renderFrame(v, it)}
      {it.edges.map(e => e.peek && renderPreview(e.peek, "peek-" + e.dir, peekAt(e.dir, 0)))}
      {it.slide?.p && renderPreview(it.slide.p, "cover", it.slide.fade || !it.slide.dir ? "none" : peekAt(it.slide.dir, Math.max(0, it.slide.r0)), it.slide.fade ? 0 : 1)}
    </div>
  );
}
