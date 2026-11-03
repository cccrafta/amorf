// Interior state: the per-entity record Field keeps, its phase and tuning constants.
import type { PieceLayer, PieceSpec } from "./pieces/registry";

// Pull (0..1) past an edge at which letting go moves to that edge's neighbour.
export const COMMIT = 0.55;
// Fling glide and speed limits live in ../scroll.ts (scroll.glide, scroll.fling) so the scroll panel can tune them.
// Card height is ~300px against a 226px plate, so the plate centre sits this far above the card centre.
export const PLATE_DROP = 37;
// The text overlay (wide): width, left and bottom offset, and its resting height as a share of the viewport.
export const FLOAT = { w: 420, l: 40, b: 28, rest: 0.34 };

// slide: the next entity's preview is sliding in over this one (see lifecycle.slideTo).
export type Phase = "idle" | "approach" | "inside" | "slide" | "leaving";
// Slide length after release, the reduced-motion fade, and the cross-fade from preview to the real board.
// Zoom range of the board; the minimum is also capped so the whole board fits (the overview), see physics.zoomMin.
export const ZOOM_MAX = 2, ZOOM_FLOOR = 0.15;
export const SLIDE_MS = 180, SLIDE_REDUCED_MS = 100, SLIDE_OUT_MS = 100;
export type Rect = { x: number; y: number; w: number; h: number };
export type Dir = "left" | "right" | "up" | "down";
export type Tab = "facts" | "traces" | "related";
// A piece before placement: data is whatever its kind's render() draws; see pieces/registry.ts.
export type Item = PieceSpec<unknown> & { kind: string; layer: PieceLayer };
// pos is each piece's top-left box in board pixels; crop is set when an authored h fixes the height.
// enter is the radial opening: a delay by distance from the hero and the outward offset the piece arrives from.
export type Box = { x: number; y: number; w: number; h: number; col: number; row: number; cols: number; rows: number; z?: number; crop: boolean; enter?: { dl: number; ox: number; oy: number } };
export type Layout = { w: number; h: number; focus: { x: number; y: number }; pos: Record<string, Box> };
export type Comp = { id: string; dims: string; w: number; h: number; focus: { x: number; y: number } };

export type Interior = {
  phase: Phase;
  depth: number;
  depthWant: number;
  edge: { dir: Dir; pull: number } | null;
  drawer: Tab | null;
  enterAt: number;
  panX: number;
  panY: number;
  vx: number;
  vy: number;
  panKey: string;
  panDims: string;
  panLoX: number;
  panLoY: number;
  goal: { x: number; y: number } | null;
  comp: Comp | null;
  drag: { id: number; x: number; y: number; t: number; moved: number; captured: boolean } | null;
  pointers: Map<number, { x: number; y: number }>;
  gesture: boolean;
  wheelAt: number;
  // the last three wheel delta magnitudes: shrinking means a trackpad's momentum phase, i.e. the fingers have lifted
  wheelMags: number[];
  // time of the last swallowed wheel event after a slide began (0 when the wheel is live), the magnitude of that event,
  // and when muting began
  wheelMute: number;
  wheelMuteMag: number;
  wheelMuteFrom: number;
  wasHolding: boolean;
  movedAt: number;
  cardRect: Rect | null;
  leaveTo: { id: string; mark: string; friction: boolean } | null;
  layoutKey: string;
  layout: Layout | null;
  paintKey: string;
  compKey: string;
  edgeKey: string;
  stageKey: string;
  root: HTMLElement | null;
  surface: HTMLElement | null;
  edges: Partial<Record<Dir, { label: HTMLElement | null; line: HTMLElement | null; sub: HTMLElement | null; peek: HTMLElement | null }>>;
  // per entity: floatFor is the id they were last reset for, so a new entity opens with text and menu closed
  floatFor: string;
  // the entity "somewhere unrelated" will go to, chosen when the view builds so its pictures can be preloaded
  elsewhere: string;
  // dir is the side the preview enters from (null fades it in); r0 is how far a pull had already revealed it
  // (-1 until paint reads it from the pan on the slide's first frame);
  // out is when the switch happened and the preview began fading off the real board
  // switched: the entity has been swapped but its board may not be rendered yet, so the preview keeps covering
  slide: { to: string; mark: string; dir: Dir | null; start: number; r0: number; switched: boolean; out: number } | null;
  // id of the entity entered by a slide: its pieces appear at once, without the radial unfold
  slid: string;
  floatOpen: boolean;
  menu: boolean;
  scrollPanel: boolean;
  // board scale; zoomTo eases toward a scale with board point (bx, by) ending at screen point (sx, sy);
  // pinch is a two-finger pinch in progress (start distance and scale)
  zoom: number;
  zoomTo: { z: number; bx: number; by: number; sx: number; sy: number } | null;
  pinch: { d0: number; z0: number } | null;
  gestureZ: number;
  // set by a key kick, so its glide uses the fixed key decay rather than the tunable drag glide
  keyGlide: boolean;
};

export const newInterior = (): Interior => ({
  phase: "idle", depth: 0, depthWant: 0, edge: null, drawer: null, enterAt: 0,
  panX: 0, panY: 0, vx: 0, vy: 0, panKey: "", panDims: "", panLoX: 0, panLoY: 0, goal: null, comp: null,
  drag: null, pointers: new Map(), gesture: false, wheelAt: 0, wheelMags: [], wheelMute: 0, wheelMuteMag: 0, wheelMuteFrom: 0, wasHolding: false, movedAt: 0,
  cardRect: null, leaveTo: null, layoutKey: "", layout: null,
  paintKey: "", compKey: "", edgeKey: "", stageKey: "",
  root: null, surface: null, edges: {}, floatFor: "", elsewhere: "", slide: null, slid: "", floatOpen: false, menu: false, scrollPanel: false, zoom: 1, zoomTo: null, pinch: null, gestureZ: 1, keyGlide: false,
});

export const DIRS: Dir[] = ["up", "right", "down", "left"];
export const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
