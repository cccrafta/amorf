// Interior layout: the open entity's pieces (built from its template, split into board and float layers) and the
// frame values (header, edge labels, bar, drawer) the view renders from. Placement itself is placement.ts.
import type Field from "../Field";
import type { FieldNode, State } from "../types";
import { TRACES_ENABLED, type notesVals } from "../notes";
import { key, type KeyHandler } from "../util";
import { mediaUrl } from "@/lib/media/url";
import { liveMedia, rendererFor } from "@/lib/media/registry";
import { preload, preloadLater } from "@/lib/media/preload";
import { clampN, DIRS, FLOAT, type Dir, type Item, type Layout, type Tab } from "./state";
import { NARROW, resolve } from "./placement";
import { neighbour } from "./neighbours";
import { goNeighbour, setDrawer } from "./lifecycle";
import { limits } from "./physics";
import { buildPieces } from "./pieces";

const ARROW = { up: "↑", right: "→", down: "↓", left: "←" };
// Still pictures and video posters; the playable stream itself loads through its renderer.
const urlsOf = (o: FieldNode) => (o.media || []).flatMap(m => (m.img && !rendererFor(m.kind) ? [mediaUrl(m.img)] : m.poster ? [mediaUrl(m.poster)] : []));
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export type Edge = { dir: Dir; on: boolean; arrow?: string; title?: string; sub?: string; go?: () => void; key?: KeyHandler; peek?: Preview | null };
type NotesHere = ReturnType<typeof notesVals>["notesHere"];
type Passing = { name: string; go: () => void; key: KeyHandler };

// notes are the open entity's notesVals().notesHere, shown in the drawer's traces tab.
export function interiorVals(f: Field, st: State, notes: NotesHere): { interior: InteriorView | null; onElsewhere?: () => void; onElsewhereKey?: KeyHandler } {
  const o: FieldNode | null = st.open ? f.byId(st.open) : null;
  if (!o) return { interior: null };
  return buildInterior(f, st, o, notes);
}

export type InteriorView = ReturnType<typeof buildInterior>["interior"];

// An entity's pieces split into board and float layers, placed. Shared by the open board and the slide preview, so the
// preview is the same board the switch reveals; layouts are cached per entity and viewport (placement is deterministic).
const layouts = new Map<string, Layout>();
function boardOf(o: FieldNode, W: number, H: number) {
  const narrow = W < NARROW, media = o.media || [], live = liveMedia(o);
  const firstImage = media.findIndex(m => !!m.img && !rendererFor(m.kind));
  const thumbAt = o.thumb ? media.findIndex(m => m.img === o.thumb) : -1;
  // The card's own picture leads: its playing video when the card plays one, else its still, else the first image.
  const heroAt = live && !o.thumb ? live.index : thumbAt > -1 ? thumbAt : firstImage > -1 ? firstImage : live ? live.index : -1;

  const all = buildPieces({ o, W, narrow, heroAt, live: live ? live.index : null });
  const heroKey = heroAt > -1 ? "m" + heroAt : all.some(p => p.key === "plate") ? "plate" : null;
  const hero = all.find(p => p.key === heroKey) || null;
  // On narrow screens there is no float column: its pieces lead the vertical stack instead.
  const floats = narrow ? [] : all.filter(p => p.layer === "float");
  const boardOnly = all.filter(p => p.layer === "board" && p !== hero);
  const items: Item[] = [...(narrow ? all.filter(p => p.layer === "float") : []), ...(hero ? [hero] : []), ...boardOnly];
  // Estimated from each piece's tall(): the fade and its expand only show when the text is longer than the resting height.
  const floatOverflow = floats.reduce((h, p) => h + p.tall(FLOAT.w) + 22, 36) > H * FLOAT.rest;
  const lk = o.id + ":" + W + "x" + H;
  const lay = layouts.get(lk) ?? resolve(o.layout, items, W, H, heroKey);
  layouts.set(lk, lay);
  const pieces = items.filter(it => lay.pos[it.key]).map(it => {
    const b = lay.pos[it.key];
    return { key: it.key, x: b.x, y: b.y, w: b.w, h: b.crop ? b.h : null, z: b.z, enter: b.enter, item: it };
  });
  return { narrow, media, firstImage, floats, floatOverflow, lay, pieces };
}
export type Placed = ReturnType<typeof boardOf>["pieces"][number];

