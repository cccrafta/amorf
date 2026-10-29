// Table overlay: objects set aside and arranged into a set.
import type { V, PlateSeg } from "../types";

export function renderTable(v: V) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 37, background: "var(--field-bg)", display: "flex", flexDirection: "column", animation: "am-in 400ms ease both" }}>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, padding: "20px clamp(20px, 4vw, 56px) 16px", borderBottom: "1px solid rgba(168,176,173,0.18)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span className="field-title" style={{ fontSize: "clamp(22px, 2.4vw, 34px)" }}>The table</span>
          <span className="field-label" style={{ fontSize: 9.5 }}>{v.tableHint}</span>
        </div>
        <div role="button" tabIndex={0} onClick={v.onCloseTable} onKeyDown={v.onCloseTableKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>back to the field</div>
      </div>
      <div data-role="tablesurface" style={{ flex: "1 1 auto", position: "relative", minHeight: 0, margin: "clamp(12px, 2vh, 26px) clamp(20px, 4vw, 56px)", border: "1px solid rgba(168,176,173,0.12)", background: "rgba(228,223,210,0.012)", touchAction: "none", overflow: "hidden" }}>
        {v.tableItems.map((it: any) => (
          <div key={it.id} onPointerDown={it.down} style={{ position: "absolute", left: it.x, top: it.y, width: "clamp(132px, 12vw, 172px)", transform: "translate(-50%, -50%)", cursor: "grab", touchAction: "none", userSelect: "none" }}>
            <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "clamp(88px, 8vw, 114px)", border: "1px solid rgba(168,176,173,0.42)", background: "rgba(228,223,210,0.05)" }}>
              {it.plate.map((s: PlateSeg, si: number) => <path key={si} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
            </svg>
            <div className="field-label" style={{ height: 12, marginTop: 7, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: 8.5, lineHeight: "12px" }}>{it.stamp}</div>
            <div className="field-title" style={{ height: 36, marginTop: 3, overflow: "hidden", fontSize: 15, lineHeight: 1.16 }}>{it.title}</div>
            <div role="button" tabIndex={0} onClick={it.off} onKeyDown={it.offKey} className="field-hover-walk" style={{ height: 11, lineHeight: "11px", marginTop: 6, cursor: "pointer", outline: "none", fontFamily: "var(--font-label), monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--field-mute-rgb), 0.45)", transition: "color 400ms ease" }}>put it back</div>
          </div>
        ))}
        {v.tableEmpty && (
          <div className="field-body" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.6, color: "rgba(201,197,185,0.45)", maxWidth: "46ch", margin: "auto" }}>Nothing has been set aside yet. Walk the field, and set aside anything you want to see next to something else.</div>
        )}
      </div>
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "14px clamp(18px, 3vw, 34px)", padding: "0 clamp(20px, 4vw, 56px) clamp(18px, 3vh, 30px)" }}>
        <input
          value={v.bindName}
          onChange={v.onBindName}
          autoComplete="off"
          spellCheck={false}
          aria-label="name this set"
          placeholder="name this set"
          className="field-input field-body field-focus-border"
          style={{ flex: "1 1 260px", minWidth: 0, borderBottom: "1px solid rgba(228,223,210,0.22)", padding: "7px 2px 9px", fontSize: "clamp(15px, 1.5vw, 19px)", color: "var(--field-ink)" }}
        />
        <div className="field-label" style={{ display: "flex", alignItems: "center", gap: "clamp(18px, 3vw, 30px)", fontSize: 9.5, letterSpacing: "0.22em" }}>
          <div role="button" tabIndex={0} onClick={v.onBind} onKeyDown={v.onBindKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: v.bindColor, transition: "color 400ms ease" }}>bind it</div>
          <div role="button" tabIndex={0} onClick={v.onClearTable} onKeyDown={v.onClearTableKey} className="field-hover-accent" style={{ cursor: "pointer", outline: "none", color: "rgba(var(--field-mute-rgb), 0.55)", transition: "color 400ms ease" }}>clear the table</div>
        </div>
      </div>
    </div>
  );
}
