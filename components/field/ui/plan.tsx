// Plan overlay: the field seen from above.
import type { V } from "../types";

export function renderPlan(v: V) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 36, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px 16px" }}>
            <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)", lineHeight: 1 }}>The field from above</span>
            <span className="field-label" style={{ fontSize: 9.5 }}>{v.planTally}</span>
          </div>
          <span className="field-label" style={{ fontSize: 8.5, lineHeight: 1.6, letterSpacing: "0.2em", color: "rgba(var(--field-mute-rgb), 0.45)" }}>worn things sit larger · kept routes run heavier · point at a mark for its name</span>
        </div>
        <div role="button" tabIndex={0} onClick={v.onClosePlan} onKeyDown={v.onClosePlanKey} className="field-label field-hover-accent" style={{ flex: "0 0 auto", whiteSpace: "nowrap", cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>stand back up</div>
      </div>
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(14px, 3vh, 34px)" }}>
        <div data-role="planbox" style={{ position: "relative", height: "100%", aspectRatio: "1 / 1", maxWidth: "100%", border: "1px solid rgba(168,176,173,0.16)" }}>
          <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            {/* out.planEdges (an array) shadows props.planEdges (the boolean gate) at
                runtime since renderVals() spreads last — cast past V's static boolean type. */}
            {(v.planEdges as any as { d: string }[]).map((e: any, ei: number) => (
              <path key={ei} d={e.d} fill="none" stroke="var(--field-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.12} />
            ))}
            {v.planWalks.map((w: any, wi: number) => (
              <path key={wi} d={w.d} fill="none" stroke={w.color} strokeWidth={w.w} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={w.op} />
            ))}
            <path d={v.planMine} fill="none" stroke="var(--field-walk)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.9} />
          </svg>
          {/* placePlanLabels() reads n.children[0] as the marker dot and n.children[1] as
              the label span by position — keep exactly these two children, in this order. */}
          {v.planNodes.map((p: any) => (
            <div key={p.id} data-pid={p.id} data-side={p.side} role="button" tabIndex={0} onClick={p.go} onKeyDown={p.key} onMouseEnter={p.enter} onMouseLeave={p.leave} onFocus={p.enter} onBlur={p.leave} style={{ position: "absolute", left: p.x, top: p.y, width: 0, height: 0, zIndex: p.z, cursor: "pointer", outline: "none", opacity: p.op, transition: "opacity 300ms ease" }}>
              <span style={{ position: "absolute", left: 0, top: 0, transform: "translate(-50%, -50%)", width: p.size, height: p.size, border: `1px solid ${p.ink}`, background: "rgba(228,223,210,0.07)" }} />
              <span style={{ position: "absolute", top: 0, left: p.lox, transform: p.ltf, whiteSpace: "nowrap", fontFamily: "var(--font-label), monospace", fontSize: 8.5, letterSpacing: "0.1em", color: p.labelInk, opacity: p.labelOp, transition: "opacity 260ms ease" }}>{p.title}</span>
            </div>
          ))}
          <div data-role="planyou" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, border: "1px solid var(--field-walk)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", left: 0, top: -22, width: 1, height: 22, background: "var(--field-walk)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
