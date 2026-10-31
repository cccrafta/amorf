// Interior view: the open entity's board — pieces placed by placement.ts on a surface larger than the viewport, panned by paint() — under the fixed frame.
import type React from "react";
import type { V, PlateSeg } from "../types";
import type { Item } from "./state";
import type { InteriorView } from "./layout";
import { renderFrame } from "./frame";

const frameLine = "8px solid var(--field-frame)";

function plateSvg(segs: PlateSeg[], style: React.CSSProperties) {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" style={style}>
      {segs.map((s, i) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
    </svg>
  );
}

// h is the authored crop height, set when the piece is cropped to its module rows.
function renderPiece(item: Item, h: number | null) {
  switch (item.kind) {
    case "title": {
      const d = item.data;
      return (
        <>
          <div className="field-label" style={{ fontSize: 10 }}>{d.stamp}</div>
          <h1 className="field-title" style={{ margin: "10px 0 0", fontWeight: 400, fontSize: d.fs, lineHeight: 1.08, textWrap: "pretty" }}>{d.title}</h1>
        </>
      );
    }
    case "meta": {
      const d = item.data;
      // the record's key line: label over value under a hairline, as a catalogue card states it
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 28px", paddingTop: 12, borderTop: "1px solid color-mix(in srgb, var(--field-line) 22%, transparent)" }}>
          {d.fields.map(f => (
            <div key={f.k} style={{ minWidth: 96, maxWidth: "100%" }}>
              <div className="field-label" style={{ fontSize: 8.5 }}>{f.k}</div>
              <div className="field-title" style={{ marginTop: 6, fontSize: 17, lineHeight: 1.2 }}>{f.v}</div>
            </div>
          ))}
        </div>
      );
    }
    case "plate": {
      const d = item.data;
      return (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {plateSvg(d.plate, { display: "block", width: "100%", aspectRatio: "300 / 186", border: "1px solid color-mix(in srgb, var(--field-line) 40%, transparent)", background: "color-mix(in srgb, var(--field-ink) 3.5%, transparent)" })}
          <figcaption className="field-label" style={{ fontSize: 9.5 }}>{d.stamp}</figcaption>
        </figure>
      );
    }
    case "media": {
      const d = item.data;
      // an authored h crops the picture to its module rows around the focal point; otherwise the probed aspect is kept
      return (
        <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9, height: h ? "100%" : undefined }}>
          {d.imgCss && (
            <div aria-hidden="true" style={{ width: "100%", aspectRatio: h ? undefined : "1 / " + d.ar, flex: h ? "1 1 auto" : undefined, minHeight: 0, border: frameLine, backgroundImage: d.imgCss, backgroundSize: "cover", backgroundPosition: d.focal }} />
          )}
          <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{d.kind}</span>
            <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{d.cap}</span>
          </figcaption>
        </figure>
      );
    }
    case "video": {
      const d = item.data;
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
    }
    case "para":
      return <p className="field-body" style={{ margin: 0, fontSize: item.data.fs, lineHeight: 1.68 }}>{item.data.t}</p>;
    default:
      return null;
  }
}

// paint.ts owns transform/opacity/clip-path on the root, the board transform and the edge labels, found via
// data-role (interior, comp, edge-*); the inline values here are only the hidden baseline.
export function renderInterior(v: V, it: InteriorView) {
  return (
    <div data-role="interior" style={{ position: "absolute", inset: 0, zIndex: 30, overflow: "clip", touchAction: "none", userSelect: "none", cursor: "grab", transformOrigin: "0 0", willChange: "transform, opacity, clip-path", background: "color-mix(in srgb, var(--field-bg) 96%, transparent)", opacity: 0, pointerEvents: "none" }}>
      <div data-role="comp" style={{ position: "absolute", left: 0, top: 0, width: it.w, height: it.h, willChange: "transform", opacity: it.drawer ? 0.55 : 1, transition: "opacity 400ms ease" }}>
        {it.pieces.map(p => (
          <div key={p.key} data-piece={p.key} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h || undefined, zIndex: p.z }}>
            {renderPiece(p.item, p.h)}
          </div>
        ))}
      </div>
      {renderFrame(v, it)}
    </div>
  );
}
