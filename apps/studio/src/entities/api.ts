// Browser calls to /api/entities. Errors carry the server's message and status.
import type { Entity, EntitySummary, NewEntity } from "../../schema/entity";

export type Loaded = { data: Entity; etag: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(body.error ?? `${res.status} ${res.statusText}`, res.status);
  return body as T;
}

const JSON_HEADERS = { "content-type": "application/json" };

export const listEntities = () => call<EntitySummary[]>("/api/entities");

export const getEntity = (id: string) => call<Loaded>(`/api/entities/${id}`);

export const createEntity = (e: NewEntity) =>
  call<Loaded>("/api/entities", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(e) });

export const saveEntity = (e: Entity, etag: string) =>
  call<Loaded>(`/api/entities/${e.id}`, {
    method: "PUT",
    headers: { ...JSON_HEADERS, "if-match": etag },
    body: JSON.stringify(e),
  });
