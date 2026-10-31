// Entities: probes media files into entity.json (mime, size, dimensions, duration) and checks every entity against docs/conventions/entities.md.
// Usage: node scripts/entities.mjs probe|check [content/entities]  (default: apps/web/content/entities, resolved from this file)
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, root = join(APP_ROOT, "content/entities")] = process.argv.slice(2);
const KINDS = ["building", "drawing", "photograph", "document", "film", "sound", "material", "fragment"];
const MEDIA_KINDS = ["photograph", "detail", "material", "drawing", "video", "audio", "document"];
const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif", jxl: "image/jxl",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", pdf: "application/pdf",
};
// Formats a browser cannot be relied on to show; they must be converted before publishing.
const NOT_WEB = ["jxl", "mov", "wav"];

const ids = existsSync(root) ? readdirSync(root).filter(d => statSync(join(root, d)).isDirectory()).sort() : [];
const load = id => JSON.parse(readFileSync(join(root, id, "entity.json"), "utf8"));
const save = (id, e) => writeFileSync(join(root, id, "entity.json"), JSON.stringify(e, null, 2) + "\n");
const extOf = f => extname(f).slice(1).toLowerCase();

function probe(path) {
  try {
    const out = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", path], { encoding: "utf8" }));
    const v = (out.streams || []).find(s => s.width), d = Number(out.format?.duration);
    return { width: v?.width, height: v?.height, duration: d > 0 && !["image"].includes(v?.codec_type) ? Math.round(d * 10) / 10 : undefined };
  } catch { return {}; }
}

// Default spans match components/field/interior/layout.ts: title 6, meta 5, paragraph 4, media 5 (portrait 4, video 7).
function spanOf(ref, media) {
  if (ref === "title") return 6;
  if (ref === "meta") return 5;
  if (ref.startsWith("p:")) return 4;
  const m = media.find(x => "media:" + (x.file || x.embed?.url) === ref);
  if (m?.kind === "video") return 7;
  return m?.width && m.height && m.height / m.width > 1.05 ? 4 : 5;
}

// Layout rules from docs/design/entity-view.md. Heights are content-derived at runtime, so an item without h
// is checked as one row tall: overlaps of the top rows are caught, overlaps further down are not.
function checkLayout(e, at, errors, warnings) {
  const L = e.layout, media = e.media || [], cols = L.board?.cols ?? 24;
  if (L.version !== undefined && L.version !== 1) errors.push(at("layout.version must be 1"));
  if (cols < 12 || cols > 48) errors.push(at("layout.board.cols must be 12..48"));
  const ec = L.entry?.col ?? 1, er = L.entry?.row ?? 1, seen = new Set(), boxes = [];
  (L.items || []).forEach((it, i) => {
    const where = `layout.items[${i}] "${it.ref}"`;
    if (seen.has(it.ref)) errors.push(at(`${where} is listed twice`));
    seen.add(it.ref);
    const p = /^p:(\d+)$/.exec(it.ref || "");
    const ok = it.ref === "title" || it.ref === "meta" || (p && +p[1] < (e.description || []).length)
      || (/^media:/.test(it.ref) && media.some(m => "media:" + (m.file || m.embed?.url) === it.ref));
    if (!ok) { errors.push(at(`${where} does not resolve to title, meta, a description paragraph or a media[] file`)); return; }
    const w = it.w ?? spanOf(it.ref, media);
    if (it.col && it.col + w - 1 > cols) errors.push(at(`${where} ends at column ${it.col + w - 1}, beyond board.cols ${cols}`));
    if (it.narrow?.col && it.narrow.col + (it.narrow.w ?? 4) - 1 > 4) errors.push(at(`${where} narrow placement ends beyond column 4`));
    if (!it.col || !it.row) return;
    const box = { ref: it.ref, l: it.col, r: it.col + w - 1, t: it.row, b: it.row + (it.h ?? 1) - 1 };
    for (const o of boxes) if (box.l <= o.r && o.l <= box.r && box.t <= o.b && o.t <= box.b) errors.push(at(`${where} overlaps "${o.ref}"`));
    boxes.push(box);
    if ((it.ref === "title" || it.ref === "meta") && (box.l < ec || box.r > ec + 11 || box.t < er || box.t > er + 5))
      warnings.push(at(`${where} starts outside the entry frame (columns ${ec}-${ec + 11}, rows ${er}-${er + 5}); it will not be visible on entry`));
  });
  media.forEach((m, i) => { if (m.at) warnings.push(at(`media[${i}].at is deprecated; place it with layout.items`)); });
}

