// Interior frame: the fixed layer over the board — the menu button and its popup, the four neighbour labels and the drawer. It never pans.
import React from "react";
import type { V, NoteMark } from "../types";
import type { Edge, InteriorView } from "./layout";
import { TRACES_ENABLED } from "../notes";
import { key } from "../util";
import { scroll, setScroll, resetScroll, SCROLL_RANGES } from "../scroll";

type Note = InteriorView["notes"][number];

const hair = "1px solid color-mix(in srgb, var(--field-line) 22%, transparent)";
const panel = "color-mix(in srgb, var(--field-bg) 94%, transparent)";
const press: React.CSSProperties = { cursor: "pointer", outline: "none", pointerEvents: "auto" };

// Each edge's label sits at that edge's midpoint inside the safe inset; left and right run vertically so they take no width.
const SPOT: Record<string, React.CSSProperties> = {
  up: { top: 9, left: "50%", transform: "translateX(-50%)", alignItems: "center", textAlign: "center" },
  down: { left: "50%", transform: "translateX(-50%)", alignItems: "center", textAlign: "center" },
  left: { left: 12, top: "50%", transform: "translateY(-50%) rotate(180deg)", writingMode: "vertical-rl", alignItems: "center" },
  right: { right: 12, top: "50%", transform: "translateY(-50%)", writingMode: "vertical-rl", alignItems: "center" },
};
// paint.ts scales these from the midpoint out to the edge's full length as a pull nears COMMIT.
const LINE: Record<string, React.CSSProperties> = {
  up: { top: 0, left: 0, right: 0, height: 1, transform: "scaleX(0)" },
  down: { bottom: 0, left: 0, right: 0, height: 1, transform: "scaleX(0)" },
  left: { left: 0, top: 0, bottom: 0, width: 1, transform: "scaleY(0)" },
  right: { right: 0, top: 0, bottom: 0, width: 1, transform: "scaleY(0)" },
};

// On narrow screens the menu button takes the top row, so the top label drops below it.
function renderEdge(e: Edge, narrow: boolean) {
  const spot = e.dir === "down" ? { ...SPOT.down, bottom: 10 } : e.dir === "up" && narrow ? { ...SPOT.up, top: 34 } : SPOT[e.dir];
  return (
    <React.Fragment key={e.dir}>
      <div data-role={"edgeline-" + e.dir} aria-hidden="true" style={{ position: "absolute", ...LINE[e.dir], transformOrigin: "50% 50%", background: "var(--field-accent)", pointerEvents: "none" }} />
      {/* opacity, translate and pointer-events are paint.ts's; React sets only the hidden baseline */}
      <div data-role={"edge-" + e.dir} data-nodrag="" role="button" tabIndex={e.on ? 0 : -1} aria-label={e.on ? "go to " + e.title : undefined} onClick={e.go} onKeyDown={e.key}
        style={{ position: "absolute", ...spot, display: "flex", flexDirection: "column", gap: 4, maxWidth: 260, opacity: 0, visibility: e.on ? "visible" : "hidden", ...press, transition: "opacity 260ms ease" }}>
        {e.on && (
          <>
            <span className="field-title" style={{ fontSize: 15, lineHeight: 1.15, whiteSpace: "nowrap" }}>
              <span className="field-label" style={{ fontSize: 10, marginInlineEnd: 7 }}>{e.arrow}</span>{e.title}
            </span>
            <span data-role={"edgesub-" + e.dir} data-rest={e.sub} className="field-label" style={{ fontSize: 9, whiteSpace: "nowrap" }}>{e.sub}</span>
          </>
        )}
      </div>
    </React.Fragment>
  );
}

function renderNote(d: Note) {
  return (
    <div key={d.id} role="button" tabIndex={0} onMouseEnter={d.enter} onMouseLeave={d.leave} onFocus={d.enter} onBlur={d.leave} onClick={d.open} onKeyDown={d.key} className="field-hover-opacity" style={{ display: "flex", flexDirection: "column", gap: 7, padding: "14px 0", borderTop: hair, ...press, opacity: d.on ? 1 : 0.78, transition: "opacity 400ms ease" }}>
      {d.sheet && (
        <div style={{ height: 112, border: "1px solid color-mix(in srgb, var(--field-ink) 16%, transparent)", backgroundColor: "color-mix(in srgb, var(--field-bg) 90%, transparent)", backgroundImage: d.imgCss || undefined, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%" }}>
            {d.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={d.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.85} />)}
          </svg>
        </div>
      )}
      {d.written && <div className="field-label" style={{ fontSize: 8, color: "color-mix(in srgb, var(--field-label) 55%, transparent)" }}>written · no sheet</div>}
      <div className="field-body" style={{ fontSize: 13, lineHeight: 1.45 }}>{d.short}</div>
      <div className="field-label" style={{ fontSize: 8.5 }}>{d.by}</div>
    </div>
  );
}

function renderTraces(v: V, it: InteriorView) {
  return (
    <>
      <div style={{ position: "relative", aspectRatio: "3 / 2", border: hair, background: "color-mix(in srgb, var(--field-ink) 3%, transparent)" }}>
        {it.thumbCss && <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: it.thumbCss, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.42 }} />}
        {v.layers.map((l, li) => (
          <svg key={li} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: l.op, transition: "opacity 420ms ease" }}>
            {l.marks.map((s: NoteMark, si: number) => <path key={si} d={s.d} fill="none" stroke={l.ink} strokeWidth={s.w} strokeLinecap="round" />)}
          </svg>
        ))}
        <div className="field-label" style={{ position: "absolute", left: 11, top: 9, fontSize: 8.5 }}>{v.overlayLabel}</div>
      </div>
      <div className="field-label" style={{ display: "flex", justifyContent: "space-between", margin: "16px 0 4px", fontSize: 9 }}>
        <span>traces left here</span><span>{v.noteTally}</span>
      </div>
      {it.notes.map(renderNote)}
    </>
  );
}

