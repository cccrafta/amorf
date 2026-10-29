// Interior: the open entity's composition — pieces laid out by interior.ts on a surface larger than the viewport, panned by frame().
import React from "react";
import type { V, Vals, PlateSeg, NoteMark } from "../types";

const frameLine = "1px solid rgba(168,176,173,0.28)";

function plateSvg(segs: PlateSeg[], style: React.CSSProperties) {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={style}>
      {segs.map((s, i) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
    </svg>
  );
}

function renderPiece(p: Vals, v: V) {
  const d = p.data;
  switch (p.kind) {
    case "title":
      return (
        <>
          <div className="field-label" style={{ fontSize: 10 }}>{d.stamp}</div>
          <h1 className="field-title" style={{ margin: "10px 0 0", fontWeight: 400, fontSize: d.fs, lineHeight: 1.08, textWrap: "pretty" }}>{d.title}</h1>
        </>
      );
    case "year":
      return (
        <>
          <div className="field-label" style={{ fontSize: 9 }}>date</div>
          <div className="field-title" style={{ marginTop: 8, fontSize: d.fs, lineHeight: 1.05 }}>{d.year}</div>
        </>
      );
    case "place":
      return (
        <>
          <div className="field-label" style={{ fontSize: 9 }}>place</div>
          <div className="field-title" style={{ margin: "8px 0 14px", fontSize: 22, lineHeight: 1.15 }}>{d.place}</div>
          {/* one Fragment per fact: each pair must land as two direct grid items of the "auto 1fr" grid */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 18px", padding: "12px 0 0", borderTop: "1px solid rgba(168,176,173,0.2)", fontFamily: "var(--font-label), monospace", fontSize: 10, letterSpacing: "0.08em" }}>
            {d.facts.map((f: Vals) => (
              <React.Fragment key={f.k}>
                <div style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(var(--field-mute-rgb), 0.7)" }}>{f.k}</div>
                <div style={{ color: "var(--field-ink-warm)" }}>{f.v}</div>
              </React.Fragment>
            ))}
          </div>
        </>
      );
    case "plate":
      return (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {plateSvg(d.plate, { display: "block", width: "100%", aspectRatio: "300 / 186", border: "1px solid rgba(168,176,173,0.4)", background: "rgba(228,223,210,0.035)" })}
          <figcaption className="field-label" style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 9.5 }}>
            <span>{d.stamp}</span>
            <span role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "var(--field-accent)", transition: "color 400ms ease" }}>lay tracing paper</span>
          </figcaption>
        </figure>
      );
    case "media":
      return (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {d.img ? (
            <div aria-hidden="true" style={{ width: "100%", aspectRatio: "1 / " + d.ar, border: frameLine, backgroundImage: d.imgCss, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1) contrast(1.08)" }} />
          ) : (
            plateSvg(d.plate, { display: "block", width: "100%", aspectRatio: "1 / " + d.ar, border: frameLine, background: "rgba(228,223,210,0.02)" })
          )}
          <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{d.kind}</span>
            <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{d.cap}</span>
          </figcaption>
        </figure>
      );
    case "video":
      // The live element is moved into this slot by syncMedia; React never renders into it.
      return (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", border: frameLine, background: "var(--field-bg)" }}>
            <div data-part="slot" style={{ position: "absolute", inset: 0 }} />
          </div>
          <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{d.kind}</span>
            <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{d.cap}</span>
          </figcaption>
        </figure>
      );
    case "para":
      return <p className="field-body" style={{ margin: 0, fontSize: d.fs, lineHeight: 1.68 }}>{d.t}</p>;
    case "note":
      return (
        <div role="button" tabIndex={0} onMouseEnter={d.enter} onMouseLeave={d.leave} onFocus={d.enter} onBlur={d.leave} onClick={d.open} onKeyDown={d.key} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 7, cursor: "pointer", outline: "none", opacity: d.on ? 1 : 0.72, transition: "opacity 400ms ease" }}>
          {d.sheet && (
            <div style={{ height: 112, border: "1px solid rgba(228,223,210,0.16)", backgroundColor: "rgba(11,16,18,0.9)", backgroundImage: d.imgCss || undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
              <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
                {d.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={d.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.85} />)}
              </svg>
            </div>
          )}
          {d.written && (
            <div className="field-label" style={{ display: "flex", alignItems: "flex-end", height: 40, padding: "0 0 8px", borderBottom: "1px solid rgba(228,223,210,0.16)", fontSize: 8, color: "rgba(var(--field-mute-rgb), 0.55)" }}>written · no sheet</div>
          )}
          <div className="field-body" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{d.short}</div>
          <div className="field-label" style={{ fontSize: 8.5, letterSpacing: "0.16em" }}>{d.by}</div>
        </div>
      );
    case "traces":
      return (
        <>
          <div className="field-label" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, fontSize: 9 }}>
            <span>traces left here</span>
            <span style={{ color: "rgba(110,154,141,0.85)" }}>{v.noteTally}</span>
          </div>
          <div style={{ position: "relative", marginTop: 12, aspectRatio: "3 / 2", border: "1px solid rgba(168,176,173,0.3)", background: "rgba(228,223,210,0.03)" }}>
            {plateSvg(d.plate, { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.42 })}
            {v.layers.map((l: Vals, li: number) => (
              <svg key={li} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: l.op, transition: "opacity 420ms ease" }}>
                {l.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={l.ink} strokeWidth={s.w} strokeLinecap="round" />)}
              </svg>
            ))}
            <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.65)" }}>{v.overlayLabel}</div>
          </div>
        </>
      );
    case "actions":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-hover-bg" style={{ padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--field-accent)", transition: "background 500ms ease" }}>leave a trace of your own</div>
          <div role="button" tabIndex={0} onClick={v.onAside} onKeyDown={v.onAsideKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: v.asideColor, transition: "color 400ms ease" }}>{v.asideLabel}</div>
        </div>
      );
    case "passing":
      return (
        <div role="button" tabIndex={0} onClick={d.go} onKeyDown={d.key} className="field-hover-bg" style={{ padding: "12px 15px", border: "1px solid rgba(110,154,141,0.32)", cursor: "pointer", outline: "none", transition: "background 500ms ease" }}>
          <div className="field-label" style={{ fontSize: 9 }}>someone came through here</div>
          <div className="field-body" style={{ marginTop: 5, fontSize: 14, lineHeight: 1.4 }}>{d.name}</div>
        </div>
      );
    case "assoc":
      return (
        <div role="button" tabIndex={0} onClick={d.go} onKeyDown={d.key} className="field-hover-padleft" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px 12px 0", borderTop: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", transition: "padding-left 500ms cubic-bezier(0.22,1,0.36,1), background 500ms ease" }}>
          <span style={{ flex: "0 0 auto", fontFamily: "var(--font-label), monospace", fontSize: 10, color: "rgba(110,154,141,0.85)" }}>↓</span>
          <span style={{ flex: "1 1 auto", minWidth: 0 }}>
            <span className="field-body" style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--field-mist)" }}>{d.reason}</span>
            <span className="field-title" style={{ display: "block", marginTop: 3, fontSize: 17, lineHeight: 1.2 }}>{d.title}</span>
          </span>
        </div>
      );
    case "elsewhere":
      return (
        <div role="button" tabIndex={0} onClick={v.onElsewhere} onKeyDown={v.onElsewhereKey} className="field-hover-mist" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px", borderTop: "1px solid rgba(168,176,173,0.2)", borderBottom: "1px solid rgba(168,176,173,0.2)", cursor: "pointer", outline: "none", color: "rgba(var(--field-mute-rgb), 0.7)", transition: "color 400ms ease" }}>
          <span style={{ fontFamily: "var(--font-label), monospace", fontSize: 10 }}>⤳</span>
          <span className="field-label" style={{ fontSize: 10 }}>somewhere unrelated</span>
        </div>
      );
    default:
      return null;
  }
}