if (cmd === "probe") {
  for (const id of ids) {
    const e = load(id);
    for (const m of e.media || []) {
      for (const k of ["file", "poster"]) {
        if (!m[k] || !existsSync(join(root, id, m[k]))) continue;
        if (k === "poster") continue;
        const p = join(root, id, m.file), ext = extOf(m.file), info = probe(p);
        m.mime = MIME[ext] || "application/octet-stream";
        m.bytes = statSync(p).size;
        if (info.width) { m.width = info.width; m.height = info.height; } else { delete m.width; delete m.height; }
        // a still image reports a duration in some containers; only time-based media keep one
        if (info.duration && /^(video|audio)\//.test(m.mime) && !/gif/.test(m.mime)) m.duration = info.duration; else delete m.duration;
      }
    }
    save(id, e);
  }
  console.log(`probed ${ids.length} entities`);
} else if (cmd === "check") {
  const errors = [], warnings = [], seen = new Set(ids);
  for (const id of ids) {
    const at = msg => `${id}: ${msg}`;
    let e;
    try { e = load(id); } catch (err) { errors.push(at("entity.json missing or invalid JSON (" + err.message + ")")); continue; }
    if (e.schema !== 1) errors.push(at("schema must be 1"));
    if (e.id !== id) errors.push(at(`id "${e.id}" must equal the folder name`));
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(at("folder name is not a kebab-case slug"));
    if (!e.title) errors.push(at("title is required"));
    if (!KINDS.includes(e.kind)) errors.push(at(`kind "${e.kind}" is not one of ${KINDS.join(", ")}`));
    if (e.thumbnail && !(e.media || []).some(m => m.file === e.thumbnail)) errors.push(at(`thumbnail "${e.thumbnail}" is not a media[].file`));
    for (const r of e.related || []) if (!seen.has(r.id)) errors.push(at(`related id "${r.id}" does not exist`));
    const used = new Set(["entity.json"]);
    (e.media || []).forEach((m, i) => {
      const where = `media[${i}]`;
      if (!MEDIA_KINDS.includes(m.kind)) errors.push(at(`${where} kind "${m.kind}" is not one of ${MEDIA_KINDS.join(", ")}`));
      if (!!m.file === !!m.embed) errors.push(at(`${where} needs exactly one of file or embed`));
      for (const k of ["file", "poster"]) {
        if (!m[k]) continue;
        used.add(m[k]);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/.test(m[k])) errors.push(at(`${where} ${k} "${m[k]}" is not a kebab-case file name`));
        if (!existsSync(join(root, id, m[k]))) errors.push(at(`${where} ${k} "${m[k]}" does not exist`));
        else if (k === "file" && m.bytes !== undefined && m.bytes !== statSync(join(root, id, m.file)).size) warnings.push(at(`${where} bytes out of date; run probe`));
        if (NOT_WEB.includes(extOf(m[k]))) warnings.push(at(`${where} ${m[k]} is not a web format; convert before publishing`));
      }
      if (m.file && m.mime === undefined) warnings.push(at(`${where} has no generated fields; run probe`));
      if (m.embed && !m.poster) warnings.push(at(`${where} embed has no local poster`));
    });
    for (const f of readdirSync(join(root, id))) if (!used.has(f) && !f.startsWith(".") && f !== "originals") warnings.push(at(`orphan file "${f}" is not referenced by entity.json`));
    if (e.layout) checkLayout(e, at, errors, warnings);
    else (e.media || []).forEach((m, i) => { if (m.at) warnings.push(at(`media[${i}].at is deprecated; place it with layout.items`)); });
  }
  warnings.forEach(w => console.log("warn  " + w));
  errors.forEach(e => console.log("error " + e));
  console.log(`${ids.length} entities, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
} else if (cmd === "sync") {
  // Uploads each entity's published files (never originals/) to R2 under entities/<id>/, then entities/index.json.
  // Media is immutable by name, so it caches for a year; the JSON changes, so it caches for a minute.
  const BUCKET = "amorf-media", MANIFEST = join(root, "..", ".sync-manifest.json");
  const done = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const put = (key, file, type, cache) => execFileSync("pnpm", ["exec", "wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", type, "--cache-control", cache, "--remote"], { stdio: ["ignore", "ignore", "inherit"] });
  const hash = file => createHash("sha1").update(readFileSync(file)).digest("hex");
  let sent = 0;
  for (const id of ids) {
    const e = load(id);
    const files = [...new Set((e.media || []).flatMap(m => [m.file, m.poster]).filter(Boolean))];
    for (const f of [...files, "entity.json"]) {
      const p = join(root, id, f), key = `entities/${id}/${f}`, h = hash(p);
      if (done[key] === h) continue;
      const json = f === "entity.json";
      put(key, p, json ? "application/json" : MIME[extOf(f)] || "application/octet-stream", json ? "public, max-age=60" : "public, max-age=31536000, immutable");
      done[key] = h; sent++;
      writeFileSync(MANIFEST, JSON.stringify(done, null, 2));
      console.log("put " + key);
    }
  }
  const index = join(root, "..", "index.json");
  writeFileSync(index, JSON.stringify({ schema: 1, ids }, null, 2) + "\n");
  put("entities/index.json", index, "application/json", "public, max-age=60");
  console.log(`synced ${ids.length} entities, ${sent} files uploaded, index.json written`);
} else {
  console.log("usage: node scripts/entities.mjs probe|check|sync [dir]");
  process.exit(2);
}
