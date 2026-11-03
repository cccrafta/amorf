import type { FieldNode } from "../../types";
import { mediaUrl } from "@/lib/media/url";
import { rendererFor } from "@/lib/media/registry";
import { isReady } from "@/lib/media/preload";
import { capH, registerPiece } from "./registry";

type Data = { kind: string; cap: string; src: string | null; ar: number; focal: string };

export const frameLine = "8px solid var(--field-frame)";
export const fileOf = (m: FieldNode["media"][number], i: number) => m.file || (m.img || m.src || "").split("/").pop() || String(i);

export function Caption({ kind, cap }: { kind: string; cap: string }) {
  return (
    <figcaption style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span className="field-label" style={{ flex: "0 0 auto", fontSize: 9, color: "rgba(var(--field-mute-rgb), 0.8)" }}>{kind}</span>
      <span className="field-body" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{cap}</span>
    </figcaption>
  );
}

// Still pictures only: media with a registered renderer is the video kind's.
registerPiece<Data>({
  kind: "media",
  layer: "board",
  build({ o }) {
    return (o.media || []).flatMap((m, i) => {
      if (rendererFor(m.kind)) return [];
      const ar = m.ar || 0.72, img = m.img ? mediaUrl(m.img) : null;
      return [{
        key: "m" + i, ref: "media:" + fileOf(m, i), cols: ar > 1.05 ? 4 : 5, tall: (w: number) => w * ar + capH(m.cap, w), at: m.at,
        data: { kind: m.kind, cap: m.cap, src: img, ar, focal: m.focal ? m.focal[0] * 100 + "% " + m.focal[1] * 100 + "%" : "center" },
      }];
    });
  },
  render(d, h) {
    // An authored h crops the picture to its module rows around the focal point; otherwise the probed aspect is kept.
    // The frame is sized from data, so it stands empty until the picture arrives and fades in; a preloaded one shows at once.
    return (
      <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 9, height: h ? "100%" : undefined }}>
        {d.src && (
          <div aria-hidden="true" style={{ width: "100%", aspectRatio: h ? undefined : "1 / " + d.ar, flex: h ? "1 1 auto" : undefined, minHeight: 0, border: frameLine, overflow: "hidden", background: "color-mix(in srgb, var(--field-ink) 4%, transparent)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export: next/image optimisation is not available */}
            <img src={d.src} alt="" decoding="async" draggable={false}
              // already in the browser cache: shown before its first style pass, so it never runs the fade
              ref={el => { if (el && el.complete && el.naturalWidth) el.style.opacity = "1"; }} onLoad={e => { e.currentTarget.style.opacity = "1"; }}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: d.focal, opacity: isReady(d.src) ? 1 : 0, transition: "opacity 220ms ease" }} />
          </div>
        )}
        <Caption kind={d.kind} cap={d.cap} />
      </figure>
    );
  },
});
