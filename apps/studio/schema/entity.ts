// Entity schemas shared by the Worker and the SPA: the manifest, a new entity, the id index.
import { z } from "zod";

// Same lists as apps/web/scripts/entities.mjs (KINDS) and docs/conventions/entities.md.
export const KINDS = ["building", "drawing", "photograph", "document", "film", "sound", "material", "fragment"] as const;

export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const TEXT_FIELDS = [
  "year",
  "place",
  "creator",
  "creatorRole",
  "client",
  "program",
  "movement",
  "area",
  "medium",
  "discipline",
] as const;

export const LIST_FIELDS = ["materials", "tags", "collaborators"] as const;

const text = z.string().min(1).optional();
const list = z.array(z.string().min(1)).optional();

// Loose: fields the studio does not edit yet (media, layout, links, related, thumbnail) pass through untouched.
export const entitySchema = z.looseObject({
  schema: z.literal(1),
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  kind: z.enum(KINDS),
  ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, text])),
  ...Object.fromEntries(LIST_FIELDS.map((f) => [f, list])),
  description: list,
  media: z.array(z.looseObject({ kind: z.string() })).optional(),
});

export type Entity = z.infer<typeof entitySchema> &
  Partial<Record<(typeof TEXT_FIELDS)[number], string>> &
  Partial<Record<(typeof LIST_FIELDS)[number], string[]>>;

export const newEntitySchema = z.object({
  id: z.string().regex(SLUG, "lowercase words joined by hyphens"),
  title: z.string().trim().min(1),
  kind: z.enum(KINDS),
});

export type NewEntity = z.infer<typeof newEntitySchema>;

export const indexSchema = z.looseObject({
  schema: z.literal(1),
  ids: z.array(z.string()),
});

export type EntitySummary = {
  id: string;
  title?: string;
  kind?: string;
  year?: string;
  media: number;
  missing?: boolean;
};
