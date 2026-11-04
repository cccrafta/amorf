import { capH, registerPiece } from "./registry";
import { Caption, fileOf, frameLine } from "./media";

type Data = { kind: string; cap: string };

registerPiece<Data>({
  kind: "video",
  layer: "board",
  // only the live element has a slot; other playable media wait for a renderer
  build({ o, live }) {
    if (live === null) return [];
    const m = o.media[live];
    return [{ key: "m" + live, ref: "media:" + fileOf(m, live), cols: 7, tall: w => w * 0.5625 + capH(m.cap, w), at: m.at, data: { kind: m.kind, cap: m.cap } }];
  },
  render(d) {
    // The live element is moved into this slot by syncMedia; React never renders into it.
    return (
      <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", border: frameLine, background: "var(--field-bg)" }}>
          <div data-part="slot" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />
        </div>
        <Caption kind={d.kind} cap={d.cap} />
      </figure>
    );
  },
});
