// Trace UI: the walk rail down the side and the journey bar for a filtered walk.
import type { V } from "../types";

// layout() indexes this rail's children positionally (rail.children[0..3]) to toggle
// narrow-mode flex direction — the head/list/tally/leave order below must not change.
export function renderTraceRail(v: V) {
  return (
    <div data-plane-ui="1" data-keepclear="40" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "clamp(78px, 8vw, 112px)", zIndex: 21, borderRight: "1px solid rgba(168,176,173,0.14)", background: "rgba(6,10,11,0.6)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column" }}>
      <div className="field-label" style={{ padding: "18px 10px 10px", fontSize: 8, letterSpacing: "0.22em" }}>walk</div>
      <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "4px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        {v.trace.map((t: any, i: number) => (
          <div key={i} role="button" tabIndex={0} onClick={t.go} onKeyDown={t.key} style={{ cursor: "pointer", outline: "none", display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.55)" }}>
              <span>{t.mark}</span>
              <span>{t.year}</span>
            </div>
            <div className="field-hover-accent" style={{ fontFamily: "var(--font-label), monospace", fontSize: 9.5, lineHeight: 1.38, overflowWrap: "anywhere", color: t.color }}>{t.label}</div>
          </div>
        ))}
      </div>
      <div className="field-label" style={{ padding: "10px 10px 0", fontSize: 8, lineHeight: 1.6, letterSpacing: "0.14em" }}>{v.crossed}</div>
      <div role="button" tabIndex={0} onClick={v.onLeaveTrace} onKeyDown={v.onLeaveTraceKey} className="field-hover-accent" style={{ padding: "12px 10px 18px", borderTop: "1px solid rgba(168,176,173,0.14)", fontFamily: "var(--font-label), monospace", fontSize: 8.5, lineHeight: 1.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(110,154,141,0.8)", cursor: "pointer", outline: "none" }}>let this walk go</div>
    </div>
  );
}

export function renderJourneybar(v: V) {
  return (
    <div data-role="journeybar" data-plane-ui="1" data-keepclear="24" style={{ position: "absolute", left: 24, top: 22, zIndex: 20, maxWidth: "min(52vw, 520px)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 16px", padding: "9px 16px", border: "1px solid rgba(168,176,173,0.2)", background: "rgba(6,10,11,0.6)", backdropFilter: "blur(3px)" }}>
      <span style={{ width: 18, height: 2, background: v.inJourney.color }} />
      <span className="field-body" style={{ fontStyle: "italic", fontWeight: 300, fontSize: 13.5, color: "var(--field-ink)" }}>{v.inJourney.name}</span>
      <span className="field-label" style={{ fontSize: 9 }}>{v.inJourney.count}</span>
      <span role="button" tabIndex={0} onClick={v.onLeaveJourney} onKeyDown={v.onLeaveJourneyKey} className="field-label field-label-accent field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>the whole field</span>
    </div>
  );
}
