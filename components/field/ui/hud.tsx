// HUD: the instruments, jump readout, focus bar, hint line and the others list.
import type { V } from "../types";

export function renderHud(v: V) {
  return (
    <div data-role="hud" data-plane-ui="1" data-keepclear="34" style={{ position: "absolute", right: 24, top: 22, zIndex: 20, display: "flex", alignItems: "flex-start", gap: 14, willChange: "transform" }}>
      <div className="field-label" style={{ pointerEvents: "none", textAlign: "right", lineHeight: 1.9 }}>
        <div data-role="hud-depth">DEPTH 00000</div>
        <div data-role="hud-yaw">BEARING 000</div>
        <div data-role="hud-grid" className="field-label-dim">E0000 N0000</div>
        <div className="field-label-dim">WALK {v.traceCount}</div>
        <div className="field-label-accent">TRACES {v.noteCount}</div>
      </div>
      <div role="button" tabIndex={0} onClick={v.onCatalogue} onKeyDown={v.onCatalogueKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, transition: "color 400ms ease" }}>THE INDEX</div>
      <div role="button" tabIndex={0} onClick={v.onPlan} onKeyDown={v.onPlanKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, transition: "color 400ms ease" }}>PLAN</div>
      <div role="button" tabIndex={0} onClick={v.onTable} onKeyDown={v.onTableKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, color: v.tableColor, transition: "color 400ms ease" }}>{v.tableLabel}</div>
      <div role="button" tabIndex={0} onClick={v.onTracks} onKeyDown={v.onTracksKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", lineHeight: 1.9, color: v.tracksColor, transition: "color 400ms ease" }}>{v.tracksLabel}</div>
      {v.askOpen && (
        <form onSubmit={v.onSubmit} style={{ animation: "am-in 400ms ease both" }}>
          <input
            data-role="ask"
            value={v.query}
            onChange={v.onQueryChange}
            onBlur={v.onAskBlur}
            autoComplete="off"
            spellCheck={false}
            aria-label="ask"
            placeholder="ask"
            className="field-input"
            style={{ width: "clamp(150px, 20vw, 240px)", borderBottom: "1px solid rgba(110,154,141,0.7)", padding: "2px 2px 6px", fontFamily: "var(--font-display), Didot, serif", fontSize: 16, letterSpacing: "0.04em" }}
          />
        </form>
      )}
      {v.askShut && (
        <div
          role="button"
          tabIndex={0}
          aria-label="ask"
          onClick={v.onAskOpen}
          onKeyDown={v.onAskOpenKey}
          className="field-hover-mist"
          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-label), monospace", fontSize: 13, color: "rgba(var(--field-mute-rgb), 0.75)", cursor: "pointer", outline: "none", transition: "color 400ms ease" }}
        >
          ⌕
        </div>
      )}
    </div>
  );
}

export function renderJump(v: V) {
  return (
    <div data-role="jump" data-plane-ui="1" data-keepclear="20" style={{ position: "absolute", right: 24, top: 112, zIndex: 20, pointerEvents: "none", textAlign: "right", willChange: "transform, opacity" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, padding: "9px 12px 9px 0", borderRight: "1px solid rgba(110,154,141,0.45)", animation: "am-in 700ms ease both" }}>
        <div className="field-label field-label-dim" style={{ fontSize: 9, letterSpacing: "0.2em" }}>{v.jump.span}</div>
        <div className="field-label field-label-accent" style={{ fontSize: 11, letterSpacing: "0.14em" }}>{v.jump.years}</div>
        <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(var(--field-mute-rgb), 0.55)" }}>{v.jump.paces}</div>
      </div>
    </div>
  );
}

export function renderFocusbar(v: V) {
  return (
    <div data-role="focusbar" data-plane-ui="1" data-keepclear="22" style={{ position: "absolute", left: "50%", bottom: 30, transform: "translateX(-50%)", zIndex: 19, willChange: "transform, opacity" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "8px 14px", border: "1px solid rgba(110,154,141,0.32)", background: "rgba(6,10,11,0.42)", backdropFilter: "blur(3px)", animation: "am-in 350ms ease both" }}>
        <span className="field-label" style={{ fontSize: 9 }}>{v.focus.stamp}</span>
        <span className="field-title" style={{ fontSize: 17 }}>{v.focus.title}</span>
        <span className="field-label field-label-accent" style={{ fontSize: 9 }}>{v.openAction}</span>
        <span role="button" tabIndex={0} onClick={v.onFocusAside} onKeyDown={v.onFocusAsideKey} className="field-label field-hover-mist" style={{ cursor: "pointer", outline: "none", fontSize: 9, transition: "color 400ms ease" }}>{v.focusAside}</span>
      </div>
    </div>
  );
}

// layout() overwrites textContent here only when it differs from what it wants to set,
// so the initial string must match verbatim or it silently never gets corrected on mount.
export function renderHint() {
  return (
    <div data-role="hint" data-plane-ui="1" className="field-label" style={{ position: "absolute", left: 0, right: 0, bottom: 8, zIndex: 18, pointerEvents: "none", textAlign: "center", fontSize: 9.5, letterSpacing: "0.22em", color: "rgba(var(--field-mute-rgb), 0.5)" }}>
      scroll to move · drag or sideways to turn · click or enter to open
    </div>
  );
}

export function renderOthers(v: V) {
  return (
    <div data-role="others" data-plane-ui="1" data-keepclear="44" style={{ position: "absolute", right: 24, bottom: 26, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7, maxWidth: "min(34vw, 280px)", padding: "14px 16px", background: "rgba(6,10,11,0.9)", willChange: "opacity" }}>
      <div className="field-label" style={{ fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.55)" }}>others</div>
      {v.seeded.map((t: any) => (
        <div key={t.name} role="button" tabIndex={0} onClick={t.join} onKeyDown={t.key} className="field-body field-hover-split" style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "right", fontSize: 12.5, lineHeight: 1.35, color: "rgba(228,223,210,0.4)", cursor: "pointer", outline: "none", transition: "color 400ms ease" }}>
          <span style={{ flex: "0 0 auto", width: 16, height: 1, background: t.color, opacity: t.swatch }} />
          <span>{t.name}</span>
          <span className="field-label" style={{ flex: "0 0 auto", fontSize: 8, color: "rgba(110,154,141,0.8)" }}>{t.mark}</span>
        </div>
      ))}
    </div>
  );
}
