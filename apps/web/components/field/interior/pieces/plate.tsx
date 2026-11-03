import type { PlateSeg } from "../../types";
import { plate } from "../../plate";
import { registerPiece } from "./registry";

type Data = { plate: PlateSeg[]; stamp: string };

registerPiece<Data>({
  kind: "plate",
  layer: "board",
  // The generated line-art plate is only a stand-in: an entity with its own images or video goes without it.
  build({ o, heroAt }) {
    if (heroAt > -1) return [];
    return [{ key: "plate", ref: "plate", cols: 5, tall: w => w * 0.62 + 30, data: { plate: plate(o), stamp: o.k + (o.y ? " · " + o.y : "") } }];
  },
  render(d) {
    return (
      <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <svg viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true"
          style={{ display: "block", width: "100%", aspectRatio: "300 / 186", border: "1px solid color-mix(in srgb, var(--field-line) 40%, transparent)", background: "color-mix(in srgb, var(--field-ink) 3.5%, transparent)" }}>
          {d.plate.map((s, i) => <path key={i} d={s.d} fill={s.fl} stroke={s.st} strokeWidth={s.w} opacity={s.o} />)}
        </svg>
        <figcaption className="field-label" style={{ fontSize: 9.5 }}>{d.stamp}</figcaption>
      </figure>
    );
  },
});
