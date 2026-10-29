import { registerRenderer, type MediaState } from "./registry";

const unlocked = new WeakSet<HTMLVideoElement>();

const videoOf = (el: HTMLElement) => el.querySelector("video") as HTMLVideoElement;
const labelOf = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-part="sound"]')!;

function play(el: HTMLElement, v: HTMLVideoElement) {
  const label = labelOf(el);
  // Unmuting a playing muted video outside a gesture would make the browser pause it.
  if (!v.paused && v.muted) return;
  v.muted = false;
  v.play().then(() => { label.style.display = "none"; }).catch((err: DOMException) => {
    // A pause() racing the pending play() rejects with AbortError and must not fall back to muted.
    if (err.name !== "NotAllowedError") return;
    v.muted = true;
    v.play().catch(() => {});
    label.style.display = "block";
  });
}

registerRenderer("video", {
  create(item) {
    const el = document.createElement("div");
    el.style.cssText = "position:relative;width:100%;height:100%;background:var(--field-bg)";
    const v = document.createElement("video");
    v.playsInline = true;
    v.preload = "metadata";
    v.volume = 0;
    v.src = item.src || "";
    if (item.poster) v.poster = item.poster;
    v.style.cssText = "display:block;width:100%;height:100%;object-fit:cover";
    const label = document.createElement("div");
    label.dataset.part = "sound";
    label.textContent = "sound off";
    label.style.cssText = "display:none;position:absolute;right:12px;bottom:12px;padding:4px 8px;font:10px/1 var(--font-ibm-plex-mono),monospace;letter-spacing:0.18em;text-transform:uppercase;color:var(--field-ink);background:rgba(9,13,15,0.7);border:1px solid rgba(168,176,173,0.3);cursor:pointer";
    label.onclick = () => { v.muted = false; label.style.display = "none"; };
    el.append(v, label);
    return el;
  },

  enter(el, state: MediaState) {
    const v = videoOf(el), label = labelOf(el);
    el.dataset.state = state;
    v.controls = state === "open";
    v.style.objectFit = state === "open" ? "contain" : "cover";
    // The label is clickable only in the open slot; in the card slot the card itself takes the click.
    label.style.pointerEvents = state === "open" ? "auto" : "none";
    if (state === "thumb") {
      label.style.display = "none";
      v.pause();
      return;
    }
    play(el, v);
  },

  // Squared so loudness tracks perceived distance; eased because tick() can jump the camera.
  level(el, near) {
    const v = videoOf(el);
    const to = near * near;
    if (Math.abs(to - v.volume) < 0.002) return;
    v.volume = Math.max(0, Math.min(1, v.volume + (to - v.volume) * 0.12));
  },

  leave(el) {
    videoOf(el).pause();
  },

  unlock(el) {
    const v = videoOf(el);
    if (unlocked.has(v)) return;
    unlocked.add(v);
    // Already live on the muted fallback: this gesture is what lets it carry sound.
    if (!v.paused) { v.muted = false; labelOf(el).style.display = "none"; return; }
    // play() inside the gesture is what lifts the restriction; pausing in the same task keeps it
    // inaudible even where volume is read-only (iOS).
    v.muted = false;
    v.play().catch(() => {});
    v.pause();
  },
});
