// The forms settings popup (EXP-0020 D5), opened from the HUD's "tune forms" row. Styled like interior/frame.tsx's scroll panel.
import React from "react";
import type { V } from "../types";
import { FORMS_RANGES, FORMS_TOGGLES } from "./settings";

const hair = "1px solid color-mix(in srgb, var(--field-line) 22%, transparent)";
const panel = "color-mix(in srgb, var(--field-bg) 94%, transparent)";
const press: React.CSSProperties = { cursor: "pointer", outline: "none", pointerEvents: "auto" };

export function renderFormsPanel(v: V) {
  const t = v.formsTune;
  return (
    <div data-role="forms-panel" data-plane-ui="1" data-keepclear="30" role="dialog" aria-label="tune forms"
      style={{ position: "absolute", right: 24, top: 150, zIndex: 30, width: 280, padding: "12px 16px 14px", border: hair, background: panel, backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field-label" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
        <span>tune forms</span>
        <span role="button" tabIndex={0} aria-label="close" onClick={v.onFormsPanel} onKeyDown={v.onFormsPanelKey} className="field-hover-accent" style={press}>×</span>
      </div>
      {FORMS_TOGGLES.map(r => (
        <div key={r.k} role="switch" aria-checked={t[r.k]} tabIndex={0} onClick={() => v.onFormsTune({ [r.k]: !t[r.k] })}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); v.onFormsTune({ [r.k]: !t[r.k] }); } }}
          className="field-label field-hover-accent" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8.5, ...press }}>
          {r.label}
          <span className="field-check" data-on={t[r.k] ? "1" : "0"} />
        </div>
      ))}
      {FORMS_RANGES.map(r => {
        const off = !t.sats && r.k !== "float";
        return (
          <label key={r.k} className="field-label" style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 8.5, opacity: off ? 0.4 : 1 }}>
            <span style={{ display: "flex", justifyContent: "space-between" }}><span>{r.label}</span><span>{t[r.k]}</span></span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={t[r.k]} disabled={off} style={{ accentColor: "var(--field-accent)", pointerEvents: "auto" }}
              onChange={e => v.onFormsTune({ [r.k]: Number(e.target.value) })} />
          </label>
        );
      })}
      <span role="button" tabIndex={0} onClick={v.onFormsReset} onKeyDown={v.onFormsResetKey} className="field-label field-hover-accent" style={{ alignSelf: "flex-start", fontSize: 9, ...press }}>reset to defaults</span>
    </div>
  );
}
