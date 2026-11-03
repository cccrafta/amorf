import { clampN } from "../state";
import { lines, registerPiece } from "./registry";

type Data = { stamp: string; title: string; fs: number };

registerPiece<Data>({
  kind: "title",
  layer: "float",
  build({ o, W, narrow }) {
    // the float column is narrow, so the title is set smaller there than the old board title was
    const fs = narrow ? 34 : Math.round(clampN(W * 0.022, 26, 34));
    const stamp = (o.tags.length ? o.tags.slice(0, 3).join(" · ") : o.k).replace(/-/g, " ");
    return [{ key: "title", ref: "title", cols: 6, tall: w => 28 + lines(o.t, w, fs, 0.5) * fs * 1.06, data: { stamp, title: o.t, fs } }];
  },
  render(d) {
    return (
      <>
        <div className="field-label" style={{ fontSize: 10 }}>{d.stamp}</div>
        <h1 className="field-title" style={{ margin: "10px 0 0", fontWeight: 400, fontSize: d.fs, lineHeight: 1.08, textWrap: "pretty" }}>{d.title}</h1>
      </>
    );
  },
});
