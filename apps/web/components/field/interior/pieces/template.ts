// Entity templates: which piece kinds an entity type shows, in reading order. Entities without a type use the default.
import type { FieldNode } from "../../types";
import { pieceFor, type PieceCtx } from "./registry";
import type { Item } from "../state";

export type TemplateEntry = { kind: string; source?: string };

export const DEFAULT_TEMPLATE: TemplateEntry[] = [
  { kind: "title" },
  { kind: "meta" },
  { kind: "para", source: "description" },
  { kind: "plate" },
  { kind: "media" },
  { kind: "video" },
];

// Keyed by entity type once entities carry one (backlog: entity types); empty until then.
const TEMPLATES: Record<string, TemplateEntry[]> = {};

export const templateFor = (o: FieldNode & { type?: string }) => (o.type && TEMPLATES[o.type]) || DEFAULT_TEMPLATE;

// An entry naming an unregistered kind is skipped, so a template can list a kind before its file exists.
export function buildPieces(ctx: PieceCtx): Item[] {
  return templateFor(ctx.o).flatMap(e => {
    const k = pieceFor(e.kind);
    return k ? k.build(ctx, e.source).map(s => ({ ...s, kind: k.kind, layer: k.layer })) : [];
  });
}
