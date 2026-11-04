// Scroll tuning: one place for how the wheel, trackpad and drag move things on the site. The entity view and the field
// read these values on every event, so a change from the scroll panel applies at once; it is kept per browser.
export type ScrollTune = {
  // entity view: wheel or trackpad distance multiplier
  wheel: number;
  // entity view: share of a trackpad's momentum (the glide after the fingers lift) that still moves the board, 0..1
  momentum: number;
  // entity view: how long a drag fling glides, as its decay constant in ms (a fling travels about speed x this)
  glide: number;
  // entity view: top fling speed in px per ms
  fling: number;
  // field: walking distance per wheel unit, and turning in degrees per sideways wheel unit
  walk: number;
  turn: number;
};

export const SCROLL_DEFAULTS: ScrollTune = { wheel: 1, momentum: 0.35, glide: 140, fling: 2.5, walk: 1.9, turn: 0.085 };

// Slider ranges for the panel, in the order it lists them.
export const SCROLL_RANGES: { k: keyof ScrollTune; label: string; min: number; max: number; step: number }[] = [
  { k: "wheel", label: "entity · wheel speed", min: 0.2, max: 2.5, step: 0.05 },
  { k: "momentum", label: "entity · trackpad glide", min: 0, max: 1, step: 0.05 },
  { k: "glide", label: "entity · drag glide ms", min: 0, max: 400, step: 10 },
  { k: "fling", label: "entity · fling max", min: 0.5, max: 6, step: 0.1 },
  { k: "walk", label: "field · walk speed", min: 0.4, max: 4, step: 0.1 },
  { k: "turn", label: "field · turn speed", min: 0.02, max: 0.2, step: 0.005 },
];

const KEY = "amorf.scroll";

function load(): ScrollTune {
  if (typeof window === "undefined") return { ...SCROLL_DEFAULTS };
  try { return { ...SCROLL_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...SCROLL_DEFAULTS }; }
}

// Mutated in place so every reader keeps the same object.
export const scroll: ScrollTune = load();

export function setScroll(p: Partial<ScrollTune>) {
  Object.assign(scroll, p);
  try { localStorage.setItem(KEY, JSON.stringify(scroll)); } catch { /* private mode: the change lasts for this visit */ }
}

export function resetScroll() {
  Object.assign(scroll, SCROLL_DEFAULTS);
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
