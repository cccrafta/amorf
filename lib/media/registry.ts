import type { FieldObject } from "@/lib/field-data";

// thumb: out of range, at rest. near: within hearing range, live. open: in the full-screen stage.
export type MediaState = "thumb" | "near" | "open";
export type MediaItem = FieldObject["media"][number];

export type MediaRenderer = {
  create(item: MediaItem): HTMLElement;
  enter(el: HTMLElement, state: MediaState, prev: MediaState | null): void;
  // Continuous 0..1 closeness, called every frame; renderers ignore it if they have no use for it.
  level?(el: HTMLElement, v: number): void;
  leave(el: HTMLElement): void;
  // Called inside a user gesture so the browser grants later unmuted playback.
  unlock?(el: HTMLElement): void;
};

const renderers = new Map<string, MediaRenderer>();

export const registerRenderer = (kind: string, r: MediaRenderer) => { renderers.set(kind, r); };
export const rendererFor = (kind: string) => renderers.get(kind);

export function liveMedia(o: Pick<FieldObject, "media">): { item: MediaItem; index: number; renderer: MediaRenderer } | null {
  for (let i = 0; i < o.media.length; i++) {
    const renderer = renderers.get(o.media[i].kind);
    if (renderer) return { item: o.media[i], index: i, renderer };
  }
  return null;
}
