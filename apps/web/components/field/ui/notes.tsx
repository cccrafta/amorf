// Trace overlays: reading one trace, and composing a new one on tracing paper.
import type { V, PlateSeg, NoteMark, Shown } from "../types";

export function renderView(v: V, view: Shown<"view">) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 44, background: "color-mix(in srgb, var(--field-bg-dark) 95%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 3vh, 40px)", animation: "am-in 400ms ease both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "clamp(22px, 3.4vw, 52px)", alignItems: "center", width: "min(1120px, 100%)", maxHeight: "100%", overflowY: "auto" }}>
        <div style={{ position: "relative", aspectRatio: "3 / 2", border: "1px solid color-mix(in srgb, var(--field-line) 28%, transparent)" }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}>
            {view.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
          </svg>
          {view.img && (
            <div role="img" aria-label="an uploaded sketch" style={{ position: "absolute", inset: 0, backgroundImage: view.imgCss ?? undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
          )}
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {view.marks.map((s: NoteMark, i: number) => <path key={i} d={s.d} fill="none" stroke={view.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.9} />)}
          </svg>
          <div className="field-label" style={{ position: "absolute", left: 10, bottom: 8, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.65)" }}>{view.stamp}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.04em" }}>a trace laid over</div>
          <div className="field-title" style={{ fontSize: "clamp(24px, 2.6vw, 38px)", lineHeight: 1.08, textWrap: "pretty" }}>{view.title}</div>
          <div className="field-body" style={{ marginTop: 6, fontSize: "clamp(16px, 1.4vw, 20px)", lineHeight: 1.55, maxWidth: "46ch" }}>{view.txt}</div>
          <div className="field-label" style={{ fontSize: 9 }}>{view.by}</div>
          {view.walk && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10, paddingLeft: 13, borderLeft: "1px solid color-mix(in srgb, var(--field-accent) 40%, transparent)" }}>
              <div className="field-label" style={{ fontSize: 9, lineHeight: 1.6, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{view.walk}</div>
              {v.journey.map((j, ji) => (
                <div key={ji} role="button" tabIndex={0} onClick={j.go} onKeyDown={j.key} className="field-hover-accent" style={{ display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer", outline: "none", fontFamily: "var(--font-label)", fontSize: 9.5, letterSpacing: "0.08em", color: j.color, transition: "color 400ms ease" }}>
                  <span style={{ flex: "0 0 auto", color: "rgba(var(--field-mute-rgb), 0.5)" }}>{j.n}</span>
                  <span style={{ flex: "1 1 auto", minWidth: 0 }}>{j.title}</span>
                  <span style={{ flex: "0 0 auto", color: "color-mix(in srgb, var(--field-accent) 80%, transparent)" }}>{j.here}</span>
                </div>
              ))}
            </div>
          )}
          <div className="field-label" style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 16, fontSize: 10, letterSpacing: "0.04em" }}>
            {v.viewFollow && (
              <div role="button" tabIndex={0} onClick={v.onFollowTrace} onKeyDown={v.onFollowTraceKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>{v.viewFollow}</div>
            )}
            <div role="button" tabIndex={0} onClick={v.onCloseNote} onKeyDown={v.onCloseNoteKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.65)", cursor: "pointer", outline: "none" }}>put it back</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderCompose(v: V, c: Shown<"compose">) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "color-mix(in srgb, var(--field-bg-dark) 97%, transparent)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "15px clamp(18px, 3vw, 42px)", borderBottom: "1px solid color-mix(in srgb, var(--field-line) 16%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, minWidth: 0 }}>
          <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9.5, letterSpacing: "0.04em", color: "var(--field-accent)" }}>tracing paper</span>
          <span className="field-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 17 }}>{c.title}</span>
        </div>
        <div role="button" tabIndex={0} onClick={v.onDiscard} onKeyDown={v.onDiscardKey} className="field-label field-hover-accent" style={{ flex: "0 0 auto", cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.75)", transition: "color 400ms ease" }}>lift the paper off</div>
      </div>
      <div style={{ flex: "1 1 auto", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "clamp(16px, 3vh, 32px) clamp(16px, 3vw, 40px) 34px" }}>
        <div style={{ position: "relative", width: "min(840px, 92vw, 93vh)", aspectRatio: "3 / 2", border: "1px solid color-mix(in srgb, var(--field-line) 30%, transparent)" }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }}>
            {c.plate.map((s: PlateSeg, i: number) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
          </svg>
          <div style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--field-ink) 4%, transparent)", pointerEvents: "none" }} />
          {c.img && (
            <div role="img" aria-label="an uploaded sketch" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: c.imgCss ?? undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
          )}
          {/* bindPaper() owns width/height attrs on this canvas for DPR-correct drawing —
              JSX only sets CSS size, never the element's width/height attributes. */}
          <canvas data-role="paper" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair" }} />
          <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5, color: "rgba(var(--field-mute-rgb), 0.6)" }}>draw straight onto the sheet</div>
        </div>
        <div className="field-label" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 26, fontSize: 9.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div role="button" tabIndex={0} onClick={v.onFine} onKeyDown={v.onFineKey} style={{ cursor: "pointer", outline: "none", color: c.fine }}>fine</div>
            <div role="button" tabIndex={0} onClick={v.onMedium} onKeyDown={v.onMediumKey} style={{ cursor: "pointer", outline: "none", color: c.medium }}>medium</div>
            <div role="button" tabIndex={0} onClick={v.onBroad} onKeyDown={v.onBroadKey} style={{ cursor: "pointer", outline: "none", color: c.broad }}>broad</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 15, color: "rgba(var(--field-mute-rgb), 0.75)" }}>
            <div role="button" tabIndex={0} onClick={v.onUndo} onKeyDown={v.onUndoKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none" }}>undo</div>
            <div role="button" tabIndex={0} onClick={v.onClearPaper} onKeyDown={v.onClearPaperKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none" }}>clear</div>
            <label className="field-hover-accent" style={{ position: "relative", cursor: "pointer" }}>
              {c.uploadLabel}
              <input type="file" accept="image/*" onChange={v.onUpload} style={{ position: "absolute", left: 0, top: 0, width: 1, height: 1, opacity: 0 }} />
            </label>
          </div>
        </div>
        <input
          value={v.noteTxt}
          onChange={v.onNoteTxt}
          autoComplete="off"
          spellCheck={false}
          aria-label="what it did to your perception"
          placeholder="what it did to your perception"
          className="field-input field-body field-focus-border"
          style={{ width: "min(680px, 92vw)", borderBottom: "1px solid color-mix(in srgb, var(--field-ink) 22%, transparent)", padding: "8px 2px 10px", textAlign: "center", fontSize: "clamp(15px, 1.6vw, 20px)", color: "var(--field-ink)" }}
        />
        <div className="field-label" style={{ display: "flex", gap: 28, fontSize: 10, letterSpacing: "0.04em" }}>
          <div role="button" tabIndex={0} onClick={v.onCommitNote} onKeyDown={v.onCommitNoteKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>leave it here</div>
          <div role="button" tabIndex={0} onClick={v.onDiscard} onKeyDown={v.onDiscardKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.6)", cursor: "pointer", outline: "none" }}>discard</div>
        </div>
      </div>
    </div>
  );
}
