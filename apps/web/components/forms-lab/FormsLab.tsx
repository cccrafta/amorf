"use client";
// Forms lab (EXP-0014): every entity as a form with its media on the faces, a box-to-sphere morph and a first turn
// animation, on WebGPU or on ?gl=webgl2. A spike outside the field; the field takes the forms in step 2.
import { useEffect, useRef, useState } from "react";
import { SLOTS, type FormFaces } from "./faces";
import type { Lab, LabOptions, LabStatus, LabView } from "./scene";
import { OUTLINE } from "./form";

// Without entities (no media base in dev) the lab still runs on blank forms showing the test cards.
const PLACEHOLDERS: FormFaces[] = Array.from({ length: 9 }, (_, i) => ({
  id: "test-" + i, title: "test", ar: [1, 1.4, 0.7][i % 3], faces: SLOTS.map(() => null),
}));

const TOGGLES: [keyof LabOptions, string][] = [
  ["turn", "turn"], ["settle", "face the camera when near"], ["autoMorph", "morph by itself"],
  ["mixed", "per-form shape and outline"], ["test", "test cards"],
];

export default function FormsLab({ forms }: { forms: FormFaces[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const lab = useRef<Lab | null>(null);
  const [opts, setOpts] = useState<LabOptions>(() => ({
    turn: true, settle: true, mixed: false, test: forms.length === 0, autoMorph: false, shape: 0,
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
        <div>forms lab · EXP-0014 · EXP-0016</div>
        <div>
          {error ? "renderer failed: " + error
            : !status ? "starting…"
            : `${status.backend} · ${status.forms} forms · ${status.loaded}/${status.pictures} pictures · ${status.layers} layers · ${status.draws} draws`}
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
        {TOGGLES.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={opts[k] as boolean} onChange={e => set({ [k]: e.target.checked })} />
            <span>{label}</span>
          </label>
        ))}
        <div>drag to orbit · scroll to zoom · click a form to open it · ?gl=webgl2 forces WebGL 2</div>
      </div>
      {view && (
        <div className="field-label absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 text-xs">
          <span>{view.title}</span>
          <button type="button" className="underline" onClick={() => lab.current?.back()}>fold back (Esc)</button>
        </div>
      )}
    </main>
  );
}
