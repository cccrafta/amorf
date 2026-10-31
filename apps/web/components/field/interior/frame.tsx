// Interior frame: the fixed layer over the board — header, the four neighbour labels, the tools bar and the drawer. It never pans.
import React from "react";
import type { V, NoteMark } from "../types";
import type { Edge, InteriorView } from "./layout";

type Note = InteriorView["notes"][number];

const hair = "1px solid color-mix(in srgb, var(--field-line) 22%, transparent)";
const panel = "color-mix(in srgb, var(--field-bg) 94%, transparent)";
const press: React.CSSProperties = { cursor: "pointer", outline: "none", pointerEvents: "auto" };
const BAR = { wide: 44, narrow: 84 };

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

// On narrow screens the header row is too short to share, so the top label drops below it.
function renderEdge(e: Edge, bar: number, narrow: boolean) {
  const spot = e.dir === "down" ? { ...SPOT.down, bottom: bar + 8 } : e.dir === "up" && narrow ? { ...SPOT.up, top: 34 } : SPOT[e.dir];
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

// Order is the Tab order the design asks for: neighbour labels, then the bar, then the drawer, then the header.
export function renderFrame(v: V, it: InteriorView) {
  const bar = it.narrow ? BAR.narrow : BAR.wide;
  const aside = (
    <span role="button" tabIndex={0} onClick={v.onAside} onKeyDown={v.onAsideKey} className="field-label field-hover-accent" style={{ fontSize: 9.5, color: v.asideColor, whiteSpace: "nowrap", ...press, transition: "color 400ms ease" }}>{v.asideLabel}</span>
  );
  const elsewhere = (
    <span role="button" tabIndex={0} onClick={v.onElsewhere} onKeyDown={v.onElsewhereKey} className="field-label field-hover-mist" style={{ fontSize: 9.5, whiteSpace: "nowrap", ...press, transition: "color 400ms ease" }}>⤳ somewhere unrelated</span>
  );
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 64, pointerEvents: "none", background: "linear-gradient(" + panel + ", transparent)" }} />
      {it.edges.map(e => renderEdge(e, bar, it.narrow))}

      <div data-nodrag="" style={{ position: "absolute", left: 0, right: 0, bottom: 0, minHeight: bar, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px 22px", padding: it.narrow ? "10px 16px" : "0 clamp(18px, 3vw, 42px)", borderTop: hair, background: panel, cursor: "default" }}>
        <div role="tablist" style={{ display: "flex", gap: 22 }}>
          {it.tabs.map(t => (
            <span key={t.id} role="tab" aria-selected={t.on} tabIndex={0} onClick={t.go} onKeyDown={t.key} className="field-label field-hover-accent"
              style={{ fontSize: 9.5, paddingBottom: 3, borderBottom: "1px solid " + (t.on ? "var(--field-accent)" : "transparent"), whiteSpace: "nowrap", ...press, transition: "color 400ms ease, border-color 400ms ease" }}>
              {t.id}{t.n && <span style={{ marginInlineStart: 7, opacity: 0.7 }}>{t.n}</span>}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, flex: it.narrow ? "1 1 100%" : "0 0 auto" }}>
          <span role="button" tabIndex={0} onClick={v.onCompose} onKeyDown={v.onComposeKey} className="field-label field-hover-bg"
            style={{ padding: "7px 12px", border: "1px solid color-mix(in srgb, var(--field-accent) 40%, transparent)", fontSize: 9.5, whiteSpace: "nowrap", textAlign: "center", flex: it.narrow ? "1 1 auto" : undefined, ...press, transition: "background 500ms ease" }}>+ leave a trace</span>
          {!it.narrow && aside}
          {!it.narrow && elsewhere}
        </div>
      </div>

      {it.drawer && (
        <div data-role="drawer" data-nodrag="" role="dialog" aria-label={it.drawer}
          style={it.narrow
            ? { position: "absolute", left: 0, right: 0, bottom: bar, height: "70%", borderTop: hair, background: panel, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", cursor: "default", padding: "16px 18px 22px" }
            : { position: "absolute", right: 0, top: 56, bottom: bar, width: 380, borderLeft: hair, background: panel, overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", cursor: "default", padding: "18px 24px 28px" }}>
          <div className="field-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18, fontSize: 9.5 }}>
            <span>{it.drawer === "traces" ? "traces left here" : it.drawer}</span>
            <span role="button" tabIndex={0} aria-label="close drawer" onClick={it.onDrawerClose} onKeyDown={it.onDrawerCloseKey} className="field-hover-accent" style={{ ...press, transition: "color 400ms ease" }}>×</span>
          </div>
          {it.drawer === "facts" && renderFacts(it)}
          {it.drawer === "traces" && renderTraces(v, it)}
          {it.drawer === "related" && renderRelated(v, it)}
          {it.narrow && <div style={{ display: "flex", justifyContent: "space-between", gap: 18, marginTop: 24, paddingTop: 14, borderTop: hair }}>{aside}{elsewhere}</div>}
        </div>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 56, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "15px clamp(18px, 3vw, 42px) 0", pointerEvents: "none" }}>
        <span className="field-label" style={{ fontSize: 9.5 }}>{it.ref}</span>
        <span data-nodrag="" role="button" tabIndex={0} onClick={it.onClose} onKeyDown={it.onCloseKey} className="field-label field-hover-accent" style={{ fontSize: 9.5, ...press, transition: "color 400ms ease" }}>
          {it.narrow ? "×" : "close · esc ×"}
        </span>
      </div>
    </>
  );
}
