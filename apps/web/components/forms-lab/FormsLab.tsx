"use client";
// Forms lab (EXP-0014): every entity as a form with its media on the faces, a box-to-sphere morph and a first turn
// animation, on WebGPU or on ?gl=webgl2. A spike outside the field; the field takes the forms in step 2.
import { useEffect, useRef, useState } from "react";
import { SLOTS, type FormFaces } from "./faces";
import type { EntityView, Lab, LabOptions, LabStatus, LabView } from "./scene";
import { OUTLINE } from "./form";
import { DEFAULT_MOTION } from "./config";
import MotionMatrix from "./MotionMatrix";

// Without entities (no media base in dev) the lab still runs on blank forms showing the test cards.
const PLACEHOLDERS: FormFaces[] = Array.from({ length: 9 }, (_, i) => ({
  id: "test-" + i, title: "test", ar: [1, 1.4, 0.7][i % 3], faces: SLOTS.map(() => null), board: [],
}));

const TOGGLES: [keyof LabOptions, string][] = [
  ["turn", "turn"], ["drift", "float (all axes)"], ["settle", "face the camera when near"], ["satOn", "satellites (pictures after the cover)"], ["autoMorph", "morph by itself"],
  ["mixed", "per-form shape and outline"], ["test", "test cards"],
];

// Satellite tuning: the orbit radius and the satellite size multiply the seeded values; speed scales the orbit clock.
const SAT_SLIDERS: [keyof LabOptions, string, number][] = [
  ["satRadius", "sat radius", 1.6], ["satSize", "sat size", 3], ["satSpeed", "sat speed", 4],
];

export default function FormsLab({ forms }: { forms: FormFaces[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lab = useRef<Lab | null>(null);
  const [opts, setOpts] = useState<LabOptions>(() => ({
    entityView: "board", motion: structuredClone(DEFAULT_MOTION), turn: true, drift: true, settle: true, satOn: true, satRadius: 1, satSize: 1, satSpeed: 1, mixed: false, test: forms.length === 0, autoMorph: false, shape: 0,
    taper: 0, twist: 0, bend: 0, relief: 0, cut: 0,
  }));
  const [status, setStatus] = useState<LabStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<LabView>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let dead = false;
    import("./scene")
      .then(m => m.startLab(cv, forms.length ? forms : PLACEHOLDERS, { ...opts }, s => { if (!dead) setStatus(s); }, v => { if (!dead) setView(v); }))
      .then(l => { if (dead) l.dispose(); else lab.current = l; })
      .catch(err => { console.warn("[forms-lab] renderer failed to start", err); if (!dead) setError(String(err)); });
    return () => { dead = true; lab.current?.dispose(); lab.current = null; };
    // The scene starts once; later option changes go through lab.set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms]);

  const set = (o: Partial<LabOptions>) => {
    setOpts(prev => ({ ...prev, ...o }));
    lab.current?.set(o);
  };
  const shape = opts.autoMorph ? status?.shape ?? opts.shape : opts.shape;

  return (
    <main className="fixed inset-0" style={{ background: "var(--field-bg)", color: "var(--field-ink)" }}>
      <canvas ref={canvas} className="block h-full w-full touch-none" />
      <div className="field-label absolute left-4 top-4 flex flex-col gap-2 text-xs" style={{ maxWidth: 280 }}>
        <div>forms lab · EXP-0014 · EXP-0016 · EXP-0018</div>
        <div>
          {error ? "renderer failed: " + error
            : !status ? "starting…"
            : `${status.backend} · ${status.forms} forms · ${status.sats} satellites · ${status.loaded}/${status.pictures} pictures · ${status.layers} layers · ${status.draws} draws`}
        </div>
        {forms.length === 0 && <div>no entities loaded: blank forms only</div>}
        <label className="flex items-center gap-2">
          <span>cube</span>
          <input
            type="range" min={0} max={1} step={0.01} value={shape} disabled={opts.autoMorph}
            onChange={e => set({ shape: Number(e.target.value) })}
          />
          <span>sphere</span>
        </label>
        {OUTLINE.map(k => (
          <label key={k} className="flex items-center gap-2">
            <span style={{ width: 44 }}>{k}</span>
            <input
              type="range" min={0} max={1} step={0.01} value={opts[k]} disabled={opts.mixed}
              onChange={e => set({ [k]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label className="flex items-center gap-2">
          <span>open as</span>
          <select value={opts.entityView} onChange={e => set({ entityView: e.target.value as EntityView })} style={{ background: "transparent" }}>
            <option value="board">board of all media</option>
            <option value="net">cube net</option>
          </select>
        </label>
        {SAT_SLIDERS.map(([k, label, max]) => (
          <label key={k} className="flex items-center gap-2">
            <span style={{ width: 70 }}>{label}</span>
            <input
              type="range" min={0} max={max} step={0.01} value={opts[k] as number} disabled={!opts.satOn}
              onChange={e => set({ [k]: Number(e.target.value) })}
            />
            <span>{(opts[k] as number).toFixed(2)}</span>
          </label>
        ))}
        {TOGGLES.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={opts[k] as boolean} onChange={e => set({ [k]: e.target.checked })} />
            <span>{label}</span>
          </label>
        ))}
        <div>drag to orbit · scroll to zoom · click a form to open it · ?gl=webgl2 forces WebGL 2</div>
      </div>
      <MotionMatrix motion={opts.motion} onChange={motion => set({ motion })} />
      {view && (
        <div className="field-label absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 text-xs">
          <span>{view.title}</span>
          <button type="button" className="underline" onClick={() => lab.current?.back()}>fold back (Esc)</button>
        </div>
      )}
    </main>
  );
}
