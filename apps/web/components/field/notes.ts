// Traces and notes: the tracing-paper canvas, composing a note, and the notes view models.
import type React from "react";
import type Field from "./Field";
import type { FieldNote, State, Vals } from "./types";
import { key } from "./util";
import { plate } from "./plate";

export function notesFor(f: Field, id: string) { return f.NOTES.filter(n => n.obj === id); }

export function inkColor(f: Field): string { return f.props.inkColor || "#E4DFD2"; }

// The sheet itself. Strokes are kept in the sheet's own 0..1 coordinates, so
// the same trace scales from a thumbnail in the field to the full plate.
export function bindPaper(f: Field, cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!;
  f.paper = cv; f.paperCtx = ctx;
  const fit = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.paintPaper();
  };
  f.paperFit = fit;
  fit(); requestAnimationFrame(fit);
  const at = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  cv.addEventListener("pointerdown", (e: PointerEvent) => {
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    f.drawing = { w: f.paperW, pts: [at(e)] };
    f.paperStrokes.push(f.drawing);
    f.paintPaper();
  });
  cv.addEventListener("pointermove", (e: PointerEvent) => { if (!f.drawing) return; f.drawing.pts.push(at(e)); f.paintPaper(); });
  const end = () => {
    if (f.drawing && f.drawing.pts.length < 2) f.drawing.pts.push([f.drawing.pts[0][0] + 0.002, f.drawing.pts[0][1]]);
    if (f.drawing) { f.drawing = null; f.paintPaper(); }
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener("pointerleave", end);
}

