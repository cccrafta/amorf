// Forms settings: what the field's forms do, kept per browser like scroll.ts. Read on every frame by mesh.ts, so a change from
// the panel applies at once. Calm by default (EXP-0020 D5): the float is on and the satellites orbit; nothing else moves.
export type FormsTune = {
  // satellites shown, their orbit speed (a multiple of the lab's, 0 holds them) and size (a multiple)
  sats: boolean; orbit: number; satSize: number;
  // float amount (a multiple of the calm float, 0 is off)
  float: number;
  // the satellites' own turn, the automatic cube-sphere morph, and the forms' quarter turn
  satSpin: boolean; morph: boolean; turn: boolean;
};

export const FORMS_RANGES: { k: "orbit" | "satSize" | "float"; label: string; min: number; max: number; step: number }[] = [
  { k: "orbit", label: "orbit speed", min: 0, max: 3, step: 0.05 },
  { k: "satSize", label: "satellite size", min: 0.4, max: 2, step: 0.05 },
  { k: "float", label: "float", min: 0, max: 2, step: 0.05 },
];
export const FORMS_TOGGLES: { k: "sats" | "satSpin" | "morph" | "turn"; label: string }[] = [
  { k: "sats", label: "satellites" }, { k: "satSpin", label: "satellite spin" }, { k: "morph", label: "morph" }, { k: "turn", label: "turn" },
];

// With prefers-reduced-motion every motion starts off; the person can switch any back on.
export function formsDefaults(): FormsTune {
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { sats: true, orbit: reduced ? 0 : 1, satSize: 1, float: reduced ? 0 : 1, satSpin: false, morph: false, turn: false };
}

const KEY = "amorf.forms";

// Only keys the person changed are stored, so every other setting follows the current defaults (reduced motion included).
// Anything stored with the wrong type, a non-finite number or a value outside its range is dropped or clamped.
function read(): Partial<FormsTune> {
  if (typeof window === "undefined") return {};
  const d = formsDefaults() as Record<string, unknown>, out: Record<string, unknown> = {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (!raw || typeof raw !== "object") return {};
    for (const k of Object.keys(d)) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v !== typeof d[k]) continue;
      if (typeof v === "number") {
        if (!Number.isFinite(v)) continue;
        const r = FORMS_RANGES.find(x => x.k === k);
        out[k] = r ? Math.min(r.max, Math.max(r.min, v)) : v;
      } else out[k] = v;
    }
  } catch { /* unreadable: defaults */ }
  return out as Partial<FormsTune>;
}

const changed: Partial<FormsTune> = read();

// Mutated in place so every reader keeps the same object.
export const tune: FormsTune = { ...formsDefaults(), ...changed };

export function setTune(p: Partial<FormsTune>) {
  Object.assign(tune, p);
  Object.assign(changed, p);
  try { localStorage.setItem(KEY, JSON.stringify(changed)); } catch { /* private mode: the change lasts for this visit */ }
}

export function resetTune() {
  for (const k of Object.keys(changed)) delete changed[k as keyof FormsTune];
  Object.assign(tune, formsDefaults());
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
