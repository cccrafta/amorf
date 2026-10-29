import { rendererFor, type MediaItem, type MediaState } from "./registry";

type Live = { el: HTMLElement; kind: string; state: MediaState | null };

// Live elements are created once and moved between slots with appendChild;
// a synchronous move keeps playback, where a React remount would restart it.
const live = new Map<string, Live>();
let unlocked = false;

export function ensure(objId: string, item: MediaItem) {
  if (live.has(objId)) return;
  const renderer = rendererFor(item.kind);
  if (renderer) live.set(objId, { el: renderer.create(item), kind: item.kind, state: null });
}

export function place(objId: string, slot: HTMLElement | null) {
  const l = live.get(objId);
  if (l && slot && l.el.parentElement !== slot) slot.appendChild(l.el);
}

export function apply(objId: string, state: MediaState) {
  const l = live.get(objId);
  if (!l || l.state === state) return;
  rendererFor(l.kind)?.enter(l.el, state, l.state);
  l.state = state;
}

export function level(objId: string, v: number) {
  const l = live.get(objId);
  if (l) rendererFor(l.kind)?.level?.(l.el, v);
}

export function unlockAll() {
  if (unlocked) return;
  unlocked = true;
  live.forEach(l => rendererFor(l.kind)?.unlock?.(l.el));
}

export function releaseAll() {
  live.forEach(l => { rendererFor(l.kind)?.leave(l.el); l.el.remove(); });
  live.clear();
}
