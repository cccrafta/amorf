// Stage layer: the 3D world of cards, a single card, and the media slot that sits beside the detail panel.
import type { V, PlateSeg, NoteMark } from "../types";

// Card DOM order is load-bearing: frame() reads el.firstElementChild as the plate svg
// and el.children[2] as the <h3> title via querySelector("[data-obj]") — never reorder
// the first three children (plate svg, kind/year row, title).
export function renderNode(n: any, v: V) {
  return (
    <div
      key={n.id}
      data-obj={n.id}
      role="button"
      tabIndex={-1}
      onClick={n.open}
      style={{ position: "absolute", left: "50%", top: "50%", width: 340, transformStyle: "preserve-3d", willChange: "transform, opacity", userSelect: "none", visibility: "hidden" }}
    >
      <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: 226, border: "1px solid rgba(168,176,173,0.45)", background: "rgba(228,223,210,0.05)" }}>
        {n.plate.map((s: PlateSeg, i: number) => (
          <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />
        ))}
      </svg>
      <div className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 12, margin: "9px 0 4px", fontSize: 10 }}>
        <span>{n.kind}</span>
        <span>{n.year}</span>
      </div>
      <h3 className="field-title" style={{ margin: 0, fontWeight: 400, fontSize: 25, lineHeight: 1.12 }}>{n.title}</h3>
      <div data-part="cue" className="field-label" style={{ marginTop: 7, fontSize: 9, letterSpacing: "0.22em", color: "var(--field-accent)", opacity: 0 }}>{v.openCue}</div>
      <div data-part="cloud" data-o="0" style={{ position: "absolute", left: "-14%", top: "-7%", width: "128%", height: 262, pointerEvents: "none", opacity: 0 }}>
        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
          {n.cloud.map((s: NoteMark, i: number) => (
            <path key={i} d={s.d} fill="none" stroke="var(--field-line)" strokeWidth={s.w} strokeLinecap="round" opacity={0.55} />
          ))}
        </svg>
      </div>
      {n.live && <div data-part="media" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 226, pointerEvents: "none", overflow: "hidden" }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 226, pointerEvents: "none" }}>
        {n.marks.map((k: any, ki: number) => (
          <div key={ki} data-part="mark" data-op={k.op} style={{ position: "absolute", inset: 0, opacity: 0 }}>
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
              {k.marks.map((s: NoteMark, si: number) => (
                <path key={si} d={s.d} pathLength={1} fill="none" stroke={k.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.9} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
              ))}
            </svg>
          </div>
        ))}
      </div>
      {n.hasMarks && (
        <div
          data-part="mark"
          data-op="0.9"
          role="button"
          tabIndex={-1}
          onClick={n.openTrace}
          className="field-label field-label-accent"
          style={{ position: "absolute", left: 9, top: 198, opacity: 0, cursor: "pointer", fontSize: 8.5, letterSpacing: "0.18em" }}
        >
          {n.traceLabel}
        </div>
      )}
    </div>
  );
}

// Sits beside the detail panel, not inside it: [data-role="page"] is transformed, blurred and
// overflow-hidden, which would clip and restyle the live element.
export function renderMediaStage(v: V) {
  return (
    <div data-role="mediastage" style={{ position: "absolute", inset: 0, zIndex: 31, opacity: 0, visibility: "hidden", pointerEvents: "none" }}>
      <div data-part="slot" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />
      <div role="button" tabIndex={0} onClick={v.onClose} onKeyDown={v.onCloseKey} className="field-label field-hover-split" style={{ position: "absolute", top: 15, left: "clamp(18px, 3vw, 42px)", display: "flex", alignItems: "center", gap: 9, cursor: "pointer", outline: "none", fontSize: 10, color: "rgba(var(--field-mute-rgb), 0.85)", transition: "color 400ms ease", pointerEvents: "auto" }}>
        <span>←</span>
        <span>put it back</span>
      </div>
    </div>
  );
}

export function renderStage(v: V) {
  return (
    <div
      data-role="stage"
      style={{ position: "absolute", inset: 0, perspective: 900, perspectiveOrigin: "50% 46%", cursor: "crosshair", touchAction: "none", background: "radial-gradient(120% 90% at 50% 45%, var(--field-bg-mid) 0%, var(--field-bg) 55%, var(--field-bg-dark) 100%)" }}
    >
      <div data-role="world" style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", willChange: "transform" }}>
        {v.nodes.map((n: any) => renderNode(n, v))}
      </div>
      <svg data-role="tracks" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2, overflow: "visible" }} />
    </div>
  );
}