export function paintPaper(f: Field) {
  const ctx = f.paperCtx, cv = f.paper; if (!ctx || !cv) return;
  const r = cv.getBoundingClientRect(); if (!r.width) return;
  ctx.clearRect(0, 0, r.width, r.height);
  ctx.strokeStyle = f.inkColor(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const s = r.width / 300;
  for (const st of f.paperStrokes) {
    if (st.pts.length < 2) continue;
    ctx.lineWidth = Math.max(0.9, st.w * s);
    ctx.beginPath();
    st.pts.forEach((p, i) => { const x = p[0] * r.width, y = p[1] * r.height; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  }
}

// An uploaded sketch is kept for its linework only: luminance becomes
// opacity and everything pale drops out, so the paper stays paper.
export function onUpload(f: Field, e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const W = Math.min(1100, img.width), H = Math.max(1, Math.round((W * img.height) / img.width));
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0, W, H);
    let d;
    try { d = x.getImageData(0, 0, W, H); } catch (err) { return; }
    const px = d.data, ink = f.inkColor();
    const cr = parseInt(ink.slice(1, 3), 16), cg = parseInt(ink.slice(3, 5), 16), cb = parseInt(ink.slice(5, 7), 16);
    for (let i = 0; i < px.length; i += 4) {
      const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      const a = Math.max(0, Math.min(1, (0.74 - l) / 0.4));
      px[i] = cr; px[i + 1] = cg; px[i + 2] = cb; px[i + 3] = Math.round(a * 255);
    }
    x.putImageData(d, 0, 0);
    f.paperImg = c.toDataURL("image/png");
    URL.revokeObjectURL(img.src);
    f.forceUpdate();
  };
  img.src = URL.createObjectURL(file);
}

export function commitNote(f: Field) {
  const objId = f.state.compose; if (!objId) return;
  const marks = f.paperStrokes.filter(s => s.pts.length > 1).map(s => ({
    d: s.pts.map((p, i) => (i ? "L" : "M") + (p[0] * 300).toFixed(1) + "," + (p[1] * 200).toFixed(1)).join(""),
    w: String(s.w)
  }));
  const txt = (f.state.noteTxt || "").trim();
  if (!marks.length && !f.paperImg && !txt) { f.setState({ compose: null }); return; }
  f.NOTES.unshift({
    id: "u" + Date.now(), obj: objId, by: "you", walk: null, kind: f.paperImg ? "sketch" : "trace",
    txt: txt || "left without words", marks, img: f.paperImg, mine: true, ink: f.inkColor()
  });
  const trace = f.state.trace.slice();
  for (let i = trace.length - 1; i >= 0; i--) if (trace[i].id === objId) { trace[i] = { id: trace[i].id, mark: trace[i].mark, depth: trace[i].depth, note: true }; break; }
  f.paperStrokes = []; f.paperImg = null;
  f.setState({ compose: null, noteTxt: "", trace, noteRev: f.state.noteRev + 1 }, () => f.recomputeWear());
}

export function nextInWalk(f: Field, n: FieldNote | null | undefined): string | null {
  if (!n || !n.walk) return null;
  const w = f.state.seeded.find(s => s.name === n.walk);
  if (!w) return null;
  const i = w.steps.indexOf(n.obj);
  return i > -1 && i < w.steps.length - 1 ? w.steps[i + 1] : null;
}

export function notesVals(f: Field, st: State, out: Vals): void {
  const here = st.open ? f.notesFor(st.open) : [];
  out.notesHere = here.map(n => {
    const go = () => f.setState({ view: n.id });
    return {
      id: n.id, marks: n.marks || [], drawn: !!(n.marks && n.marks.length), img: n.img || null,
      ink: n.ink || f.inkColor(), txt: n.txt, by: n.mine ? "left by you" : "left by " + n.by,
      imgCss: n.img ? "url(" + n.img + ")" : null,
      short: n.txt.length > 88 ? n.txt.slice(0, 86).replace(/[\s,.;]+$/, "") + "…" : n.txt,
      sheet: !!((n.marks && n.marks.length) || n.img), written: !((n.marks && n.marks.length) || n.img),
      on: st.hand === n.id,
      enter: () => f.setState({ hand: n.id }),
      leave: () => { if (f.state.hand === n.id) f.setState({ hand: null }); },
      open: go, key: key(go)
    };
  });
  out.noteTally = here.length === 0 ? "none yet" : here.length === 1 ? "one" : String(here.length).padStart(2, "0");
  const hand = st.hand;
  const drawnHere = here.filter(n => n.marks && n.marks.length);
  out.layers = drawnHere.map(n => ({
    marks: n.marks, ink: n.ink || f.inkColor(),
    op: hand ? (hand === n.id ? "0.95" : "0.07") : (0.34 + (n.mine ? 0.3 : 0)).toFixed(2)
  }));
  const handOf = hand ? here.find(n => n.id === hand) : null;
  out.overlayLabel = handOf ? "one hand · " + (handOf.mine ? "you" : handOf.by)
    : drawnHere.length ? drawnHere.length + (drawnHere.length === 1 ? " sheet laid over it" : " sheets laid over each other")
    : "no sheets laid over it yet";
}

export function composeVals(f: Field, st: State, out: Vals): void {
  const co = st.compose ? f.byId(st.compose) : null;
  const wsel = (on: boolean) => on ? "var(--field-accent)" : "color-mix(in srgb, var(--field-mist) 60%, transparent)";
  out.compose = co ? {
    title: co.t, plate: plate(co), img: f.paperImg || null, imgCss: f.paperImg ? "url(" + f.paperImg + ")" : null,
    uploadLabel: f.paperImg ? "sketch laid down" : "upload a sketch",
    fine: wsel(f.paperW < 1.2), medium: wsel(f.paperW >= 1.2 && f.paperW < 2.6), broad: wsel(f.paperW >= 2.6)
  } : null;
  out.noteTxt = st.noteTxt;
  out.onCompose = () => { if (!st.open) return; f.paperStrokes = []; f.paperImg = null; f.setState({ compose: st.open, noteTxt: "" }); };
  out.onDiscard = () => { f.paperStrokes = []; f.paperImg = null; f.setState({ compose: null, noteTxt: "" }); };
  out.onUndo = () => { f.paperStrokes.pop(); f.paintPaper(); };
  out.onClearPaper = () => { f.paperStrokes = []; f.paperImg = null; f.paintPaper(); f.forceUpdate(); };
  out.onFine = () => { f.paperW = 0.9; f.forceUpdate(); };
  out.onMedium = () => { f.paperW = 1.8; f.forceUpdate(); };
  out.onBroad = () => { f.paperW = 3.4; f.forceUpdate(); };
  out.onNoteTxt = (e: React.ChangeEvent<HTMLTextAreaElement>) => f.setState({ noteTxt: e.target.value });
  out.onCommitNote = f.commitNote;
  out.onUpload = f.onUpload;
  out.onComposeKey = key(out.onCompose);
  out.onDiscardKey = key(out.onDiscard);
  out.onUndoKey = key(out.onUndo);
  out.onClearPaperKey = key(out.onClearPaper);
  out.onFineKey = key(out.onFine);
  out.onMediumKey = key(out.onMedium);
  out.onBroadKey = key(out.onBroad);
  out.onCommitNoteKey = key(() => f.commitNote());
}

export function viewVals(f: Field, st: State, out: Vals): void {
  const vn = st.view ? f.NOTES.find(n => n.id === st.view) : null;
  if (vn) {
    const vo = f.byId(vn.obj), nxt = f.nextInWalk(vn);
    const handNotes = f.NOTES.filter(n => n.by === vn.by && n.id !== vn.id);
    out.view = {
      title: vo.t, plate: plate(vo), marks: vn.marks || [], img: vn.img || null,
      ink: vn.ink || f.inkColor(), txt: vn.txt, imgCss: vn.img ? "url(" + vn.img + ")" : null,
      by: vn.mine ? "left by you" : "left by " + vn.by,
      stamp: vn.kind === "written" ? "written, no sheet" : "on tracing paper",
      walk: vn.walk ? "part of a walk · " + vn.walk : null
    };
    const wk = vn.walk ? st.seeded.find(s => s.name === vn.walk) : null;
    const stepsArr = wk ? wk.steps : (vn.mine ? st.trace.map(t => t.id) : []);
    out.journey = stepsArr.map((sid, i) => {
      const so = f.byId(sid), on = sid === vn.obj;
      const go = () => { f.setState({ view: null, joined: vn.walk || null }); f.flyTo(sid, "↓", false, true); };
      return { n: String(i + 1).padStart(2, "0"), title: so.t, here: on ? "this trace" : "", color: on ? "var(--field-accent)" : "color-mix(in srgb, var(--field-ink) 55%, transparent)", go, key: key(go) };
    });
    out.viewFollow = nxt ? "follow where they went next" : (handNotes.length ? "another trace by this hand" : null);
    out.onFollowTrace = () => {
      if (nxt) { f.setState({ view: null, joined: vn.walk }); f.flyTo(nxt, "↓", false, true); }
      else if (handNotes.length) {
        const pick = handNotes[Math.floor(Math.random() * handNotes.length)];
        f.setState({ view: null });
        f.flyTo(pick.obj, "↓", false, true);
        f.later(() => f.setState({ view: pick.id }), 1100);
      }
    };
  } else { out.view = null; out.viewFollow = null; out.journey = []; out.onFollowTrace = () => {}; }
  out.onCloseNote = () => f.setState({ view: null });
  out.onCloseNoteKey = key(out.onCloseNote);
  out.onFollowTraceKey = key(() => out.onFollowTrace());
}
