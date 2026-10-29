'use client';

// Field core: instance state, lifecycle, the per-frame camera/card pass, and the render shell; feature logic lives in sibling modules.
import React from "react";
import {
  OBJECTS as OBJECTS_DATA,
  ASSOC as ASSOC_DATA,
  NOTE_SEED as NOTE_SEED_DATA,
  SEEDED_WALKS,
  type FieldAssoc,
  type FieldNoteSeed,
} from "@/lib/field-data";
import "@/lib/media/video";
import { liveMedia } from "@/lib/media/registry";
import * as pool from "@/lib/media/pool";
import type { FieldNode, FieldNote, NoteMark, Props, State, TableMetrics, V, Vals, Walk } from "./types";
import { rand, smooth, wrap, key } from "./util";
import { plate, scribble } from "./plate";
import { yearLabel, gap } from "./chronology";
import * as wear from "./wear";
import * as tracks from "./tracks";
import * as nav from "./navigation";
import * as inputs from "./input";
import * as notes from "./notes";
import * as plan from "./plan";
import * as table from "./table";
import { syncMedia } from "./media";
import { catalogueVals } from "./catalogue";
import { notesVals, composeVals, viewVals } from "./notes";
import { planVals } from "./plan";
import { tableVals } from "./table";
import { renderMediaStage, renderStage } from "./ui/stage";
import { renderHud, renderJump, renderFocusbar, renderHint, renderOthers } from "./ui/hud";
import { renderTraceRail, renderJourneybar } from "./ui/trace";
import { renderDetail } from "./ui/detail";
import { renderCatalogue } from "./ui/catalogue";
import { renderView, renderCompose } from "./ui/notes";
import { renderPlan } from "./ui/plan";
import { renderTable } from "./ui/table";
import { renderNaming } from "./ui/naming";

export default class Field extends React.Component<Props, State> {
  OBJECTS: FieldNode[] = OBJECTS_DATA as FieldNode[];
  ASSOC: FieldAssoc[] = ASSOC_DATA;
  NOTE_SEED: FieldNoteSeed[] = NOTE_SEED_DATA;

  TILE = 6200;
  FAR = 2700;
  NEARC = 130;
  P = 900;
  SPREAD_Y = 260;

  state: State = {
    focus: null,
    open: null,
    trace: [],
    cursor: -1,
    query: "",
    askOpen: false,
    narrow: false,
    compose: null,
    view: null,
    noteTxt: "",
    noteRev: 0,
    notesOpen: false,
    hand: null,
    tracksOn: true,
    catalogue: false,
    filter: null,
    hoverJourney: null,
    naming: false,
    nameValue: "",
    seeded: SEEDED_WALKS,
    joined: null,
    plan: false,
    planHover: null,
    tableOpen: false,
    table: [],
    bindName: "",
    tableNote: null,
    kept: {},
  };

  cam = { x: 0, z: 0, tx: 0, tz: 0, yaw: 0, tyaw: 0 };
  els: Record<string, HTMLElement> = {};
  visited: Record<string, boolean> = {};
  screenPos: Record<string, { sx: number; sy: number }> = {};
  navCount = 0;
  lastFriction = true;
  timers: ReturnType<typeof setTimeout>[] = [];
  seenByQuery: Record<string, string[]> = {};
  tablePos: Record<string, { x: number; y: number }> = {};
  visits: Record<string, number> = {};
  wearBase: Record<string, number> = {};
  cloudCache: Record<string, NoteMark[]> = {};
  pointer: { x: number; y: number } | null = null;
  pointerAt = 0;
  pendingMark: string | null = null;
  wantFocus: boolean | null = null;
  NOTES: FieldNote[] = [];
  paperStrokes: { w: number; pts: [number, number][] }[] = [];
  paperW = 1.8;
  paperImg: string | null = null;

  // Lazily assigned in componentDidMount/resolve/frame — declared here so the
  // rest of the port (a straight mechanical read of assignment sites) needs no
  // further type surgery.
  reduced = false;
  onKey?: (e: KeyboardEvent) => void;
  onResize?: () => void;
  resolveTimer: ReturnType<typeof setInterval> | null = null;
  lastT = 0;
  tick!: () => void;
  world: HTMLElement | null = null;
  hudDepth: HTMLElement | null = null;
  hudYaw: HTMLElement | null = null;
  hudGrid: HTMLElement | null = null;
  hint: HTMLElement | null = null;
  input: HTMLInputElement | null = null;
  tracks: SVGSVGElement | null = null;
  stage: HTMLElement | null = null;
  paper: HTMLCanvasElement | null = null;
  paperCtx: CanvasRenderingContext2D | null = null;
  paperFit: (() => void) | null = null;
  drawing: { w: number; pts: [number, number][] } | null = null;
  drag: { id: number; x: number; y: number; moved: number; captured: boolean } | null = null;
  narrow = false;
  lastW = -1;
  hintGone = false;
  hintW: number | undefined = undefined;
  wearRev = 0;
  trackKey: string | null = null;
  trackEls: Record<string, SVGPathElement> | null = null;
  hueMap: Record<string, string> | undefined;
  hueNext = 0;
  filterSet: Set<string> | null = null;
  panelWant = 0;
  panelT = 0;
  sheetT = 0;
  lift = 0;
  liftWant = 0;
  liftDir = -1;
  liftIdleAt = 0;
  committing = false;
  committed = false;
  edgeSince = 0;
  closeQueued = false;
  wheelBlockUntil = 0;
  suppressClick = 0;
  standAt: { x: number; z: number } | null = null;
  lastStandX?: number;
  lastStandZ?: number;
  frameW: Record<string, number> = {};
  keepClear: { l: number; r: number; t: number; b: number; ramp: number }[] = [];
  keepClearRail = 0;
  noteTimer: ReturnType<typeof setTimeout> | null = null;
  jumpTimer: ReturnType<typeof setTimeout> | null = null;
  nodes: any[] | null = null;
  onGesture?: () => void;
  mediaStage: HTMLElement | null = null;
  mediaSlot: HTMLElement | null = null;
  mediaStageKey = "";
  // 0..1 world-distance closeness per object, written by frame() regardless of whether the card is drawn.
  near: Record<string, number> = {};