function renderRelated(v: V, it: InteriorView) {
  return (
    <>
      {it.passing && (
        <div role="button" tabIndex={0} onClick={it.passing.go} onKeyDown={it.passing.key} className="field-hover-bg" style={{ padding: "12px 15px", marginBottom: 14, border: "1px solid color-mix(in srgb, var(--field-accent) 32%, transparent)", ...press, transition: "background 500ms ease" }}>
          <div className="field-label" style={{ fontSize: 9 }}>someone came through here</div>
          <div className="field-body" style={{ marginTop: 5, fontSize: 14, lineHeight: 1.4 }}>{it.passing.name}</div>
        </div>
      )}
      {it.assoc.map((a, i) => (
        <div key={i} role="button" tabIndex={0} onClick={a.go} onKeyDown={a.key} className="field-hover-padleft" style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "12px 4px 12px 0", borderTop: hair, ...press, transition: "padding-left 500ms cubic-bezier(0.22,1,0.36,1), background 500ms ease" }}>
          <span className="field-label" style={{ flex: "0 0 auto", fontSize: 10 }}>↓</span>
          <span style={{ flex: "1 1 auto", minWidth: 0 }}>
            {a.reason && <span className="field-body" style={{ display: "block", fontSize: 13, lineHeight: 1.4 }}>{a.reason}</span>}
            <span className="field-title" style={{ display: "block", marginTop: 3, fontSize: 17, lineHeight: 1.2 }}>{a.title}</span>
          </span>
        </div>
      ))}
      {!it.passing && !it.assoc.length && <div className="field-body" style={{ fontSize: 13, padding: "4px 0 12px" }}>Nothing is tied to this one yet.</div>}
      <div role="button" tabIndex={0} onClick={v.onElsewhere} onKeyDown={v.onElsewhereKey} className="field-label field-hover-mist" style={{ display: "flex", gap: 12, padding: "12px 4px", borderTop: hair, borderBottom: hair, fontSize: 10, ...press, transition: "color 400ms ease" }}>
        <span>⤳</span><span>somewhere unrelated</span>
      </div>
    </>
  );
}

function renderFacts(it: InteriorView) {
  return (
    <>
      {/* one Fragment per fact: each pair must land as two direct grid items of the "auto 1fr" grid */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 18px", alignItems: "baseline" }}>
        {it.facts.map(f => (
          <React.Fragment key={f.k}>
            <div className="field-label" style={{ fontSize: 9 }}>{f.k}</div>
            <div className="field-body" style={{ fontSize: 14, lineHeight: 1.4 }}>{f.v}</div>
          </React.Fragment>
        ))}
      </div>
      {it.links.length > 0 && (
        <div style={{ marginTop: 22, borderTop: hair }}>
          {it.links.map(l => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="field-label field-hover-mist" style={{ display: "block", padding: "11px 0", borderBottom: hair, fontSize: 9.5, textDecoration: "none", ...press }}>↗ {l.label}</a>
          ))}
        </div>
      )}
    </>
  );
}

// Everything the old footer and header held, except "set it aside" (its own top-right button), lives in one popup behind the top-left button: the drawer tabs, the walk
// control, "somewhere unrelated", "leave a trace" and close. Esc still closes; see escInterior.
function renderMenu(v: V, it: InteriorView) {
  const pick = (fn?: () => void) => () => { it.closeMenu(); fn?.(); };
  const row = (label: React.ReactNode, fn: (() => void) | undefined, color?: string, id?: string) => (
    <span key={id ?? String(label)} role="menuitem" tabIndex={0} onClick={pick(fn)} onKeyDown={key(pick(fn))} className="field-label field-hover-accent"
      style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "11px 0", borderTop: hair, fontSize: 9.5, whiteSpace: "nowrap", color, ...press, transition: "color 400ms ease" }}>{label}</span>
  );
  return (
    <div data-role="menu" data-nodrag="" role="menu" aria-label="entity options"
      style={{ position: "absolute", left: "clamp(12px, 2.4vw, 34px)", top: 44, width: 240, padding: "4px 16px 6px", border: hair, background: panel, backdropFilter: "blur(6px)", cursor: "default", zIndex: 2 }}>
      {it.tabs.map(t => row(<><span>{t.id}</span>{t.n && <span style={{ opacity: 0.7 }}>{t.n}</span>}</>, t.go, t.on ? "var(--field-accent)" : undefined, t.id))}
      {row("⤳ somewhere unrelated", v.onElsewhere, undefined, "elsewhere")}
      {TRACES_ENABLED && row("+ leave a trace", v.onCompose, undefined, "compose")}
      {row("scroll feel", it.onScrollPanel, it.scrollPanel ? "var(--field-accent)" : undefined, "scroll")}
      {row(<><span>close</span><span style={{ opacity: 0.7 }}>esc</span></>, it.onClose, undefined, "close")}
    </div>
  );
}

