// Interior layout: the open entity's board pieces (title, meta, paragraphs, media) and the frame values
// (header, edge labels, bar, drawer) the view renders from. Placement itself is placement.ts.
import type Field from "../Field";
import type { FieldNode, State } from "../types";
import type { notesVals } from "../notes";
import { key, type KeyHandler } from "../util";
import { plate } from "../plate";
import { mediaUrl } from "@/lib/media/url";
import { liveMedia, rendererFor } from "@/lib/media/registry";
import { clampN, DIRS, type Dir, type Item, type MetaField, type Tab } from "./state";
import { NARROW, resolve } from "./placement";
import { neighbour } from "./neighbours";
import { goNeighbour, setDrawer } from "./lifecycle";

const ARROW = { up: "↑", right: "→", down: "↓", left: "←" };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
// Line count from an average glyph advance of k em: an estimate, so a piece's row span errs a little tall.
const lines = (s: string, w: number, fs: number, k = 0.5) => Math.max(1, Math.ceil((s.length * fs * k) / Math.max(40, w)));
const fileOf = (m: FieldNode["media"][number], i: number) => m.file || (m.img || m.src || "").split("/").pop() || String(i);

export type Edge = { dir: Dir; on: boolean; arrow?: string; title?: string; sub?: string; go?: () => void; key?: KeyHandler };
type NotesHere = ReturnType<typeof notesVals>["notesHere"];
type Passing = { name: string; go: () => void; key: KeyHandler };

// notes are the open entity's notesVals().notesHere, shown in the drawer's traces tab.
export function interiorVals(f: Field, st: State, notes: NotesHere): { interior: InteriorView | null; onElsewhere?: () => void; onElsewhereKey?: KeyHandler } {
  const o: FieldNode | null = st.open ? f.byId(st.open) : null;
  if (!o) return { interior: null };
  return buildInterior(f, st, o, notes);
}

export type InteriorView = ReturnType<typeof buildInterior>["interior"];

