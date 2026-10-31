// Media: syncs each live-media object's pool state with focus, proximity and the open interior.
import type Field from "./Field";
import { liveMedia, type MediaState } from "@/lib/media/registry";
import * as pool from "@/lib/media/pool";

const cardSlot = (f: Field, id: string) => f.els[id]?.querySelector<HTMLElement>('[data-part="media"]') ?? null;

// Runs every frame, possibly several times: pool.apply is diffed.
export function syncMedia(f: Field) {
  const openId = f.state.open;
  if (!f.mediaSlot?.isConnected) f.mediaSlot = document.querySelector<HTMLElement>('[data-part="slot"]');
  for (const o of f.OBJECTS) {
    const m = liveMedia(o);
    if (!m) continue;
    // open only while the interior is actually showing: state.open lags the phase by a frame on leave, and is set before the dive begins
    const isOpen = openId === o.id && (f.ix.phase === "inside" || (f.ix.phase === "leaving" && f.ix.depth >= 0.02));
    const near = f.near[o.id] || 0;
    // Live while drawn on screen or within hearing range; a far but visible card plays near-silent.
    const seen = f.els[o.id]?.style.visibility === "visible";
    const state: MediaState = isOpen ? "open" : near > 0 || seen ? "near" : "thumb";
    pool.ensure(o.id, m.item);
    pool.place(o.id, isOpen ? f.mediaSlot : cardSlot(f, o.id));
    pool.apply(o.id, state);
    pool.level(o.id, isOpen ? Math.max(near, f.ix.depth) : near);
  }
}

// The slot lives inside the interior, which unmounts on leave; moving the element out first is a
// synchronous move, so playback is not interrupted by a detach.
export function stowMedia(f: Field, id: string) {
  if (liveMedia(f.byId(id))) pool.place(id, cardSlot(f, id));
}