function buildInterior(f: Field, st: State, o: FieldNode, notesHere: NotesHere) {
  const W = window.innerWidth, H = window.innerHeight;
  const { narrow, media, firstImage, floats, floatOverflow, lay, pieces } = boardOf(o, W, H);
  const meta = ([["date", o.y], ["place", o.place]] as const).filter(r => !!r[1]).map(([k, v]) => ({ k, v: v as string }));

  const ix = f.ix;
  if (ix.floatFor !== o.id) { ix.floatFor = o.id; ix.floatOpen = false; ix.menu = false; ix.scrollPanel = false; }
  const dims = W + "x" + H, lk = o.id + ":" + dims;
  if (ix.layoutKey !== lk || !ix.layout) {
    ix.layout = lay; ix.layoutKey = lk;
    // this entity's pictures first, then those of every place a move can land (neighbours, related, the unrelated pick), so the move finds them decoded
    urlsOf(o).forEach(preload);
    const others = f.OBJECTS.filter(q => q.id !== o.id);
    ix.elsewhere = others.length ? others[Math.floor(Math.random() * others.length)].id : "";
    const reach = [
      ...DIRS.map(d => neighbour(f, o.id, d)?.id),
      ...f.ASSOC.filter(a => a[0] === o.id || a[1] === o.id).map(a => (a[0] === o.id ? a[1] : a[0])),
      ix.elsewhere,
    ];
    preloadLater([...new Set(reach)].flatMap(id => { const to = id && f.byId(id); return to ? urlsOf(to) : []; }));
  }
  ix.comp = { id: o.id, dims, w: lay.w, h: lay.h, focus: lay.focus };

  const edges: Edge[] = DIRS.map(dir => {
    const n = neighbour(f, o.id, dir), to = n ? f.byId(n.id) : null;
    if (!n || !to) return { dir, on: false };
    const go = () => { goNeighbour(f, dir); f.tick(); };
    return { dir, on: true, peek: preview(f, n.id, W, H), arrow: ARROW[dir], title: clip(to.t, 24), sub: n.walk ? "walk · " + clip(n.walk, 18) : [to.k, to.y].filter(Boolean).join(" · "), go, key: key(go) };
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
    const pick = ix.elsewhere || f.OBJECTS.find(q => q.id !== st.open)?.id;
    if (!pick) return;
    f.setState({ joined: null });
    f.leaveToward(pick, "⤳", false);
  };

  const tab = ix.drawer;
  const count = { facts: "", traces: notesHere.length ? String(notesHere.length) : "", related: assoc.length + (passing ? 1 : 0) ? String(assoc.length + (passing ? 1 : 0)) : "" };
  const tabs = ((TRACES_ENABLED ? ["facts", "traces", "related"] : ["facts", "related"]) as Tab[]).map(id => {
    const go = () => { ix.menu = false; setDrawer(f, f.ix.drawer === id ? null : id); };
    return { id, n: count[id], on: tab === id, go, key: key(go) };
  });
  const record = o.facts || [{ k: "medium", v: o.k }, { k: "source", v: o.src }, { k: "tags", v: o.tags.slice(0, 5).join(" · ") }].filter(r => r.v);
  const lead = o.thumb || (firstImage > -1 ? media[firstImage].img : undefined);
  const onClose = () => f.collapse(), onDrawerClose = () => setDrawer(f, null);
  const onFloat = () => { ix.floatOpen = !ix.floatOpen; f.forceUpdate(); };
  const onMenu = () => { ix.menu = !ix.menu; f.forceUpdate(); };
  const closeMenu = () => { ix.menu = false; };
  const onScrollPanel = () => { ix.scrollPanel = !ix.scrollPanel; ix.menu = false; f.forceUpdate(); };
  const rerender = () => f.forceUpdate();

  const sl = ix.slide;
  const interior = {
    slide: sl ? { key: sl.to + ":" + sl.start, dir: sl.dir, r0: sl.r0, fade: !sl.dir || f.reduced, p: preview(f, sl.to, W, H) } : null,
    ref: "[a}morf · " + String(f.OBJECTS.indexOf(o) + 1).padStart(3, "0") + " / " + f.OBJECTS.length,
    w: lay.w, h: lay.h, narrow, entity: o.id, reduced: f.reduced, unfold: ix.slid !== o.id,
    pieces,
    floats, floatOpen: ix.floatOpen, floatOverflow, onFloat, onFloatKey: key(onFloat),
    menu: ix.menu, onMenu, onMenuKey: key(onMenu), closeMenu,
    scrollPanel: ix.scrollPanel, onScrollPanel, onScrollPanelKey: key(onScrollPanel), rerender,
    edges, tabs, drawer: tab,
    facts: [...meta, ...record], links: o.links || [],
    notes: notesHere, passing, assoc, thumbCss: lead ? "url(" + mediaUrl(lead) + ")" : null,
    onClose, onCloseKey: key(onClose), onDrawerClose, onDrawerCloseKey: key(onDrawerClose),
  };
  return { interior, onElsewhere, onElsewhereKey: key(onElsewhere) };
}

// An entity's board exactly as it first opens, for the slide between entities: its pieces at the pan glide() starts a
// new board at (zoom 1, centred on the focus) and its text overlay at rest. The switch then reveals the same picture.
export type Preview = NonNullable<ReturnType<typeof preview>>;
function preview(f: Field, id: string, W: number, H: number) {
  const o: FieldNode | null = f.byId(id);
  if (!o) return null;
  const b = boardOf(o, W, H), { lay } = b;
  const { loX, loY, hiX, hiY } = limits({ id, dims: W + "x" + H, w: lay.w, h: lay.h, focus: lay.focus });
  return {
    key: id + ":" + W + "x" + H, w: lay.w, h: lay.h,
    x: clampN(W / 2 - lay.focus.x, loX, hiX), y: clampN(H / 2 - lay.focus.y, loY, hiY),
    pieces: b.pieces, floats: b.floats, floatOverflow: b.floatOverflow,
  };
}
