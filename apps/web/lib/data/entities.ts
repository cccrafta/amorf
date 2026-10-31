// Entities: loads entity.json records from R2 at build time and converts them to the field's FieldObject shape.
import type { EntityLayout, FieldAssoc, FieldObject } from "@/lib/field-data";

type EntityMedia = {
  file?: string; embed?: unknown; kind: string; caption?: string; poster?: string;
  width?: number; height?: number; focal?: [number, number]; at?: [number, number];
};
type Entity = {
  id: string; title: string; kind: string; thumbnail?: string; year?: string; place?: string; creator?: string; creatorRole?: string;
  client?: string; collaborators?: string[]; program?: string; movement?: string; materials?: string[]; area?: string;
  medium?: string; discipline?: string; links?: { label?: string; url: string }[];
  description?: string[]; tags?: string[]; related?: { id: string; reason?: string }[]; media?: EntityMedia[]; layout?: EntityLayout;
};

// Facts drawer rows in reading order; empty fields are dropped rather than shown as placeholders.
function factsOf(e: Entity): { k: string; v: string }[] {
  const rows: [string, string | string[] | undefined][] = [
    ["medium", e.medium], [e.creatorRole || "creator", e.creator], ["client", e.client], ["collaborators", e.collaborators],
    ["program", e.program], ["movement", e.movement], ["discipline", e.discipline], ["materials", e.materials], ["area", e.area],
    ["tags", e.tags],
  ];
  return rows.flatMap(([k, v]) => {
    const s = Array.isArray(v) ? v.filter(Boolean).join(" · ") : (v || "").trim();
    return s ? [{ k, v: s }] : [];
  });
}

const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || "").replace(/\/$/, "");

// Only images and video have a renderer in the field; documents, audio and embeds are kept in entity.json but not shown yet.
function toFieldObject(e: Entity): FieldObject {
  const at = (f: string) => `/entities/${e.id}/${f}`;
  const media: FieldObject["media"] = [];
  for (const m of e.media || []) {
    if (!m.file) continue;
    const shape = { file: m.file, ar: m.width && m.height ? m.height / m.width : undefined, focal: m.focal, at: m.at };
    if (m.kind === "video") media.push({ kind: "video", cap: m.caption || "", src: at(m.file), poster: m.poster ? at(m.poster) : undefined, ...shape });
    else if (m.kind !== "audio" && m.kind !== "document") media.push({ kind: m.kind, cap: m.caption || "", img: at(m.file), ...shape });
  }
  // thumbnail names a file from media[]: a video is moved first so the card plays it, an image becomes the card's still.
  // Without one, a video wins over images; otherwise the first image.
  const all = e.media || [];
  const pick = e.thumbnail ? all.find(m => m.file === e.thumbnail)
    : all.find(m => m.file && m.kind === "video") || all.find(m => m.file && m.kind !== "audio" && m.kind !== "document");
  let thumb: string | undefined;
  if (pick?.kind === "video") {
    const i = media.findIndex(x => x.src === at(pick.file!));
    if (i > 0) media.unshift(...media.splice(i, 1));
  } else if (pick?.file) {
    thumb = at(pick.file);
  }
  return {
    thumb,
    id: e.id, t: e.title, k: e.kind, y: e.year || "", place: e.place || "", src: e.creator || "",
    p: e.description || [], media, notes: [], tags: e.tags || [],
    facts: factsOf(e), links: (e.links || []).filter(l => l.url).map(l => ({ label: l.label || l.url, url: l.url })), layout: e.layout,
  };
}

// Returns null when R2 is unreachable or not configured, so the caller can fall back to the seed data.
export async function loadEntities(): Promise<{ objects: FieldObject[]; assoc: FieldAssoc[] } | null> {
  if (!BASE) return null;
  try {
    const index = await fetch(`${BASE}/entities/index.json`).then(r => { if (!r.ok) throw new Error("index.json " + r.status); return r.json() as Promise<{ ids: string[] }>; });
    const entities = await Promise.all(index.ids.map(id =>
      fetch(`${BASE}/entities/${id}/entity.json`).then(r => { if (!r.ok) throw new Error(id + " " + r.status); return r.json() as Promise<Entity>; })));
    const valid = entities.filter(e => e && e.id && e.title && e.kind);
    const ids = new Set(valid.map(e => e.id));
    const assoc = valid.flatMap(e => (e.related || []).filter(r => ids.has(r.id)).map(r => [e.id, r.id, r.reason || ""] as FieldAssoc));
    return { objects: valid.map(toFieldObject), assoc };
  } catch (err) {
    console.warn("[entities] falling back to seed data:", (err as Error).message);
    return null;
  }
}
