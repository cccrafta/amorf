// Route paths: pure parsing and slugs, shared by the static page (which enumerates them) and the client sync in route.ts.
export type Route = { kind: "field" } | { kind: "entity"; id: string } | { kind: "plan" } | { kind: "walk"; slug: string };

export const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

// Pure, so the static page can enumerate the same shapes it parses.
export function parseSegments(segs: string[]): Route {
  const [a, b] = segs.map(decode);
  if (a === "entities" && b && segs.length === 2) return { kind: "entity", id: b };
  if (a === "plan" && segs.length === 1) return { kind: "plan" };
  if (a === "walks" && b && segs.length === 2) return { kind: "walk", slug: b };
  return { kind: "field" };
}

export const parsePath = (path: string) => parseSegments(path.split("/").filter(Boolean));
