// Copies entities/index.json and every entity.json from the live media bucket into the local, simulated R2 for `pnpm studio:dev`.
import { getPlatformProxy } from "wrangler";

const BASE = process.env.MEDIA_BASE ?? "https://media.amorf.co";

const get = async (path) => {
  const res = await fetch(`${BASE}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.text();
};

// Local only: getPlatformProxy never touches the real buckets unless a binding sets "remote": true.
const { env, dispose } = await getPlatformProxy({ configPath: "wrangler.jsonc", persist: true });
const meta = { httpMetadata: { contentType: "application/json", cacheControl: "public, max-age=60" } };

try {
  const index = await get("entities/index.json");
  const { ids } = JSON.parse(index);
  await env.MEDIA.put("entities/index.json", index, meta);
  let copied = 0;
  for (const id of ids) {
    try {
      await env.MEDIA.put(`entities/${id}/entity.json`, await get(`entities/${id}/entity.json`), meta);
      copied++;
    } catch (err) {
      console.warn(`skip ${id}: ${err.message}`);
    }
  }
  console.log(`seeded local R2 with index.json and ${copied} of ${ids.length} entities from ${BASE}`);
} finally {
  await dispose();
}
