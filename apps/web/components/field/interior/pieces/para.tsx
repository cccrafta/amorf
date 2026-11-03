import { lines, registerPiece } from "./registry";

type Data = { t: string; fs: number };

registerPiece<Data>({
  kind: "para",
  layer: "float",
  // "description" is the only source today: entity.json's description, which the loader splits into o.p.
  build({ o, narrow }) {
    const fs = narrow ? 15 : 15.5;
    return o.p.map((t, i) => ({ key: "p" + i, ref: "p:" + i, cols: 4, tall: (w: number) => lines(t, w, fs, 0.5) * fs * 1.68 + 6, data: { t, fs } }));
  },
  render(d) {
    return <p className="field-body" style={{ margin: 0, fontSize: d.fs, lineHeight: 1.68 }}>{d.t}</p>;
  },
});
