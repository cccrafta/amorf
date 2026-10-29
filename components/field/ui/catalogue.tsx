// Catalogue (the index) overlay.
import type { V, PlateSeg } from "../types";

export function renderCatalogue(v: V) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 38, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)" }}>The index</span>
          <span className="field-label" style={{ fontSize: 9.5 }}>{v.journeyTally}</span>
        </div>
        <div role="button" tabIndex={0} onClick={v.onCloseCatalogue} onKeyDown={v.onCloseCatalogueKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>back to the field</div>
      </div>
      <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "clamp(24px, 4vh, 46px) clamp(20px, 4vw, 56px) 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: "clamp(30px, 4vw, 58px) clamp(24px, 3vw, 44px)" }}>
          {v.journeys.map((j: any, ji: number) => (
            <div key={j.name + ji} role="button" tabIndex={0} onClick={j.enter} onKeyDown={j.key} onMouseEnter={j.enter_hover} onMouseLeave={j.leave_hover} onFocus={j.enter_hover} onBlur={j.leave_hover} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", outline: "none", opacity: 0.82, transition: "opacity 420ms ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, perspective: 1500, perspectiveOrigin: "50% 50%", borderBottom: "1px solid rgba(168,176,173,0.14)" }}>
                <div style={{ position: "relative", width: "100%", height: 240, transformStyle: "preserve-3d" }}>
                  {j.pages.map((pg: any, pi: number) => (
                    <div key={pi} style={{ position: "absolute", left: "50%", top: "50%", width: 250, height: 172, margin: "-86px 0 0 -125px", transform: `translate3d(${pg.x}, ${pg.y}, 0) rotateY(-62deg)`, transformOrigin: "50% 50%", border: "1px solid rgba(228,223,210,0.2)", background: "var(--field-bg-mid)", opacity: pg.op, transition: "opacity 420ms ease" }}>
                      <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                        {pg.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                      </svg>
                    </div>
                  ))}
                  <div style={{ position: "absolute", left: "50%", top: "50%", width: 250, height: 172, margin: "-86px 0 0 -125px", transform: `translate3d(${j.spineX}, ${j.spineY}, 0) rotateY(-62deg)`, transformOrigin: "50% 50%", background: j.color, opacity: j.spineOp, transition: "opacity 420ms ease" }} />
                  <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ position: "absolute", inset: -14, width: "calc(100% + 28px)", height: "calc(100% + 28px)", pointerEvents: "none", overflow: "visible" }}>
                    <path d={j.route} pathLength={1} fill="none" stroke={j.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" style={{ strokeDashoffset: j.routeOff, opacity: j.routeOp, transition: "stroke-dashoffset 1500ms cubic-bezier(0.22,1,0.36,1), opacity 500ms ease" }} />
                    <path d={j.routeNodes} fill="none" stroke={j.color} strokeWidth={1.7} strokeLinecap="round" style={{ opacity: j.nodeOp, transition: "opacity 700ms ease 500ms" }} />
                  </svg>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="field-body" style={{ fontSize: 14.5, lineHeight: 1.4, color: "var(--field-ink)" }}>{j.name}</div>
                <div className="field-label" style={{ fontSize: 9 }}>{j.meta}</div>
                <div style={{ fontFamily: "var(--font-label), monospace", fontSize: 9, letterSpacing: "0.1em", color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.span}</div>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px 18px", marginTop: 5, fontFamily: "var(--font-label), monospace", fontSize: 8.5, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  <span style={{ color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.kind}</span>
                  <span role="button" tabIndex={0} onClick={j.keep} onKeyDown={j.keepKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: j.keptColor, transition: "color 400ms ease" }}>{j.keptLabel}</span>
                  {j.isTable && (
                    <span role="button" tabIndex={0} onClick={j.flat} onKeyDown={j.flatKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "rgba(110,154,141,0.8)", transition: "color 400ms ease" }}>{j.flatLabel}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