  byId(id: string): FieldNode {
    return this.OBJECTS.find(o => o.id === id) as FieldNode;
  }
  later(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    this.timers.push(t);
    return t;
  }

  recomputeWear() { wear.recomputeWear(this); }
  wearOf(id: string): number { return wear.wearOf(this, id); }
  cloudFor(id: string, wr: number) { return wear.cloudFor(this, id, wr); }

  placePlanLabels() { plan.placePlanLabels(this); }

  tableMetrics(): TableMetrics { return table.tableMetrics(); }
  clampTable(p: { x: number; y: number }, m?: TableMetrics) { return table.clampTable(this, p, m); }
  tableSlots() { return table.tableSlots(this); }
  seedTablePos(id: string, n: number) { return table.seedTablePos(this, id, n); }
  toggleAside(id: string) { table.toggleAside(this, id); }
  tableDown(id: string) { return table.tableDown(this, id); }
  bindTable = () => table.bindTable(this);
  openFlat(w: Walk) { return table.openFlat(this, w); }

  componentDidMount() {
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cols = Math.ceil(Math.sqrt(this.OBJECTS.length));
    const cell = this.TILE / cols;
    const order = this.OBJECTS.map((o, i) => i).sort((a, b) => rand(this.OBJECTS[a].id + "o") - rand(this.OBJECTS[b].id + "o"));
    order.forEach((oi, slot) => {
      const o = this.OBJECTS[oi];
      const gx = slot % cols, gz = Math.floor(slot / cols);
      o.hx = (gx + 0.5 + (rand(o.id + "jx") - 0.5) * 0.5) * cell;
      o.hz = (gz + 0.5 + (rand(o.id + "jz") - 0.5) * 0.5) * cell;
    });
    this.NOTES = [];
    this.NOTE_SEED.forEach(s => this.NOTES.push({ id: s.id, obj: s.obj, by: s.by, walk: s.walk, txt: s.txt, kind: "trace", marks: scribble("sk" + s.id) }));
    this.OBJECTS.forEach(o => (o.notes || []).forEach((n, i) => this.NOTES.push({
      id: o.id + "w" + i, obj: o.id, by: (n.by || "").replace("annotation · ", ""), walk: null, txt: n.txt, kind: "written", marks: []
    })));
    this.recomputeWear();
    this.onKey = (e: KeyboardEvent) => this.keydown(e);
    window.addEventListener("keydown", this.onKey);
    // Browsers grant unmuted playback only after a gesture; the first one unlocks every live element.
    this.onGesture = () => { this.dropGesture(); pool.unlockAll(); };
    window.addEventListener("pointerdown", this.onGesture, true);
    window.addEventListener("keydown", this.onGesture, true);
    this.onResize = () => {
      this.lastW = -1; this.layout(); this.tick();
      if (this.paperFit) this.paperFit();
      if (this.state.plan) this.placePlanLabels();
      if (this.state.table.length) {
        const m = this.tableMetrics();
        this.state.table.forEach(id => { if (this.tablePos[id]) this.tablePos[id] = this.clampTable(this.tablePos[id], m); });
        if (this.state.tableOpen) this.forceUpdate();
      }
    };
    window.addEventListener("resize", this.onResize);
    this.resolve();
    this.resolveTimer = setInterval(() => this.resolve(), 250);
    this.lastT = performance.now();
    this.tick = () => { try { this.frame(); } catch (err) {} };
    window.__amorfActive = this;
    this.startLoop();
    this.tick();
    this.forceUpdate();
  }

  // Hosts throttle rAF and intervals unevenly, and a remount can orphan a
  // timer. One loop owned by the window, always driving whichever instance is
  // live, plus a watchdog that restarts it if frames stop arriving.
  startLoop() {
    if (window.__amorfLoop) clearInterval(window.__amorfLoop);
    if (window.__amorfRaf) cancelAnimationFrame(window.__amorfRaf);
    if (window.__amorfWatch) clearInterval(window.__amorfWatch);
    const drive = () => { const A = window.__amorfActive; if (A && A.tick) A.tick(); };
    const rafTick = () => { window.__amorfRafSeen = performance.now(); drive(); window.__amorfRaf = requestAnimationFrame(rafTick); };
    window.__amorfRaf = requestAnimationFrame(rafTick);
    window.__amorfLoop = setInterval(() => { if (performance.now() - (window.__amorfRafSeen || 0) > 24) drive(); }, 1000 / 60);
    window.__amorfWatch = setInterval(() => {
      const A = window.__amorfActive;
      if (A && A.lastT && performance.now() - A.lastT > 500) A.startLoop();
    }, 500);
  }

  componentDidUpdate() {
    window.__amorfActive = this;
    if (this.state.filter && !this.filterSet) {
      const w = this.state.seeded.find(s => s.name === this.state.filter);
      this.filterSet = w ? new Set(w.steps) : null;
    }
    this.resolve(); this.lastW = -1; this.layout(); this.tick();
    if (this.state.plan) this.placePlanLabels();
  }

  dropGesture() {
    if (!this.onGesture) return;
    window.removeEventListener("pointerdown", this.onGesture, true);
    window.removeEventListener("keydown", this.onGesture, true);
    this.onGesture = undefined;
  }

  componentWillUnmount() {
    if (this.resolveTimer) clearInterval(this.resolveTimer);
    if (window.__amorfActive === this) {
      window.__amorfActive = null;
      if (window.__amorfLoop) clearInterval(window.__amorfLoop);
      if (window.__amorfWatch) clearInterval(window.__amorfWatch);
      if (window.__amorfRaf) cancelAnimationFrame(window.__amorfRaf);
    }
    this.timers.forEach(clearTimeout);
    if (this.onKey) window.removeEventListener("keydown", this.onKey);
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    this.dropGesture();
    pool.releaseAll();
  }

