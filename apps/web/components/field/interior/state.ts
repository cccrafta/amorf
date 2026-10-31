// Interior state: the per-entity record Field keeps, its phase and tuning constants.
import type { PlateSeg } from "../types";

// Pull (0..1) past an edge at which letting go moves to that edge's neighbour.
export const COMMIT = 0.55;
// Momentum decay constant (ms). A kick of delta/PAN_TAU travels exactly delta in total.
export const PAN_TAU = 240;
// Card height is ~300px against a 226px plate, so the plate centre sits this far above the card centre.
export const PLATE_DROP = 37;

export type Phase = "idle" | "approach" | "inside" | "leaving";
export type Rect = { x: number; y: number; w: number; h: number };
export type Dir = "left" | "right" | "up" | "down";
export type Tab = "facts" | "traces" | "related";
// A board piece before placement: ref is its layout address, cols its default span, tall its pixel height at a pixel width.
type ItemBase = { key: string; ref: string; cols: number; tall: (w: number) => number; at?: [number, number] };
export type MetaField = { k: string; v: string };
// data is what the view draws for that kind of piece.
export type Item = ItemBase & (
  | { kind: "title"; data: { stamp: string; title: string; fs: number } }
  | { kind: "meta"; data: { fields: MetaField[] } }
  | { kind: "plate"; data: { plate: PlateSeg[]; stamp: string } }
  | { kind: "media"; data: { kind: string; cap: string; imgCss: string | null; ar: number; focal: string } }
  | { kind: "video"; data: { kind: string; cap: string } }
  | { kind: "para"; data: { t: string; fs: number } }
);
// pos is each piece's top-left box in board pixels; crop is set when an authored h fixes the height.
export type Box = { x: number; y: number; w: number; h: number; col: number; row: number; cols: number; rows: number; z?: number; crop: boolean };
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
  edges: Partial<Record<Dir, { label: HTMLElement | null; line: HTMLElement | null; sub: HTMLElement | null }>>;
};

export const newInterior = (): Interior => ({
  phase: "idle", depth: 0, depthWant: 0, edge: null, drawer: null, enterAt: 0,
  panX: 0, panY: 0, vx: 0, vy: 0, panKey: "", panDims: "", panLoX: 0, panLoY: 0, goal: null, comp: null,
  drag: null, pointers: new Map(), gesture: false, wheelAt: 0, wasHolding: false, movedAt: 0,
  cardRect: null, leaveTo: null, layoutKey: "", layout: null,
  paintKey: "", compKey: "", edgeKey: "", stageKey: "",
  root: null, surface: null, edges: {},
});

export const DIRS: Dir[] = ["up", "right", "down", "left"];
export const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
