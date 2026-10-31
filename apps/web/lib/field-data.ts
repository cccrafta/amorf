export type FieldObject = {
  id: string;
  t: string;
  k: string;
  y: string;
  place: string;
  src: string;
  p: string[];
  // file names the item in layout refs (media:<file>); ar is height / width from the probe; at is the deprecated
  // [x, y] placement fraction, read only when layout.items does not list the piece.
  media: { kind: string; cap: string; img?: string; src?: string; poster?: string; file?: string; ar?: number; focal?: [number, number]; at?: [number, number] }[];
  notes: { txt: string; by: string }[];
  tags: string[];
  // Card still image URL. When set the card shows it instead of playing live media; the video still plays in the entity view.
  thumb?: string;
  // The full record shown in the entity view's facts drawer, label first; unknown fields are left out.
  facts?: { k: string; v: string }[];
  links?: { label: string; url: string }[];
  layout?: EntityLayout;
};

// Authored placement of an entity's board on a 12-column grid of square modules (docs/design/entity-view.md).
export type LayoutItem = { ref: string; col?: number; row?: number; w?: number; h?: number; z?: number; narrow?: { col?: number; row?: number; w?: number } };
export type EntityLayout = {
  version?: 1;
  board?: { cols?: number; rows?: number };
  entry?: { col?: number; row?: number };
  items?: LayoutItem[];
};

export type FieldAssoc = [string, string, string];

export type FieldNoteSeed = {
  id: string;
  obj: string;
  by: string;
  walk: string | null;
  txt: string;
};

// Entities come from R2 (lib/data/entities.ts, docs/conventions/entities.md); nothing is hard-coded here.
export const OBJECTS: FieldObject[] = [];

export const ASSOC: FieldAssoc[] = [];

export const NOTE_SEED: FieldNoteSeed[] = [];

export const SEEDED_WALKS: { name: string; steps: string[] }[] = [];