  resolve() {
    const q = (r: string) => document.querySelector<HTMLElement>('[data-role="' + r + '"]');
    this.world = this.world || q("world");
    this.hudDepth = this.hudDepth || q("hud-depth");
    this.hudYaw = this.hudYaw || q("hud-yaw");
    this.hudGrid = this.hudGrid || q("hud-grid");
    this.hint = this.hint || q("hint");
    this.input = this.input || (q("ask") as HTMLInputElement | null);
    if (this.input && this.wantFocus) { this.wantFocus = false; this.input.focus(); }

    const scroller = document.querySelector<HTMLElement>('[data-role="pagescroll"]');
    if (scroller && (scroller as any).__amorfBound !== this) {
      (scroller as any).__amorfBound = this;
      scroller.addEventListener("wheel", (e: WheelEvent) => {
        const dxRaw = e.shiftKey ? e.deltaY : e.deltaX;
        if (Math.abs(dxRaw) <= Math.abs(e.deltaY) && !e.shiftKey) { this.liftIdleAt = performance.now(); return; }
        if (!dxRaw) return;
        e.preventDefault();
        const now = performance.now();
        this.liftDir = dxRaw > 0 ? -1 : 1;
        this.liftWant = Math.min(1, (this.liftWant || 0) + Math.abs(dxRaw) * 0.0024);
        this.liftIdleAt = now;
        if (this.liftWant >= 0.55) { this.committing = true; this.liftWant = 1; }
        this.tick();
      }, { passive: false });

      let sw: { x: number; y: number; lock: string | null } | null = null;
      scroller.addEventListener("touchstart", (e: TouchEvent) => {
        sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: null };
      }, { passive: true });
      scroller.addEventListener("touchmove", (e: TouchEvent) => {
        if (!sw) return;
        const t = e.touches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y;
        if (!sw.lock && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) sw.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (sw.lock !== "x") return;
        if (e.cancelable) e.preventDefault();
        this.liftDir = dx > 0 ? 1 : -1;
        this.liftWant = Math.min(1, Math.abs(dx) / (window.innerWidth * 0.38));
        this.liftIdleAt = performance.now() + 400;
        this.tick();
      }, { passive: false });
      scroller.addEventListener("touchend", () => {
        if (sw && sw.lock === "x") {
          if ((this.liftWant || 0) >= 0.5) { this.committing = true; this.liftWant = 1; }
          else { this.liftWant = 0; this.liftIdleAt = performance.now() - 1000; }
          this.tick();
        }
        sw = null;
      }, { passive: true });
    }

    this.tracks = this.tracks || (q("tracks") as unknown as SVGSVGElement | null);
    const paper = q("paper") as HTMLCanvasElement | null;
    if (paper && (paper as any).__amorfPaper !== this) { (paper as any).__amorfPaper = this; this.bindPaper(paper); }
    if (!paper) { this.paper = null; this.paperCtx = null; this.paperFit = null; }
    const stage = q("stage");
    if (stage && (stage !== this.stage || (stage as any).__amorfOwner !== this)) { this.stage = stage; (stage as any).__amorfOwner = this; this.bindStage(stage); }

