// R2 storage for the studio: JSON reads with their ETag, and conditional JSON writes.

export type Stored<T> = { data: T; etag: string };

// Same caching as entities:sync writes for JSON (apps/web/scripts/entities.mjs).
const JSON_META = { contentType: "application/json", cacheControl: "public, max-age=60" };

export async function readJson<T = unknown>(bucket: R2Bucket, key: string): Promise<Stored<T> | null> {
  const object = await bucket.get(key);
  if (!object) return null;
  return { data: (await object.json()) as T, etag: object.etag };
}

/**
 * Writes `data` only if the object is unchanged since it was read (`etag`),
 * or, with `etag: null`, only if it does not exist yet. Returns the new ETag, or null on conflict.
 */
export async function writeJson(
  bucket: R2Bucket,
  key: string,
  data: unknown,
  etag: string | null,
): Promise<string | null> {
  const onlyIf = etag === null ? { etagDoesNotMatch: "*" } : { etagMatches: etag };
  const body = JSON.stringify(data, null, 2) + "\n";
  const object = await bucket.put(key, body, { httpMetadata: JSON_META, onlyIf });
  return object ? object.etag : null;
}
