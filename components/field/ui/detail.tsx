// Detail panel: the open object's page.
import React from "react";
import { rendererFor } from "@/lib/media/registry";
import type { V, PlateSeg, NoteMark } from "../types";

export function renderDetail(v: V) {
  const d = v.detail;
  return (
    <div data-role="detail" style={{ position: "absolute", inset: 0, zIndex: 30, padding: "clamp(12px, 2vh, 28px) clamp(12px, 2vw, 32px)", perspective: 1600, perspectiveOrigin: "50% 70%" }}>
      {/* transform/opacity below are frame()'s pre-animation baseline — it queries this
          node via [data-role="page"] every rAF and overwrites both once the panel opens. */}
      <div data-role="page" style={{ position: "relative", width: "100%", height: "100%", maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", background: "rgba(9,13,15,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(168,176,173,0.24)", boxShadow: "0 60px 160px rgba(3,6,7,0.82)", overflow: "hidden", transformOrigin: "50% 100%", willChange: "transform, opacity", transform: "translateY(16%) rotateX(-11deg) scale(0.94)", opacity: 0 }}>
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "15px clamp(18px, 3vw, 42px)", borderBottom: "1px solid rgba(168,176,173,0.16)" }}>
          <div role="button" tabIndex={0} onClick={v.onClose} onKeyDown={v.onCloseKey} className="field-label field-hover-split" style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", outline: "none", fontSize: 10, color: "rgba(var(--field-mute-rgb), 0.85)", transition: "color 400ms ease" }}>
            <span>←</span>
            <span>put it back</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(14px, 2vw, 26px)" }}>
            <div role="button" tabIndex={0} onClick={v.onAside} onKeyDown={v.onAsideKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: v.asideColor, transition: "color 400ms ease" }}>{v.asideLabel}</div>
            <div className="field-label" style={{ fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.6)" }}>{d.ref}</div>
          </div>
        </div>

        <div data-role="pagescroll" style={{ flex: "1 1 auto", overflowY: "auto", overscrollBehavior: "contain" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(26px, 3.4vw, 64px)", padding: "clamp(24px, 4vh, 52px) clamp(18px, 3vw, 42px) clamp(40px, 6vh, 72px)", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 30, minWidth: 0 }}>
              <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(220px, 34vh, 380px)", border: "1px solid rgba(168,176,173,0.4)", background: "rgba(228,223,210,0.035)" }}>
                  {d.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                </svg>
                <figcaption className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 9.5 }}>
                  <span>{d.stamp}</span>
                  <span role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "var(--field-accent)", transition: "color 400ms ease" }}>lay tracing paper</span>
                </figcaption>
              </figure>
              {d.media.filter((m: { kind: string }) => !rendererFor(m.kind)).map((m: any, i: number) => (
                <figure key={i} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                  {m.img ? (
                    <div aria-hidden="true" style={{ width: "100%", height: "clamp(150px, 22vh, 250px)", border: "1px solid rgba(168,176,173,0.28)", backgroundImage: m.imgCss, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1) contrast(1.08)" }} />
                  ) : (
                    <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(150px, 22vh, 250px)", border: "1px solid rgba(168,176,173,0.28)", background: "rgba(228,223,210,0.02)" }}>
                      {m.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                    </svg>
                  )}
                  <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{m.kind}</span>
                    <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{m.cap}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div className="field-label" style={{ fontSize: 10 }}>{d.stamp}</div>
              <h1 className="field-title" style={{ margin: "10px 0 22px", fontWeight: 400, fontSize: "clamp(32px, 3.6vw, 54px)", lineHeight: 1.05, textWrap: "pretty" }}>{d.title}</h1>

              {/* one Fragment per fact — a wrapping div would break the parent's
                  2-column "auto 1fr" grid, since each child pair must land as two
                  direct grid items, not one nested box. */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 20px", padding: "14px 0 18px", borderTop: "1px solid rgba(168,176,173,0.2)", borderBottom: "1px solid rgba(168,176,173,0.2)", fontFamily: "var(--font-label), monospace", fontSize: 10, letterSpacing: "0.08em" }}>
                {d.facts.map((f: any) => (
                  <React.Fragment key={f.k}>
                    <div style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(var(--field-mute-rgb), 0.7)" }}>{f.k}</div>
                    <div style={{ color: "var(--field-ink-warm)" }}>{f.v}</div>
                  </React.Fragment>
                ))}
              </div>

              {d.paras.map((p: any, i: number) => (
                <p key={i} className="field-body" style={{ margin: "20px 0 0", fontSize: "clamp(15px, 1.1vw, 17px)", lineHeight: 1.68, maxWidth: "60ch" }}>{p.t}</p>
              ))}

              <div className="field-label" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginTop: 34, fontSize: 9 }}>
                <span>traces left here</span>
                <span style={{ color: "rgba(110,154,141,0.85)" }}>{v.noteTally}</span>
              </div>
              <div style={{ position: "relative", marginTop: 12, aspectRatio: "3 / 2", border: "1px solid rgba(168,176,173,0.3)", background: "rgba(228,223,210,0.03)" }}>
                <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.42 }}>
                  {d.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
                </svg>
                {v.layers.map((l: any, li: number) => (
                  <svg key={li} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: l.op, transition: "opacity 420ms ease" }}>
                    {l.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={l.ink} strokeWidth={s.w} strokeLinecap="round" />)}
                  </svg>
                ))}
                <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.65)" }}>{v.overlayLabel}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 1, marginTop: 1, background: "rgba(168,176,173,0.16)" }}>
                {v.hands.map((h: any, hi: number) => (
                  <div key={hi} role="button" tabIndex={0} onMouseEnter={h.enter} onMouseLeave={h.leave} onFocus={h.enter} onBlur={h.leave} onClick={h.open} onKeyDown={h.key} style={{ padding: "12px 13px 13px", background: h.bg, cursor: "pointer", outline: "none", transition: "background 400ms ease" }}>
                    <div className="field-label" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, color: h.byColor }}>
                      <span style={{ width: 7, height: 7, background: h.ink, opacity: h.dot }} />
                      <span>{h.by}</span>
                    </div>
                    <div className="field-body" style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.45, color: h.txtColor, transition: "color 400ms ease" }}>{h.short}</div>
                  </div>
                ))}
              </div>

              <div role="button" tabIndex={0} onClick={v.onNotesToggle} onKeyDown={v.onNotesToggleKey} className="field-label field-label-accent field-hover-accent" style={{ marginTop: 12, cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>{v.gridHint}</div>

              {v.notesOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: "16px 14px", marginTop: 14, animation: "am-in 300ms ease both" }}>
                  {v.notesHere.map((nn: any, ni: number) => (
                    <div key={ni} role="button" tabIndex={0} onClick={nn.open} onKeyDown={nn.key} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 7, cursor: "pointer", outline: "none", opacity: 0.72, transition: "opacity 400ms ease" }}>
                      {nn.sheet && (
                        <div style={{ height: 98, border: "1px solid rgba(228,223,210,0.16)", backgroundColor: "rgba(11,16,18,0.9)", backgroundImage: nn.imgCss || undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
                          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                            {nn.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={nn.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.85} />)}
                          </svg>
                        </div>
                      )}
                      {nn.written && (
                        <div className="field-label" style={{ display: "flex", alignItems: "flex-end", height: 98, padding: "0 0 8px", borderBottom: "1px solid rgba(228,223,210,0.16)", fontSize: 8, color: "rgba(var(--field-mute-rgb), 0.55)" }}>written · no sheet</div>
                      )}
                      <div className="field-body" style={{ fontSize: 12, lineHeight: 1.4 }}>{nn.short}</div>
                      <div className="field-label" style={{ fontSize: 8.5, letterSpacing: "0.16em" }}>{nn.by}</div>
                    </div>
                  ))}
                </div>
              )}

              <div role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-bg" style={{ marginTop: 14, padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--field-accent)", transition: "background 500ms ease" }}>leave a trace of your own</div>

              {v.passing && (
                <div role="button" tabIndex={0} onClick={v.onFollowPassing} onKeyDown={v.onFollowPassingKey} className="field-hover-bg" style={{ marginTop: 26, padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", transition: "background 500ms ease" }}>
                  <div className="field-label" style={{ fontSize: 9 }}>someone came through here</div>
                  <div className="field-body" style={{ marginTop: 5, fontSize: 14, lineHeight: 1.4 }}>{v.passing}</div>
                </div>
              )}

              <div className="field-label" style={{ marginTop: 34, fontSize: 9 }}>leads elsewhere</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                {v.assocs.map((a: any, ai: number) => (
                  <div key={ai} role="button" tabIndex={0} onClick={a.go} onKeyDown={a.key} className="field-hover-padleft" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px 12px 0", borderTop: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", transition: "padding-left 500ms cubic-bezier(0.22,1,0.36,1), background 500ms ease" }}>
                    <span style={{ flex: "0 0 auto", fontFamily: "var(--font-label), monospace", fontSize: 10, color: "rgba(110,154,141,0.85)" }}>↓</span>
                    <span style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <span className="field-body" style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--field-mist)" }}>{a.reason}</span>
                      <span className="field-title" style={{ display: "block", marginTop: 3, fontSize: 17, lineHeight: 1.2 }}>{a.title}</span>
                    </span>
                  </div>
                ))}
                <div role="button" tabIndex={0} onClick={v.onElsewhere} onKeyDown={v.onElsewhereKey} className="field-hover-mist" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px", borderTop: "1px solid rgba(168,176,173,0.2)", borderBottom: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", color: "rgba(var(--field-mute-rgb), 0.7)", transition: "color 400ms ease" }}>
                  <span style={{ fontFamily: "var(--font-label), monospace", fontSize: 10 }}>⤳</span>
                  <span className="field-label" style={{ fontSize: 10 }}>somewhere unrelated</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: "0 0 auto", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "11px 18px", borderTop: "1px solid rgba(168,176,173,0.16)" }}>
          <div data-role="liftbar" style={{ position: "absolute", left: 0, top: -1, height: 1, width: "0%", background: "var(--field-accent)" }} />
          <span data-role="lifthint" className="field-label" style={{ fontSize: 9 }}>scroll sideways to put it back</span>
        </div>
      </div>
    </div>
  );
}