    let n = 0;
    document.querySelectorAll<HTMLElement>("[data-obj]").forEach(el => {
      const id = el.getAttribute("data-obj");
      if (id && id.charAt(0) === "o") { this.els[id] = el; n++; }
    });
    if (n >= this.OBJECTS.length && this.world && this.stage && this.resolveTimer) { clearInterval(this.resolveTimer); this.resolveTimer = null; }
  }

  used() { inputs.used(this); }
  forward(dist: number) { inputs.forward(this, dist); }
  bindStage(el: HTMLElement) { inputs.bindStage(this, el); }
  keydown(e: KeyboardEvent) { inputs.keydown(this, e); }

  // One layout pass for narrow screens: the instruments are repositioned
  // rather than restyled, so the field keeps the whole viewport on a phone.
  layout() {
    const w = window.innerWidth, narrow = w < 760;
    if (this.narrow === narrow && this.lastW === w) return;
    this.narrow = narrow; this.lastW = w;
    const set = (sel: string, styles: Record<string, string>) => { const el = document.querySelector<HTMLElement>(sel); if (el) Object.assign(el.style, styles); };

    const rail = document.querySelector<HTMLElement>('[data-keepclear="40"]');
    if (rail) {
      Object.assign(rail.style, narrow
        ? { top: "auto", right: "0", bottom: "0", width: "auto", height: "74px", flexDirection: "row", alignItems: "stretch", borderRight: "none", borderTop: "1px solid rgba(168,176,173,0.14)" }
        : { top: "0", right: "", bottom: "0", width: "clamp(78px, 8vw, 112px)", height: "", flexDirection: "column", alignItems: "", borderRight: "1px solid rgba(168,176,173,0.14)", borderTop: "none" });
      const kids = rail.children;
      const head = kids[0] as HTMLElement, list = kids[1] as HTMLElement, tally = kids[2] as HTMLElement, leave = kids[3] as HTMLElement;
      if (head) head.style.display = narrow ? "none" : "block";
      if (list) Object.assign(list.style, narrow
        ? { flexDirection: "row", alignItems: "center", overflowX: "auto", overflowY: "hidden", padding: "0 12px", gap: "18px" }
        : { flexDirection: "column", alignItems: "", overflowX: "", overflowY: "auto", padding: "4px 10px 10px", gap: "8px" });
      if (tally) Object.assign(tally.style, narrow
        ? { display: "flex", alignItems: "center", flex: "0 0 auto", maxWidth: "116px", padding: "0 10px", borderLeft: "1px solid rgba(168,176,173,0.14)" }
        : { display: "block", flex: "", maxWidth: "", padding: "10px 10px 0", borderLeft: "none" });
      if (leave) Object.assign(leave.style, narrow
        ? { display: "flex", alignItems: "center", flex: "0 0 auto", padding: "0 14px", borderTop: "none", borderLeft: "1px solid rgba(168,176,173,0.14)" }
        : { display: "block", flex: "", padding: "12px 10px 18px", borderTop: "1px solid rgba(168,176,173,0.14)", borderLeft: "none" });
    }

    const railOn = this.state.trace.length > 0;
    const railW = rail && !narrow ? rail.getBoundingClientRect().width : 0;
    set('[data-role="journeybar"]', {
      left: (narrow ? 14 : (railOn ? railW + 22 : 24)) + "px",
      top: narrow ? "14px" : "22px",
      maxWidth: narrow ? "calc(100vw - 28px)" : "min(52vw, 520px)"
    });

    const bottomGap = narrow ? (this.state.trace.length ? 92 : 26) : 30;
    set('[data-role="focusbar"]', { bottom: bottomGap + "px" });
    const fb = document.querySelector<HTMLElement>('[data-role="focusbar"]');
    if (fb) {
      const oth = document.querySelector<HTMLElement>('[data-role="others"]');
      const ob = (oth && !narrow && getComputedStyle(oth).display !== "none") ? oth.getBoundingClientRect() : null;
      const bw = fb.getBoundingClientRect().width;
      const limit = ob ? ob.left - 18 : w;
      const floor = (railOn && !narrow ? railW : 0) + 16;
      if (bw && w / 2 + bw / 2 > limit) {
        Object.assign(fb.style, { left: Math.max(floor, Math.min(limit - bw, w - bw - 16)).toFixed(0) + "px", transform: "none" });
      } else {
        Object.assign(fb.style, { left: "50%", transform: "translateX(-50%)" });
      }
    }
    set('[data-role="hint"]', { bottom: (narrow ? bottomGap + 46 : 8) + "px", padding: narrow ? "0 18px" : "0" });
    set('[data-role="others"]', { display: narrow ? "none" : "flex" });
    set('[data-role="hud"]', { top: narrow ? "14px" : "22px", right: narrow ? "14px" : "24px" });
    set('[data-role="jump"]', { top: narrow ? "96px" : "112px", right: narrow ? "14px" : "24px" });

    const hint = document.querySelector<HTMLElement>('[data-role="hint"]');
    if (hint) {
      const t = narrow ? "drag to walk and turn · tap to open" : "scroll to move · drag or sideways to turn · click or enter to open";
      if (hint.textContent !== t) hint.textContent = t;
    }
    if (this.state.narrow !== narrow) this.setState({ narrow });
  }

  syncMedia() { syncMedia(this); }

  frame() {
    const now = performance.now();
    const dt = Math.min(400, Math.max(1, now - (this.lastT || now)));
    this.lastT = now;
    const cam = this.cam;
    const kp = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 200));
    const ky = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 130));
    cam.x += (cam.tx - cam.x) * kp;
    cam.z += (cam.tz - cam.z) * kp;
    cam.yaw += (cam.tyaw - cam.yaw) * ky;

    const wantPanel = this.panelWant || 0;
    this.panelT = (this.panelT || 0) + (wantPanel - (this.panelT || 0)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 150)));
    if (this.panelT < 0.02 && !wantPanel) {
      this.panelT = 0;
      // one-shot: without closeQueued this would re-arm the close every frame
      // the panel sits at rest, firing setState in a tight loop
      if (this.state.open && !this.closeQueued) {
        this.lift = 0; this.liftWant = 0; this.committed = false; this.committing = false; this.edgeSince = 0;
        this.wheelBlockUntil = performance.now() + 420;
        this.closeQueued = true;
        this.setState({ open: null }, () => { this.closeQueued = false; });
      }
    }
    const pT = this.panelT;
    const panel = pT > 0 ? document.querySelector<HTMLElement>('[data-role="detail"]') : null;

    if (this.liftIdleAt && performance.now() - this.liftIdleAt > 150 && !this.committing && !this.committed) this.liftWant = 0;
    this.lift = (this.lift || 0) + ((this.liftWant || 0) - (this.lift || 0)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 110)));
    if (this.committing && this.lift > 0.9) { this.committing = false; this.committed = true; this.panelWant = 0; }
    if (this.committed) { this.liftWant = 1; this.lift = Math.max(this.lift, 1); }
    const lift = Math.min(1, this.lift || 0);
    const give = Math.max(0, (lift - 0.4) / 0.6);
    const liftVis = Math.min(1, Math.pow(give, 1.5));
    // the panel resists, then releases quickly past the give point, so a
    // dismiss reads as a decision rather than a drag reaching a wall
    const sheetT = pT * (1 - liftVis * 0.92);
    this.sheetT = sheetT;
    if (panel) {
      const pg = panel.querySelector<HTMLElement>('[data-role="page"]');
      if (pg) {
        const dir = this.liftDir || -1;
        const enter = this.committed ? 0 : (1 - pT) * (1 - liftVis);
        const slide = liftVis * 34 * dir;
        const swing = liftVis * 16 * dir;
        const shrink = 1 - (1 - pT) * 0.06 - liftVis * 0.1;
        const origin = (liftVis > 0.01 || this.committed) ? (dir < 0 ? "0% 50%" : "100% 50%") : "50% 100%";
        if (pg.style.transformOrigin !== origin) pg.style.transformOrigin = origin;
        pg.style.transform = "translate(" + slide.toFixed(2) + "%, " + (enter * 16).toFixed(2) + "%) rotateX(" + (-enter * 11).toFixed(2) + "deg) rotateY(" + swing.toFixed(2) + "deg) scale(" + shrink.toFixed(3) + ")";
        pg.style.opacity = Math.min(1, pT * 1.3 * (1 - liftVis * 0.85)).toFixed(3);
      }
      const bar = panel.querySelector<HTMLElement>('[data-role="liftbar"]');
      if (bar) bar.style.width = Math.min(100, (lift / 0.5) * 100).toFixed(1) + "%";
      const hint = panel.querySelector<HTMLElement>('[data-role="lifthint"]');
      if (hint) { const t = lift > 0.06 ? "letting it go" : (this.narrow ? "swipe sideways to put it back" : "scroll sideways to put it back"); if (hint.textContent !== t) hint.textContent = t; }
    }

    const fade = 1 - sheetT;
    this.hintW = (this.hintW === undefined ? 1 : this.hintW) + ((this.hintGone ? 0 : 1) - (this.hintW === undefined ? 1 : this.hintW)) * (this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 400)));
    document.querySelectorAll<HTMLElement>('[data-plane-ui]').forEach(el => {
      const isHint = el.getAttribute("data-role") === "hint";
      el.style.opacity = (fade * (isHint ? this.hintW! : 1)).toFixed(3);
      el.style.pointerEvents = sheetT > 0.4 ? "none" : "auto";
    });
    // Objects are positioned in camera-frame coordinates below, so the world
    // layer must stay at identity — rotating it too would apply the yaw twice.
    if (this.world && this.world.style.transform !== "none") this.world.style.transform = "none";

    const rad = (cam.yaw * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    const W = window.innerWidth, H = window.innerHeight;

    const kf = this.reduced ? 1 : Math.min(1, 1 - Math.exp(-dt / 170));
    if (!this.frameW) this.frameW = {};
    const shift = 0;
    const target = (this.pointer && now - this.pointerAt < 2600) ? this.pointer : { x: W / 2, y: H * 0.46 };
    const detail = !!this.state.open;

    this.keepClear = [];
    this.keepClearRail = 0;
    document.querySelectorAll<HTMLElement>("[data-keepclear]").forEach(p => {
      const b = p.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (parseFloat(getComputedStyle(p).opacity) < 0.06) return;
      if (b.left <= 1 && b.height > window.innerHeight * 0.6) this.keepClearRail = b.width;
      this.keepClear.push({ l: b.left, r: b.right, t: b.top, b: b.bottom, ramp: parseFloat(p.getAttribute("data-keepclear") || "") || 30 });
    });

    const fset = this.state.filter ? this.filterSet : null;
    let best: FieldNode | null = null, bestD = 1e9;
    for (const o of this.OBJECTS) {
      this.near[o.id] = 0;
      const el = this.els[o.id]; if (!el) continue;
      if (fset && !fset.has(o.id)) { el.style.visibility = "hidden"; continue; }
      const dx = wrap(o.hx - cam.x, this.TILE);
      const dz = wrap(o.hz - cam.z, this.TILE);
      // Measured before the culling below, so something just behind the camera is still heard.
      this.near[o.id] = smooth(this.FAR * 0.6, 300, Math.hypot(dx, dz));
      const tileX = Math.round((o.hx - cam.x - dx) / this.TILE);
      const tileZ = Math.round((o.hz - cam.z - dz) / this.TILE);
      const seed = o.id + ":" + tileX + ":" + tileZ;
      const dy = (rand(seed + "y") - 0.5) * 2 * this.SPREAD_Y;
      const tilt = (rand(seed + "t") - 0.5) * 30;

      const lx = dx * cs + dz * sn;
      const lzRaw = -dx * sn + dz * cs;
      const wr = this.wearOf(o.id);
      // attention is a kind of gravity: a worn thing stands closer than its
      // coordinate says, without ever leaving its place in the field
      const pull = Math.max(0, Math.min(wr * 340, -lzRaw - this.NEARC - 60));
      const lz = lzRaw + pull;
      const d = -lz;
      const wantW = 0;
      const w = this.frameW[o.id] = (this.frameW[o.id] || 0) + (wantW - (this.frameW[o.id] || 0)) * kf;
      const framed = w > 0.02;
      if (d < this.NEARC || (d > this.FAR && !framed) || d > this.FAR * 1.4) { el.style.visibility = "hidden"; continue; }

      const arrive = smooth(this.FAR, this.FAR * 0.45, d);
      let pass = smooth(this.NEARC, 300, d);
      if (framed) pass = Math.max(pass, 0.28 + 0.72 * w);
      const farFade = smooth(this.FAR * 1.35, this.FAR * 0.95, d);
      const op = Math.min(1, (0.36 + 0.64 * arrive) * (1 + wr * 0.24)) * pass * farFade * (1 - 0.55 * sheetT);
      if (op < 0.03) { el.style.visibility = "hidden"; continue; }

      const scale = this.P / (this.P - lz);
      let useLx = lx, useDy = dy, shiftUse = shift;
      if (framed) {
        const freeL = (this.keepClearRail || 0) + 12;
        const freeR = (panel ? panel.getBoundingClientRect().left : W) - 20;
        const tCx = (freeL + freeR) / 2, tCy = H * 0.5;
        const lxT = (tCx - W / 2) / scale, dyT = (tCy - H * 0.46) / scale;
        useLx = lx + (lxT - lx) * w;
        useDy = dy + (dyT - dy) * w;
        shiftUse = shift * (1 - w);
      }
      const sx = W / 2 + shiftUse + useLx * scale, sy = H * 0.46 + useDy * scale;
      if (sx < -600 || sx > W + 600) { el.style.visibility = "hidden"; continue; }

      const spared = framed || (this.state.focus && this.state.focus.id === o.id);
      let clear = 1;
      if (this.keepClear && this.keepClear.length && !spared) {
        const cw = 410 * scale, ch = 350 * scale;
        const l = sx - cw / 2, r2 = sx + cw / 2, t = sy - ch / 2, b2 = sy + ch / 2;
        for (const z of this.keepClear) {
          const gapX = Math.max(z.l - r2, l - z.r, 0);
          const gapY = Math.max(z.t - b2, t - z.b, 0);
          const gap = Math.max(gapX, gapY);
          if (gap >= z.ramp) continue;
          clear = Math.min(clear, 0.06 + 0.94 * (gap / z.ramp));
        }
      }

      el.style.visibility = "visible";
      el.style.opacity = (op * clear).toFixed(3);
      el.style.pointerEvents = op > 0.45 ? "auto" : "none";
      el.style.filter = this.reduced ? "none" : `blur(${((1 - arrive) * 1.4 + sheetT * 13).toFixed(2)}px)`;
      el.style.transform = `translate3d(${(useLx + shiftUse / Math.max(0.001, scale)).toFixed(1)}px, ${useDy.toFixed(1)}px, ${lz.toFixed(1)}px) rotateY(${tilt.toFixed(2)}deg) translate(-50%, -50%)`;
      this.screenPos[o.id] = { sx, sy };

      // focus is decided by geometry, not by the panel fade — otherwise a
      // card dimmed behind a panel could never become the focused one
      if (op > 0.4) {
        const dist = Math.hypot(sx - target.x, sy - target.y);
        if (dist < 300 && dist < bestD) { bestD = dist; best = o; }
      }
    }

    // traces are drawn, sheet by sheet and line by line, once the object
    // comes into focus, so a per-mark delay stagger reads as ink settling
    for (const o of this.OBJECTS) {
      const el = this.els[o.id]; if (!el || el.style.visibility === "hidden") continue;
      const on = !!(best && best.id === o.id);
      const wr = this.wearOf(o.id);
      const cloud = el.querySelector<HTMLElement>('[data-part="cloud"]');
      if (cloud) { const co = (wr * 0.4).toFixed(3); if (cloud.dataset.o !== co) { cloud.style.opacity = co; cloud.dataset.o = co; } }
      const plate = el.firstElementChild as HTMLElement | null, title = el.children[2] as HTMLElement, cue = el.querySelector<HTMLElement>('[data-part="cue"]');
      const border = on ? "#6E9A8D" : (this.visited[o.id] ? "rgba(110,154,141," + (0.4 + wr * 0.35).toFixed(2) + ")" : "rgba(168,176,173," + (0.45 + wr * 0.35).toFixed(2) + ")");
      const bkey = border + ":" + (on ? 1 : 0);
      if (plate && plate.dataset.b !== bkey) {
        plate.style.borderColor = border;
        plate.style.boxShadow = on ? "0 0 0 1px rgba(110,154,141,0.5), 0 0 34px rgba(110,154,141,0.16)" : (wr > 0.45 ? "0 0 30px rgba(228,223,210," + ((wr - 0.45) * 0.16).toFixed(3) + ")" : "none");
        plate.style.background = on ? "rgba(110,154,141,0.07)" : "rgba(228,223,210," + (0.05 + wr * 0.05).toFixed(3) + ")";
        plate.dataset.b = bkey;
      }
      const tc = on ? "#6E9A8D" : "#E4DFD2";
      if (title && title.dataset.c !== tc) { title.style.color = tc; title.dataset.c = tc; }
      const cueOp = on ? "1" : "0";
      if (cue && cue.dataset.o !== cueOp) { cue.style.opacity = cueOp; cue.dataset.o = cueOp; }
      const mkState = on ? "1" : "0";
      if (el.dataset.mk !== mkState) {
        el.dataset.mk = mkState;
        el.querySelectorAll<HTMLElement>('[data-part="mark"]').forEach((mk, mi) => {
          const hold = this.reduced ? 0 : mi * 240;
          mk.style.transition = "opacity 500ms ease";
          mk.style.transitionDelay = (on ? hold : 0) + "ms";
          mk.style.opacity = on ? (mk.dataset.op || "0.8") : "0";
          mk.querySelectorAll<SVGPathElement>("path").forEach((p, pi) => {
            p.style.transition = "none";
            p.style.strokeDashoffset = "1";
            if (!on) return;
            if (this.reduced) { p.style.strokeDashoffset = "0"; return; }
            p.getBoundingClientRect(); // flush, so the dash reset above lands before the transition below starts
            p.style.transition = "stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1)";
            p.style.transitionDelay = (hold + pi * 260) + "ms";
            p.style.strokeDashoffset = "0";
          });
        });
      }
    }

    const fid = best ? best.id : null;
    if ((this.state.focus && this.state.focus.id) !== fid) {
      this.setState({ focus: best ? { id: best.id, title: best.t, stamp: best.k + (best.y ? " · " + best.y : "") } : null });
    }
    this.syncMedia();

    const dragging = !!(this.drag && this.drag.moved > 6);
    const live = this.pointer && now - this.pointerAt < 2600;
    void live;
    const sheetUp = sheetT > 0.4;
    const overSheet = sheetUp;
    const mode = overSheet ? "read" : dragging ? "turning" : best ? "open" : "look";
    if (this.stage && this.stage.dataset.mode !== mode) {
      this.stage.style.cursor = mode === "read" ? "default" : mode === "turning" ? "grabbing" : mode === "open" ? "pointer" : "grab";
      this.stage.dataset.mode = mode;
    }

    this.paintTracks(sheetT);

    if (this.state.plan) {
      const you = document.querySelector<HTMLElement>('[data-role="planyou"]');
      if (you) {
        const gx = ((((cam.x % this.TILE) + this.TILE) % this.TILE) / this.TILE * 100).toFixed(2);
        const gz = ((((cam.z % this.TILE) + this.TILE) % this.TILE) / this.TILE * 100).toFixed(2);
        you.style.left = gx + "%"; you.style.top = gz + "%";
        you.style.transform = "rotate(" + cam.yaw.toFixed(1) + "deg)";
      }
    }
    if (this.hudDepth) this.hudDepth.textContent = "DEPTH " + String(Math.round(Math.hypot(cam.x, cam.z))).padStart(5, "0");
    if (this.hudYaw) { const y = ((Math.round(cam.yaw) % 360) + 360) % 360; this.hudYaw.textContent = "BEARING " + String(y).padStart(3, "0"); }
    if (this.hudGrid) {
      const gx = Math.round(((cam.x % this.TILE) + this.TILE) % this.TILE);
      const gz = Math.round(((cam.z % this.TILE) + this.TILE) % this.TILE);
      this.hudGrid.textContent = "E" + String(gx).padStart(4, "0") + " N" + String(gz).padStart(4, "0");
    }
  }

  FLOOR = 480;
  
  walkColor(name: string): string { return tracks.walkColor(this, name); }
  camPt(wx: number, wz: number) { return tracks.camPt(this, wx, wz); }
  screenPt(p: { lx: number; lz: number }, height: number) { return tracks.screenPt(this, p, height); }
  instance(o: FieldNode, ox: number, oz: number) { return tracks.instance(this, o, ox, oz); }
  paintTracks(fade: number) { tracks.paintTracks(this, fade); }

  clearFilterFor(id: string) { nav.clearFilterFor(this, id); }
  open(id: string, mark: string) { nav.open(this, id, mark); }
  approach(id: string, dist: number) { nav.approach(this, id, dist); }
  flyTo(id: string, mark: string, allowFriction: boolean, andOpen: boolean) { nav.flyTo(this, id, mark, allowFriction, andOpen); }
  runSearch(q: string) { nav.runSearch(this, q); }
  passingTrace(): { trace: Walk; index: number } | null { return nav.passingTrace(this); }
  commitName = (e?: React.FormEvent) => nav.commitName(this, e);

  notesFor(id: string) { return notes.notesFor(this, id); }
  inkColor(): string { return notes.inkColor(this); }
  bindPaper(cv: HTMLCanvasElement) { notes.bindPaper(this, cv); }
  paintPaper() { notes.paintPaper(this); }
  onUpload = (e: React.ChangeEvent<HTMLInputElement>) => notes.onUpload(this, e);
  commitNote = () => notes.commitNote(this);
  nextInWalk(n: FieldNote | null | undefined): string | null { return notes.nextInWalk(this, n); }

  renderVals(): Vals {
    const st = this.state;
    if (!this.nodes) {
      this.nodes = this.OBJECTS.map(o => ({
        id: o.id, title: o.t, kind: o.k, year: o.y || "—", plate: plate(o), live: !!liveMedia(o),
        open: () => this.open(o.id, "◉")
      }));
    }
    const fieldOn = this.props.fieldNotes ?? true;
    this.nodes.forEach(nd => {
      const drawn = !fieldOn ? [] : this.notesFor(nd.id).filter(n => n.marks && n.marks.length).slice(0, 4);
      nd.marks = drawn.map(n => ({ marks: n.marks, ink: n.ink || this.inkColor(), op: n.mine ? "0.95" : "0.65" }));
      nd.hasMarks = drawn.length > 0;
      nd.cloud = fieldOn ? this.cloudFor(nd.id, this.wearOf(nd.id)) : [];
      nd.traceLabel = drawn.length ? (drawn.length === 1 ? "one trace · " + (drawn[0].mine ? "you" : drawn[0].by) : drawn.length + " traces") : "";
      nd.openTrace = (ev?: any) => { if (ev && ev.stopPropagation) ev.stopPropagation(); if (drawn.length) this.setState({ view: drawn[0].id }); };
    });

    const out: Vals = {
      nodes: this.nodes,
      focus: st.focus, query: st.query,
      askOpen: st.askOpen, askShut: !st.askOpen,
      naming: st.naming, nameValue: st.nameValue,
      hasTrace: st.trace.length > 0, traceCount: String(st.trace.length).padStart(2, "0"),
      jump: st.jump || null,
      openAction: st.narrow ? "tap" : "enter",
      openCue: st.narrow ? "tap to open" : "enter to open",
      others: (this.props.showOthers ?? true) && !st.naming,
      nameStamp: st.trace.length ? "name it · " + st.trace.length + " objects" + (this.NOTES.filter(n => n.mine).length ? ", " + this.NOTES.filter(n => n.mine).length + " traces left" : "") : "name it",
      noteCount: String(this.NOTES.filter(n => n.mine).length).padStart(2, "0"),
      catalogue: st.catalogue,
      journeyTally: String(st.seeded.length + (st.trace.length ? 1 : 0)).padStart(2, "0") + " in the collection",
      onCatalogue: () => { this.panelWant = 0; this.setState({ catalogue: true, open: null, compose: null, view: null }); },
      onCloseCatalogue: () => this.setState({ catalogue: false }),
      onLeaveJourney: () => { this.filterSet = null; this.setState({ filter: null, joined: null }); },
      tracksLabel: st.tracksOn ? "TRACKS ON" : "TRACKS OFF",
      tracksColor: st.tracksOn ? "#6E9A8D" : "rgba(142,148,145,0.55)",
      onTracks: () => this.setState({ tracksOn: !this.state.tracksOn }),
      onAskOpen: () => { this.wantFocus = true; this.setState({ askOpen: true }); },
      onAskBlur: () => { if (!this.state.query.trim()) this.setState({ askOpen: false }); },
      onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ query: e.target.value }),
      onSubmit: (e: React.FormEvent) => { e.preventDefault(); this.runSearch(this.state.query); },
      onClose: () => { this.liftDir = -1; this.committing = true; this.liftWant = 1; this.tick(); },
      onElsewhere: () => { const pool = this.OBJECTS.filter(q => q.id !== st.open); const pick = pool[Math.floor(Math.random() * pool.length)]; this.setState({ joined: null }); this.flyTo(pick.id, "⤳", false, true); },
      onLeaveTrace: () => { if (st.trace.length) { this.panelWant = 0; this.setState({ naming: true, nameValue: "", open: null }); } },
      onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ nameValue: e.target.value }),
      onCommitName: this.commitName,
      onCancelName: () => this.setState({ naming: false }),
      onFollowPassing: () => { const p = this.passingTrace(); if (!p) return; this.setState({ joined: p.trace.name }); this.flyTo(p.trace.steps[p.index + 1], "↓", false, true); }
    };
    out.onTracksKey = key(out.onTracks);
    out.onCatalogueKey = key(out.onCatalogue);
    out.onCloseCatalogueKey = key(out.onCloseCatalogue);
    out.onLeaveJourneyKey = key(out.onLeaveJourney);
    out.onAskOpenKey = key(out.onAskOpen);
    out.onCloseKey = key(out.onClose);
    out.onElsewhereKey = key(out.onElsewhere);
    out.onLeaveTraceKey = key(out.onLeaveTrace);
    out.onCommitNameKey = key(() => this.commitName());
    out.onCancelNameKey = key(out.onCancelName);
    out.onFollowPassingKey = key(out.onFollowPassing);

    catalogueVals(this, st, out);

    const o = st.open ? this.byId(st.open) : null;
    if (o) {
      const idx = this.OBJECTS.indexOf(o) + 1;
      out.detail = {
        id: o.id, title: o.t, stamp: o.k + (o.y ? " · " + o.y : ""),
        ref: "[a}morf · " + String(idx).padStart(3, "0") + " / " + this.OBJECTS.length,
        plate: plate(o),
        media: (o.media || []).map((m, i) => ({ kind: m.kind, cap: m.cap, plate: plate(o, "v" + i, m.kind), img: m.img || null, imgCss: m.img ? "url(" + m.img + ")" : null })),
        paras: o.p.map(t => ({ t })),
        notes: o.notes || [],
        facts: [
          { k: "medium", v: o.k },
          { k: "date", v: o.y || "undated" },
          { k: "place", v: o.place || "unplaced" },
          { k: "source", v: o.src || "unattributed" },
          { k: "tags", v: o.tags.slice(0, 5).join(" · ") }
        ]
      };
      out.assocs = this.ASSOC.filter(a => a[0] === o.id || a[1] === o.id).slice(0, 4).map(a => {
        const other = a[0] === o.id ? a[1] : a[0];
        const go = () => this.flyTo(other, "↓", true, true);
        return { reason: a[2], title: this.byId(other).t, go, key: key(go) };
      });
      const p = this.passingTrace();
      out.passing = p ? p.trace.name : null;
    } else {
      out.detail = null; out.assocs = []; out.passing = null;
    }

    out.trace = st.trace.map((s, i) => {
      const obj = this.byId(s.id);
      const go = () => { this.setState({ cursor: i }); this.flyTo(s.id, "↺", false, true); };
      let label = obj.t.split(",")[0].replace(/^(a|the) /i, "");
      if (label.length > 13) {
        const words = label.split(" "); let acc = "";
        for (const wd of words) { if ((acc + " " + wd).trim().length > 13) break; acc = (acc + " " + wd).trim(); }
        label = (acc || label.slice(0, 12)) + "…";
      }
      return { label: label.toLowerCase(), mark: s.mark + (s.note ? " ✎" : ""), depth: s.depth, year: yearLabel(obj) === "undated" ? "—" : yearLabel(obj), color: i === st.cursor ? "#6E9A8D" : "rgba(228,223,210,0.5)", go, key: key(go) };
    });

    let crossedYears = 0, dated = 0, uncounted = 0;
    for (let i = 1; i < st.trace.length; i++) {
      const g = gap(this.byId(st.trace[i - 1].id), this.byId(st.trace[i].id));
      if (g !== null) { crossedYears += g; dated++; } else uncounted++;
    }
    const steps = st.trace.length - 1;
    out.crossed = st.trace.length < 2 ? "one position held"
      : (dated ? crossedYears.toLocaleString() + " years crossed" : "no datable distance")
        + " in " + steps + (steps === 1 ? " step" : " steps")
        + (uncounted ? ", " + uncounted + " uncounted" : "");
    const mineCount = this.NOTES.filter(n => n.mine).length;
    if (mineCount) out.crossed = out.crossed + " · " + mineCount + (mineCount === 1 ? " trace left behind" : " traces left behind");

    notesVals(this, st, out);

    composeVals(this, st, out);

    viewVals(this, st, out);

    const keptFirst = st.seeded.slice().sort((a, b) => ((st.kept[b.name] ? 1 : 0) - (st.kept[a.name] ? 1 : 0)));
    out.seeded = keptFirst.slice(0, 4).map(t => {
      const go = () => { this.setState({ joined: t.name }); this.flyTo(t.steps[0], "↓", false, true); };
      return { name: t.name, color: this.walkColor(t.name), swatch: st.tracksOn ? "0.85" : "0.25", mark: st.kept[t.name] ? "kept" : t.table ? "set" : "", join: go, key: key(go) };
    });

    planVals(this, st, out);

    tableVals(this, st, out);

    return out;
  }

  render() {
    // renderVals() is called exactly once per render — it mutates this.nodes in place
    // and allocates fresh handler closures, so calling it twice would double that work
    // and churn identities every commit.
    const v: V = { ...this.props, ...this.renderVals() };
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--field-bg)", color: "var(--field-ink)", fontFamily: "var(--font-body), Georgia, serif" }}>
        {renderStage(v)}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, background: "radial-gradient(140% 110% at 50% 50%, transparent 44%, rgba(6,10,11,0.84) 100%)" }} />
        {renderHud(v)}
        {v.jump && renderJump(v)}
        {v.focus && renderFocusbar(v)}
        {v.hasTrace && renderTraceRail(v)}
        {v.inJourney && renderJourneybar(v)}
        {renderHint()}
        {v.others && renderOthers(v)}
        {v.detail && renderDetail(v)}
        {renderMediaStage(v)}
        {v.catalogue && renderCatalogue(v)}
        {v.view && renderView(v)}
        {v.compose && renderCompose(v)}
        {v.plan && renderPlan(v)}
        {v.table && renderTable(v)}
        {v.naming && renderNaming(v)}
      </div>
    );
  }
}
