// Form faces (DDR-0004): which picture an entity's form shows on each face, derived from the entity's media.
import type { FieldObject } from "@/lib/field-data";

// Slot order is the derivation order: the cover in front, the rest of media[] round the sides, then top and bottom.
export const SLOTS = ["front", "right", "back", "left", "top", "bottom"] as const;

export type FacePicture = { url: string; fit: "cover" | "contain"; focal?: [number, number] };
// ar is the cover's height / width; the form takes it as its proportion. A face is null only when the entity has no picture.
export type FormFaces = { id: string; title: string; ar: number; faces: (FacePicture | null)[] };

type Media = FieldObject["media"][number];

// A video counts with its poster; kinds without a picture (sound) are skipped.
const pictureOf = (m: Media) => (m.kind === "video" ? m.poster : m.kind === "sound" ? undefined : m.img);
// Drawings and documents are notation: contained, never cropped (STU-0006 deduction 4). Photographs fill the face.
const fitOf = (kind: string): FacePicture["fit"] => (kind === "drawing" || kind === "document" ? "contain" : "cover");

export function formFaces(o: FieldObject): FormFaces | null {
  const pics = o.media.flatMap(m => {
    const url = pictureOf(m);
    return url ? [{ url, fit: fitOf(m.kind), focal: m.focal, ar: m.ar }] : [];
  });
  // toFieldObject sets thumb for an image cover and moves a video cover first, so pics[0] is the cover otherwise.
  const coverUrl = o.thumb ?? pics[0]?.url;
  if (!coverUrl) return null;
  const cover = pics.find(p => p.url === coverUrl) ?? { url: coverUrl, fit: "cover" as const, focal: undefined, ar: undefined };
  const ordered = [cover, ...pics.filter(p => p.url !== coverUrl)].slice(0, SLOTS.length);
  return {
    id: o.id,
    title: o.t,
    ar: cover.ar ?? 1,
    // Every face is covered: fewer pictures than faces repeat in the same order (one picture covers all six).
    faces: SLOTS.map((_, i) => {
      const p = ordered[i % ordered.length];
      return { url: p.url, fit: p.fit, ...(p.focal ? { focal: p.focal } : {}) };
    }),
  };
}