function buildInterior(f: Field, st: State, o: FieldNode, notesHere: NotesHere) {
  const W = window.innerWidth, H = window.innerHeight, narrow = W < NARROW;
  const media = o.media || [], live = liveMedia(o);
  const firstImage = media.findIndex(m => !!m.img && !rendererFor(m.kind));
  const thumbAt = o.thumb ? media.findIndex(m => m.img === o.thumb) : -1;
  // The card's own picture leads: its playing video when the card plays one, else its still, else the first image.
  const heroAt = live && !o.thumb ? live.index : thumbAt > -1 ? thumbAt : firstImage > -1 ? firstImage : live ? live.index : -1;

  const tfs = narrow ? 34 : Math.round(clampN(W * 0.04, 42, 64)), pfs = narrow ? 15 : 16.5;
  // caption row under a picture (the kind label shows even without a caption) plus the mat border
  const capH = (cap: string, w: number) => 17 + lines(cap || " ", w - 70, 13.5, 0.46) * 20;
  const stamp = (o.tags.length ? o.tags.slice(0, 3).join(" · ") : o.k).replace(/-/g, " ");
  // Unknown fields are left out rather than shown as "undated" or "unplaced".
  const meta: MetaField[] = ([["date", o.y], ["place", o.place], ["creator", o.src], ["kind", o.k]] as const).filter(r => !!r[1]).map(([k, v]) => ({ k, v }));
  const title: Item = { key: "title", ref: "title", kind: "title", cols: 6, tall: w => 28 + lines(o.t, w, tfs, 0.5) * tfs * 1.06, data: { stamp, title: o.t, fs: tfs } };
  const strip: Item = { key: "meta", ref: "meta", kind: "meta", cols: 5, tall: w => Math.ceil(meta.length / Math.max(1, Math.floor(w / 150))) * 58 + 14, data: { fields: meta } };

  const shown: Item[] = [];
  media.forEach((m, i) => {
    const ref = "media:" + fileOf(m, i);
    if (rendererFor(m.kind)) {
      // only the live element has a slot; other playable media wait for a renderer
      if (live && live.index === i) shown.push({ key: "m" + i, ref, kind: "video", cols: 7, tall: w => w * 0.5625 + capH(m.cap, w), data: { kind: m.kind, cap: m.cap }, at: m.at });
      return;
    }
    const ar = m.ar || 0.72, img = m.img ? mediaUrl(m.img) : null;
    shown.push({
      key: "m" + i, ref, kind: "media", cols: ar > 1.05 ? 4 : 5, tall: w => w * ar + capH(m.cap, w), at: m.at,
      data: { kind: m.kind, cap: m.cap, imgCss: img ? "url(" + img + ")" : null, ar, focal: m.focal ? m.focal[0] * 100 + "% " + m.focal[1] * 100 + "%" : "center" },
    });
  });
  // The generated line-art plate is only a stand-in: an entity with its own images or video goes without it.
  const hero: Item | null = heroAt > -1 ? shown.find(s => s.key === "m" + heroAt) || null
    : { key: "plate", ref: "plate", kind: "plate", cols: 5, tall: (w: number) => w * 0.62 + 30, data: { plate: plate(o), stamp: o.k + (o.y ? " · " + o.y : "") } };
  const paras: Item[] = o.p.map((t, i) => ({ key: "p" + i, ref: "p:" + i, kind: "para", cols: 4, tall: w => lines(t, w, pfs, 0.5) * pfs * 1.68 + 6, data: { t, fs: pfs } }));
  // Default reading order: title, meta, hero, then paragraphs and media interleaved, leftover media last.
  const rest = shown.filter(s => s !== hero), items: Item[] = [title, strip, ...(hero ? [hero] : [])];
  for (let i = 0; i < Math.max(paras.length, rest.length); i++) {
    if (paras[i]) items.push(paras[i]);
    if (rest[i]) items.push(rest[i]);
  }

  const ix = f.ix;
  const dims = W + "x" + H, lk = o.id + ":" + dims;
  if (ix.layoutKey !== lk || !ix.layout) { ix.layout = resolve(o.layout, items, W, H, hero ? hero.key : null); ix.layoutKey = lk; }
  const lay = ix.layout;
  ix.comp = { id: o.id, dims, w: lay.w, h: lay.h, focus: lay.focus };

  const edges: Edge[] = DIRS.map(dir => {
    const n = neighbour(f, o.id, dir), to = n ? f.byId(n.id) : null;
    if (!n || !to) return { dir, on: false };
    const go = () => { goNeighbour(f, dir); f.tick(); };
    return { dir, on: true, arrow: ARROW[dir], title: clip(to.t, 24), sub: n.walk ? "walk · " + clip(n.walk, 18) : [to.k, to.y].filter(Boolean).join(" · "), go, key: key(go) };
  });

  const p = f.passingTrace();
  let passing: Passing | null = null;
  if (p) {
    const nextId = p.trace.steps[p.index + 1], go = () => { f.setState({ joined: p.trace.name }); f.leaveToward(nextId, "↓", false); };
    passing = { name: p.trace.name, go, key: key(go) };
  }
  const assoc = f.ASSOC.filter(a => (a[0] === o.id || a[1] === o.id) && f.byId(a[0] === o.id ? a[1] : a[0])).map(a => {
    const other = a[0] === o.id ? a[1] : a[0], go = () => f.leaveToward(other, "↓", true);
    return { reason: a[2], title: f.byId(other).t, go, key: key(go) };
  });
  const onElsewhere = () => {
    const others = f.OBJECTS.filter(q => q.id !== st.open), pick = others[Math.floor(Math.random() * others.length)];
    f.setState({ joined: null });
    f.leaveToward(pick.id, "⤳", false);
  };

  const tab = ix.drawer;
  const count = { facts: "", traces: notesHere.length ? String(notesHere.length) : "", related: assoc.length + (passing ? 1 : 0) ? String(assoc.length + (passing ? 1 : 0)) : "" };
  const tabs = (["facts", "traces", "related"] as Tab[]).map(id => {
    const go = () => setDrawer(f, f.ix.drawer === id ? null : id);
    return { id, n: count[id], on: tab === id, go, key: key(go) };
  });
  const record = o.facts || [{ k: "medium", v: o.k }, { k: "source", v: o.src }, { k: "tags", v: o.tags.slice(0, 5).join(" · ") }].filter(r => r.v);
  const lead = o.thumb || (firstImage > -1 ? media[firstImage].img : undefined);
  const onClose = () => f.collapse(), onDrawerClose = () => setDrawer(f, null);

  const interior = {
    ref: "[a}morf · " + String(f.OBJECTS.indexOf(o) + 1).padStart(3, "0") + " / " + f.OBJECTS.length,
    w: lay.w, h: lay.h, narrow,
    pieces: items.filter(it => lay.pos[it.key]).map(it => {
      const b = lay.pos[it.key];
      return { key: it.key, x: b.x, y: b.y, w: b.w, h: b.crop ? b.h : null, z: b.z, item: it };
    }),
    edges, tabs, drawer: tab,
    facts: [...meta.filter(r => r.k === "date" || r.k === "place"), ...record], links: o.links || [],
    notes: notesHere, passing, assoc, thumbCss: lead ? "url(" + mediaUrl(lead) + ")" : null,
    onClose, onCloseKey: key(onClose), onDrawerClose, onDrawerCloseKey: key(onDrawerClose),
  };
  return { interior, onElsewhere, onElsewhereKey: key(onElsewhere) };
}
