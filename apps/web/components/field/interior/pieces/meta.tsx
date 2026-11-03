import { registerPiece } from "./registry";

type Data = { fields: { k: string; v: string }[] };

registerPiece<Data>({
  kind: "meta",
  layer: "float",
  build({ o }) {
    // Unknown fields are left out rather than shown as "undated" or "unplaced".
    const fields = ([["date", o.y], ["place", o.place], ["creator", o.src], ["kind", o.k]] as const).filter(r => !!r[1]).map(([k, v]) => ({ k, v: v as string }));
    if (!fields.length) return [];
    return [{ key: "meta", ref: "meta", cols: 5, tall: w => Math.ceil(fields.length / Math.max(1, Math.floor(w / 150))) * 58 + 14, data: { fields } }];
  },
  render(d) {
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
  },
});
