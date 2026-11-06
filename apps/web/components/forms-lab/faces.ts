// Form faces (DDR-0004, narrowed by DDR-0005): the thumbnail form shows one picture, the cover, on every face; the entity's
// other pictures are its satellites (satellites.ts).
import type { FieldObject } from "@/lib/field-data";

// Face slots in shader order.
export const SLOTS = ["front", "right", "back", "left", "top", "bottom"] as const;

export type FacePicture = { url: string; fit: "cover" | "contain"; focal?: [number, number] };
// ar is the cover's height / width; the form takes it as its proportion. A face is null only when the entity has no picture.
export type FormFaces = { id: string; title: string; ar: number; faces: (FacePicture | null)[]; board: BoardPicture[] };
// Every picture of the entity for the board, uncropped: ar is height / width, video marks a poster of a video.
export type BoardPicture = { url: string; ar: number; video: boolean };

type Media = FieldObject["media"][number];

// A video counts with its poster; kinds without a picture (sound) are skipped.
const pictureOf = (m: Media) => (m.kind === "video" ? m.poster : m.kind === "sound" ? undefined : m.img);
// Drawings and documents are notation: contained, never cropped (STU-0006 deduction 4). Photographs fill the face.
const fitOf = (kind: string): FacePicture["fit"] => (kind === "drawing" || kind === "document" ? "contain" : "cover");

export function formFaces(o: FieldObject): FormFaces | null {
  const pics = o.media.flatMap(m => {
    const url = pictureOf(m);
    return url ? [{ url, fit: fitOf(m.kind), focal: m.focal, ar: m.ar, video: m.kind === "video" }] : [];
  });
  // toFieldObject sets thumb for an image cover and moves a video cover first, so pics[0] is the cover otherwise.
  const coverUrl = o.thumb ?? pics[0]?.url;
  if (!coverUrl) return null;
  const cover = pics.find(p => p.url === coverUrl) ?? { url: coverUrl, fit: "cover" as const, focal: undefined, ar: undefined, video: false };
  const all = [cover, ...pics.filter(p => p.url !== coverUrl)];
  return {
    // The board shows every picture, cover first as the hero; a missing ratio is taken as square.
    board: all.map(p => ({ url: p.url, ar: p.ar ?? 1, video: p.video })),
    id: o.id,
    title: o.t,
    ar: cover.ar ?? 1,
    // The thumbnail is one medium: the cover covers all six faces.
    faces: SLOTS.map(() => ({ url: cover.url, fit: cover.fit, ...(cover.focal ? { focal: cover.focal } : {}) })),
  };
}
