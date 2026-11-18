// /api/entities: list, read, create and save entity manifests, and keep entities/index.json in step.
import { Hono } from "hono";
import { entitySchema, indexSchema, newEntitySchema, SLUG, type Entity, type EntitySummary } from "../schema/entity";
import { readJson, writeJson } from "./store";
import type { App } from "./index";

const INDEX = "entities/index.json";
const manifest = (id: string) => `entities/${id}/entity.json`;

type Index = { schema: 1; ids: string[] };

export const entities = new Hono<App>();

entities.get("/", async (c) => {
  const index = await readJson<Index>(c.env.MEDIA, INDEX);
  const ids = index ? indexSchema.parse(index.data).ids : [];
  const list = await Promise.all(
    ids.map(async (id): Promise<EntitySummary> => {
      const stored = await readJson<Entity>(c.env.MEDIA, manifest(id));
      if (!stored) return { id, media: 0, missing: true };
      const e = stored.data;
      return { id, title: e.title, kind: e.kind, year: e.year, media: e.media?.length ?? 0 };
    }),
  );
  return c.json(list);
});

entities.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!SLUG.test(id)) return c.json({ error: "bad id" }, 400);
  const stored = await readJson<Entity>(c.env.MEDIA, manifest(id));
  if (!stored) return c.json({ error: "not found" }, 404);
  return c.json(stored);
});

entities.post("/", async (c) => {
  const parsed = newEntitySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "invalid" }, 400);
  const { id, title, kind } = parsed.data;

  const entity: Entity = { schema: 1, id, title, kind };
  const etag = await writeJson(c.env.MEDIA, manifest(id), entity, null);
  if (!etag) return c.json({ error: `an entity "${id}" already exists` }, 409);

  // index.json is shared by every author: retry on conflict with a fresh read.
  for (let attempt = 0; attempt < 5; attempt++) {
    const index = await readJson<Index>(c.env.MEDIA, INDEX);
    const ids = index ? indexSchema.parse(index.data).ids : [];
    if (ids.includes(id)) return c.json({ data: entity, etag }, 201);
    const next = { ...(index?.data ?? { schema: 1 }), ids: [...ids, id].sort() };
    if (await writeJson(c.env.MEDIA, INDEX, next, index?.etag ?? null)) return c.json({ data: entity, etag }, 201);
  }
  return c.json({ error: "saved the entity, but could not add it to index.json; try again" }, 503);
});

entities.put("/:id", async (c) => {
  const id = c.req.param("id");
  const etag = c.req.header("if-match");
  if (!SLUG.test(id)) return c.json({ error: "bad id" }, 400);
  if (!etag) return c.json({ error: "If-Match header required" }, 428);

  const parsed = entitySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json({ error: issue ? `${issue.path.join(".") || "entity"}: ${issue.message}` : "invalid" }, 400);
  }
  if (parsed.data.id !== id) return c.json({ error: "id cannot change" }, 400);

  const next = await writeJson(c.env.MEDIA, manifest(id), parsed.data, etag);
  if (!next) return c.json({ error: "someone saved this entity after you opened it; reload to see their changes" }, 409);
  return c.json({ data: parsed.data, etag: next });
});
