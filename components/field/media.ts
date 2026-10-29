// Media: syncs each live-media object's pool state with focus, proximity and the open panel.
import type Field from "./Field";
import { liveMedia, type MediaState } from "@/lib/media/registry";
import * as pool from "@/lib/media/pool";

// Runs every frame, possibly several times: pool.apply and the stage write are both diffed.
export function syncMedia(f: Field) {
  const openId = f.state.open;
  if (!f.mediaStage?.isConnected) f.mediaStage = document.querySelector<HTMLElement>('[data-role="mediastage"]');
  if (!f.mediaSlot?.isConnected) f.mediaSlot = document.querySelector<HTMLElement>('[data-part="slot"]');
  let openLive = false;
  for (const o of f.OBJECTS) {
    const m = liveMedia(o);
    if (!m) continue;
    const isOpen = openId === o.id;
    const near = f.near[o.id] || 0;
    // Live while drawn on screen or within hearing range; a far but visible card plays near-silent.
    const seen = f.els[o.id]?.style.visibility === "visible";
    const state: MediaState = isOpen ? "open" : near > 0 || seen ? "near" : "thumb";
    pool.ensure(o.id, m.item);
    pool.place(o.id, isOpen ? f.mediaSlot : f.els[o.id]?.querySelector<HTMLElement>('[data-part="media"]') ?? null);
    pool.apply(o.id, state);
    pool.level(o.id, isOpen ? 1 : near);
    if (isOpen) openLive = true;
  }
  const ms = f.mediaStage;
  if (!ms) return;
  // sheetT rather than panelT, so the stage also gives way during the sideways lift-to-dismiss.
  const on = openLive && f.sheetT > 0.02;
  const key = on ? f.sheetT.toFixed(3) : "off";
  if (f.mediaStageKey === key) return;
  f.mediaStageKey = key;
  ms.style.opacity = on ? key : "0";
  ms.style.visibility = on ? "visible" : "hidden";
}
