// Forms in the field (EXP-0020), the part that is always loaded: the flag, the settings rows, the card hooks frame() calls and the
// lifecycle. The three.js side (mesh.ts) is a dynamic import started only when forms are on, so off is today's field exactly.
import type Field from "../Field";
import { key } from "../util";
import { tune, setTune, resetTune, type FormsTune } from "./settings";
import type { CardPlace } from "./anchor";

// What mesh.ts builds. place: a card's numbers for this frame (frame() calls begin, then place for every card it shows, then
// end; a form not placed is hidden). ready: the entity has a form whose picture has arrived, so its DOM picture may give way.
// moving: any motion is on, so the world must repaint every frame. rev changes when something static changed (an anchor, a
// picture, a setting), so the eye-key gate in world.ts repaints.
export type FormsRt = {
  rev: number;
  begin: () => void;
  place: (id: string, c: CardPlace, op: number) => void;
  end: () => void;
  ready: (id: string) => boolean;
  step: (dt: number, lightYaw: number) => void;
  moving: () => boolean;
  dispose: () => void;
};

export const parseForms = (search: string) => new URLSearchParams(search).get("forms") === "1";

// Builds when forms are on and the world is up, disposes when they go off. Called every frame from paintWorld.
export function reconcileForms(f: Field) {
  const g = f.gl;
  if (!f.formsOn && f.fm) { disposeForms(f); return; }
  if (!f.formsOn || !g || f.fm || f.fmPending) return;
  f.fmPending = true;
  import("./mesh").then(m => m.buildForms(f, g)).then(rt => {
    f.fmPending = false;
    // forms were switched off, or the world was rebuilt, while it loaded
    if (f.formsOn && f.gl === g) f.fm = rt; else rt.dispose();
  }).catch(err => {
    f.fmPending = false; f.formsOn = false; f.formsPanel = false; f.forceUpdate();
    console.warn("[amorf] forms failed to start", err);
  });
}

// Gives every card its picture back and frees the three.js side.
export function disposeForms(f: Field) {
  const fm = f.fm;
  f.fm = null;
  if (!fm) return;
  fm.dispose();
  for (const id in f.els) { const el = f.els[id]; if (el) showPictures(el, true); }
}

// A card's picture parts (plate, thumb, live media) go invisible while its form stands in their place; the card's box stays,
// so layout, hover, focus and click are unchanged, and the text stays.
export function showPictures(el: HTMLElement, shown: boolean) {
  if ((el.dataset.fp === "1") === !shown) return;
  el.dataset.fp = shown ? "0" : "1";
  const v = shown ? "" : "hidden";
  const parts = [el.firstElementChild, el.querySelector('[data-part="thumb"]'), el.querySelector('[data-part="media"]')];
  for (const p of parts) if (p) (p as HTMLElement).style.visibility = v;
}

const setUrl = (on: boolean) => {
  const q = new URLSearchParams(location.search);
  if (on) q.set("forms", "1"); else q.delete("forms");
  const s = q.toString();
  history.replaceState(history.state, "", location.pathname + (s ? "?" + s : "") + location.hash);
};

export function formsVals(f: Field) {
  const onForms = () => {
    if (!f.glOn) return;
    f.formsOn = !f.formsOn;
    if (!f.formsOn) f.formsPanel = false;
    setUrl(f.formsOn);
    f.forceUpdate(); f.tick();
  };
  const onFormsPanel = () => { f.formsPanel = !f.formsPanel; f.forceUpdate(); };
  const onFormsTune = (p: Partial<FormsTune>) => { setTune(p); f.forceUpdate(); f.tick(); };
  const onFormsReset = () => { resetTune(); f.forceUpdate(); f.tick(); };
  const on = f.formsOn && f.glOn;
  return {
    formsOn: on, formsDisabled: !f.glOn, formsPanel: on && f.formsPanel, formsTune: tune,
    onForms, onFormsKey: key(onForms), onFormsPanel, onFormsPanelKey: key(onFormsPanel), onFormsTune, onFormsReset, onFormsResetKey: key(onFormsReset),
  };
}