// interior.ts paint() owns transform/opacity/clip-path on the root, the surface transform and the lift readout,
// found via data-role (interior, comp, liftbar, lifthint); the inline values here are only the hidden baseline.
export function renderInterior(v: V) {
  const it = v.interior;
  return (
    <div data-role="interior" style={{ position: "absolute", inset: 0, zIndex: 30, overflow: "clip", touchAction: "none", userSelect: "none", cursor: "grab", transformOrigin: "0 0", willChange: "transform, opacity, clip-path", background: "rgba(9,13,15,0.96)", opacity: 0, pointerEvents: "none" }}>
      <div data-role="comp" style={{ position: "absolute", left: 0, top: 0, width: it.w, height: it.h, willChange: "transform" }}>
        {it.pieces.map((p: Vals) => (
          <div key={p.key} data-piece={p.key} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, transform: "translate(-50%, -50%)" }}>
            {renderPiece(p, v)}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(130% 120% at 50% 50%, transparent 55%, rgba(6,10,11,0.7) 100%)" }} />
      <div className="field-label" style={{ position: "absolute", top: 15, left: "clamp(18px, 3vw, 42px)", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.6)", pointerEvents: "none" }}>{it.ref}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 18px", borderTop: "1px solid rgba(168,176,173,0.16)", background: "rgba(9,13,15,0.7)", pointerEvents: "none" }}>
        <div data-role="liftbar" style={{ position: "absolute", left: 0, top: -1, height: 1, width: "0%", background: "var(--field-accent)" }} />
        <span data-role="lifthint" className="field-label" style={{ fontSize: 9 }}>pinch in, drag past the edge, or esc to leave</span>
      </div>
    </div>
  );
}