// Live scroll tuning (../scroll.ts): each slider writes the shared values, which input and physics read per event.
function renderScrollPanel(it: InteriorView) {
  return (
    <div data-role="drawer" data-nodrag="" role="dialog" aria-label="scroll feel"
      style={{ position: "absolute", left: "clamp(12px, 2.4vw, 34px)", top: 44, width: 280, padding: "12px 16px 14px", border: hair, background: panel, backdropFilter: "blur(6px)", cursor: "default", zIndex: 2, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="field-label" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
        <span>scroll feel</span>
        <span role="button" tabIndex={0} aria-label="close" onClick={it.onScrollPanel} onKeyDown={it.onScrollPanelKey} className="field-hover-accent" style={press}>×</span>
      </div>
      {SCROLL_RANGES.map(r => (
        <label key={r.k} className="field-label" style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 8.5 }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}><span>{r.label}</span><span>{scroll[r.k]}</span></span>
          <input type="range" min={r.min} max={r.max} step={r.step} value={scroll[r.k]} style={{ accentColor: "var(--field-accent)", pointerEvents: "auto" }}
            onChange={e => { setScroll({ [r.k]: Number(e.target.value) }); it.rerender(); }} />
        </label>
      ))}
      <span role="button" tabIndex={0} onClick={() => { resetScroll(); it.rerender(); }} onKeyDown={key(() => { resetScroll(); it.rerender(); })} className="field-label field-hover-accent" style={{ alignSelf: "flex-start", fontSize: 9, ...press }}>reset to defaults</span>
    </div>
  );
}

// Order is the Tab order: neighbour labels, then the drawer, then the menu button, "set it aside" and the menu popup.
export function renderFrame(v: V, it: InteriorView) {
  return (
    <>
      {it.edges.map(e => renderEdge(e, it.narrow))}

      {it.drawer && (
        <div data-role="drawer" data-nodrag="" role="dialog" aria-label={it.drawer}
          style={it.narrow
            ? { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%", borderTop: hair, background: panel, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", cursor: "default", padding: "16px 18px 22px" }
            : { position: "absolute", right: 0, top: 0, bottom: 0, width: 380, borderLeft: hair, background: panel, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", cursor: "default", padding: "18px 24px 28px" }}>
          <div className="field-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, fontSize: 9.5 }}>
            <span>{it.drawer === "traces" ? "traces left here" : it.drawer}</span>
            <span role="button" tabIndex={0} aria-label="close drawer" onClick={it.onDrawerClose} onKeyDown={it.onDrawerCloseKey} className="field-hover-accent" style={{ ...press, transition: "color 400ms ease" }}>×</span>
          </div>
          {it.drawer === "facts" && renderFacts(it)}
          {it.drawer === "traces" && renderTraces(v, it)}
          {it.drawer === "related" && renderRelated(v, it)}
        </div>
      )}

      <span data-nodrag="" role="button" tabIndex={0} data-role="menu-btn" aria-haspopup="menu" aria-expanded={it.menu} onClick={it.onMenu} onKeyDown={it.onMenuKey} className="field-label field-hover-accent"
        style={{ position: "absolute", left: "clamp(12px, 2.4vw, 34px)", top: 15, display: "flex", gap: 10, alignItems: "baseline", fontSize: 9.5, color: it.menu ? "var(--field-accent)" : undefined, ...press, transition: "color 400ms ease" }}>
        <span aria-hidden="true">{it.menu ? "×" : "≡"}</span>{it.ref}
      </span>
      {/* top-right, mirroring the menu button; the wide drawer covers it while open. A mouse press does not focus it, so
          Enter and Space stay with the armed edge (input.keyPan yields them to a focused control); Tab still reaches it. */}
      <span data-nodrag="" role="button" tabIndex={0} data-role="aside-btn" onMouseDown={e => e.preventDefault()} onClick={v.onAside} onKeyDown={v.onAsideKey} className="field-label field-hover-accent"
        style={{ position: "absolute", right: "clamp(12px, 2.4vw, 34px)", top: 15, fontSize: 9.5, whiteSpace: "nowrap", color: v.asideColor, ...press, transition: "color 400ms ease" }}>{v.asideLabel}</span>
      {it.menu && renderMenu(v, it)}
      {it.scrollPanel && !it.menu && renderScrollPanel(it)}
    </>
  );
}
