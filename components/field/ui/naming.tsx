// Naming overlay: naming a walk before letting it go.
import type { V } from "../types";

export function renderNaming(v: V) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(6,10,11,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, animation: "am-in 600ms ease both" }}>
      <form onSubmit={v.onCommitName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "min(560px, 100%)" }}>
        <div className="field-label" style={{ fontSize: 9, letterSpacing: "0.28em", color: "var(--field-mist)" }}>{v.nameStamp}</div>
        <input
          value={v.nameValue}
          onChange={v.onNameChange}
          autoComplete="off"
          aria-label="name this trace"
          className="field-input field-body field-focus-border"
          style={{ width: "100%", borderBottom: "1px solid rgba(228,223,210,0.28)", padding: "8px 2px 10px", textAlign: "center", fontSize: "clamp(17px, 2vw, 26px)", color: "var(--field-ink)" }}
        />
        <div className="field-label" style={{ display: "flex", gap: 26, fontSize: 10, letterSpacing: "0.24em" }}>
          <div role="button" tabIndex={0} onClick={v.onCommitName} onKeyDown={v.onCommitNameKey} className="field-hover-accent" style={{ color: "var(--field-accent)", cursor: "pointer", outline: "none" }}>let it go</div>
          <div role="button" tabIndex={0} onClick={v.onCancelName} onKeyDown={v.onCancelNameKey} className="field-hover-accent" style={{ color: "rgba(var(--field-mute-rgb), 0.6)", cursor: "pointer", outline: "none" }}>keep walking</div>
        </div>
      </form>
    </div>
  );
}
