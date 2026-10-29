// Types shared across the field: nodes, state, props and the view model.
import type { FieldObject } from "@/lib/field-data";
import type Field from "./Field";

// hx/hz (world position) are assigned at runtime in componentDidMount, not part
// of the data schema in lib/field-data.ts.
export type FieldNode = FieldObject & { hx: number; hz: number };

export type Walk = {
  name: string;
  steps: string[];
  table?: boolean;
  layout?: Record<string, { x: number; y: number }>;
};

export type NoteMark = { d: string; w: string };

export type FieldNote = {
  id: string;
  obj: string;
  by: string;
  walk: string | null;
  txt: string;
  kind: string;
  marks: NoteMark[];
  img?: string | null;
  mine?: boolean;
  ink?: string;
};

export type PlateSeg = { d: string; st: string; fl: string; w: number; o: string };

export type TableMetrics = {
  b: { xMin: number; xMax: number; yMin: number; yMax: number };
  px: number;
  py: number;
  cols: number;
  rows: number;
};

export type Props = {
  wearStrength?: number;
  planEdges?: boolean;
  frictionEvery?: number;
  showOthers?: boolean;
  fieldNotes?: boolean;
  inkColor?: string;
};

export type State = {
  focus: { id: string; title: string; stamp: string } | null;
  open: string | null;
  trace: { id: string; mark: string; depth: string; note?: boolean }[];
  cursor: number;
  query: string;
  askOpen: boolean;
  narrow: boolean;
  compose: string | null;
  view: string | null;
  noteTxt: string;
  noteRev: number;
  notesOpen: boolean;
  hand: string | null;
  tracksOn: boolean;
  catalogue: boolean;
  filter: string | null;
  hoverJourney: string | null;
  naming: boolean;
  nameValue: string;
  seeded: Walk[];
  joined: string | null;
  plan: boolean;
  planHover: string | null;
  tableOpen: boolean;
  table: string[];
  bindName: string;
  tableNote: string | null;
  kept: Record<string, boolean>;
  jump?: { span: string; years: string; paces: string } | null;
};

// Loosely typed on purpose: the view model is a JS-shaped bag of ~80 keys.
export type Vals = Record<string, any>;

// renderVals() returns Record<string, any> by design (it's a JS-shaped view
// model with ~80 keys) — V just spells out that render()'s `v` also carries props.
export type V = Props & Vals;

// One loop owned by the window: hosts throttle rAF and intervals unevenly, and a
// remount can orphan a timer, so a single instance drives whichever Field is live.
declare global {
  interface Window {
    __amorfActive?: Field | null;
    __amorfLoop?: ReturnType<typeof setInterval>;
    __amorfRaf?: number;
    __amorfWatch?: ReturnType<typeof setInterval>;
    __amorfRafSeen?: number;
  }
}
