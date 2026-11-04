#!/usr/bin/env node
// Builds the research index from frontmatter: research/INDEX.md, research/index.json,
// and the Research table of each ontology part hub. `--check` writes nothing and exits 1
// when any output is stale or an item is invalid.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Paths in outputs and messages are relative to research/, the folder this script indexes.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "research");
const ONTOLOGY = join(ROOT, "theory/ontology");
const KINDS = [
  { kind: "study", dir: "studies", prefix: "STU" },
  { kind: "experiment", dir: "experiments", prefix: "EXP" },
];
const STATUSES = ["planned", "running", "done", "abandoned"];
const START = "<!-- research:index -->";
const END = "<!-- /research:index -->";
const check = process.argv.includes("--check");
const errors = [];

// Reads flat `key: value`, inline `[a, b]` lists and block lists (`key:` then `  - item` lines).
function frontmatter(text) {
  const m = text.replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  let listKey = null;
  // A quoted value ends at its closing quote (`\"` and `''` are escapes); a plain one at a ` #` comment.
  const scalar = (raw) => {
    const d = raw.match(/^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/);
    if (d) return d[1].replace(/\\(.)/g, "$1");
    const q = raw.match(/^'((?:[^']|'')*)'\s*(?:#.*)?$/);
    return q ? q[1].replace(/''/g, "'") : raw.replace(/\s+#.*$/, "").trim();
  };
  for (const line of m[1].split("\n")) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && listKey) { out[listKey].push(scalar(item[1].trim())); continue; }
    listKey = null;
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const v = scalar(kv[2].trim());
    if (v === "") { out[kv[1]] = []; listKey = kv[1]; }
    else if (v.startsWith("[") && v.endsWith("]")) out[kv[1]] = v.slice(1, -1).split(",").map((x) => scalar(x.trim())).filter(Boolean);
    else out[kv[1]] = v;
  }
  return out;
}

// Part order follows the ontology README table, so the index reads in the same order as the ontology.
function loadParts() {
  const readme = readFileSync(join(ONTOLOGY, "README.md"), "utf8");
  const order = [...readme.matchAll(/^\| \[([a-z-]+)\]\(\1\.md\) \|/gm)].map((m) => m[1]);
  const parts = [];
  for (const slug of order) {
    const file = join(ONTOLOGY, `${slug}.md`);
    const fm = existsSync(file) && frontmatter(readFileSync(file, "utf8"));
    if (!fm || fm.part !== slug) errors.push(`theory/ontology/${slug}.md: missing or has no \`part: ${slug}\``);
    else parts.push({ slug, title: fm.title, file });
  }
  return parts;
}

function loadItems(partSlugs) {
  const items = [];
  const seen = new Set();
  for (const { kind, dir, prefix } of KINDS) {
    const base = join(ROOT, dir);
    if (!existsSync(base)) continue;
    const folders = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const folder of folders) {
      const m = folder.match(/^(\d{4})-/);
      if (!m || m[1] === "0000") continue;
      const path = join(base, folder, "README.md");
      const rel = relative(ROOT, path);
      if (!existsSync(path)) { errors.push(`${rel}: numbered folder has no README.md`); continue; }
      const fm = frontmatter(readFileSync(path, "utf8"));
      if (!fm) { errors.push(`${rel}: no frontmatter`); continue; }
      const id = `${prefix}-${m[1]}`;
      if (fm.id !== id) errors.push(`${rel}: id is ${fm.id}, folder says ${id}`);
      if (seen.has(id)) errors.push(`${rel}: duplicate id ${id}`);
      seen.add(id);
      for (const k of ["title", "date", "question"]) if (!fm[k]) errors.push(`${rel}: missing ${k}`);
      if (!STATUSES.includes(fm.status)) errors.push(`${rel}: status must be one of ${STATUSES.join(", ")}, got "${fm.status ?? ""}"`);
      if (!Array.isArray(fm.parts) || !fm.parts.length) errors.push(`${rel}: parts must be a non-empty list`);
      const parts = Array.isArray(fm.parts) ? fm.parts : [];
      for (const p of parts) if (!partSlugs.includes(p)) errors.push(`${rel}: unknown part "${p}"`);
      items.push({ id, kind, title: fm.title ?? "", date: fm.date ?? "", status: fm.status ?? "", parts, question: fm.question ?? "", tags: Array.isArray(fm.tags) ? fm.tags : [], path: rel });
    }
  }
  return items;
}

const cell = (s) => String(s).replace(/\|/g, "\\|");
function table(items, fromDir, currentPart) {
  if (!items.length) return "None yet.";
  const rows = items.map((i) => {
    const link = relative(fromDir, join(ROOT, i.path));
    const also = i.parts.filter((p) => p !== currentPart).join(", ");
    return `| [${i.id}](${link}) | ${cell(i.title)} | ${i.kind} | ${i.status} | ${i.date} | ${also} |`;
  });
  return ["| Id | Title | Kind | Status | Date | Also in |", "| --- | --- | --- | --- | --- | --- |", ...rows].join("\n");
}

const parts = loadParts();
const items = loadItems(parts.map((p) => p.slug));
const outputs = new Map();

const sections = parts.map((p) => `## [${p.title}](theory/ontology/${p.slug}.md)\n\n${table(items.filter((i) => i.parts.includes(p.slug)), ROOT, p.slug)}`);
outputs.set(join(ROOT, "INDEX.md"), `# Research index\n\nGenerated by \`pnpm research:index\` from the frontmatter of every study and experiment. Do not edit by hand. Grouped by ontology part; an item filed under several parts appears under each.\n\n${sections.join("\n\n")}\n`);
outputs.set(join(ROOT, "index.json"), JSON.stringify({ parts: parts.map(({ slug, title }) => ({ slug, title })), items }, null, 2) + "\n");

for (const p of parts) {
  const text = readFileSync(p.file, "utf8");
  const a = text.indexOf(START), b = text.indexOf(END);
  if (text.split(START).length !== 2 || text.split(END).length !== 2 || b < a) { errors.push(`theory/ontology/${p.slug}.md: needs exactly one ${START} … ${END} marker pair, in that order`); continue; }
  const body = table(items.filter((i) => i.parts.includes(p.slug)), ONTOLOGY, p.slug);
  outputs.set(p.file, `${text.slice(0, a + START.length)}\n${body}\n${text.slice(b)}`);
}

const stale = [...outputs].filter(([f, c]) => !existsSync(f) || readFileSync(f, "utf8") !== c).map(([f]) => relative(ROOT, f));
// Invalid items never reach the outputs: a failed run leaves the last good index in place.
if (!check && !errors.length) for (const [f, c] of outputs) if (stale.includes(relative(ROOT, f))) writeFileSync(f, c);

for (const e of errors) console.error(`error: ${e}`);
if (check && stale.length) console.error(`stale, run pnpm research:index: ${stale.join(", ")}`);
else console.log(check ? "research index up to date" : `research index: ${items.length} items, ${parts.length} parts, ${stale.length} files written`);
if (errors.length || (check && stale.length)) process.exit(1);
