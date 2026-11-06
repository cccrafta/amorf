// Satellites (DDR-0005, EXP-0018): an entity's pictures after its cover, each a small cube orbiting the entity's form. Count is
// the picture count (up to MAX_SAT), so the cluster reads how much an entity holds; placement is seeded by the entity id.
import type { FormFaces } from "./faces";
import { proportion, type FormPlace, type Sat } from "./form";
import { ECC_MAX, ECC_MIN, ORBIT_K, PER_SHELL, SAT_MAX, SAT_MIN, SAT_SIZE_CURVE, SHELL_GAP } from "./config";

// Shells are ellipses shared by their satellites, spaced evenly in mean anomaly at one speed. Shells occupy disjoint distance
// bands from the form, each as wide as the shell's biggest satellite plus a gap, so satellites of different shells never touch
// whatever their phase; on one shell they are far apart for any size.

// A string to a number in [0, 1), the same on every load.
const seedOf = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const hash = (seed: number, k: number) => { const s = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

export type Satellites = {
  // Appended after the main forms, so a satellite's instance index is forms.length + its position here.
  sats: FormPlace[];
  // Per form, the outermost orbit distance plus a satellite's size, for picking the cluster.
  reach: number[];
  // Per form, per board picture index (the cover is 0, which has none): the satellite that shows it, if any.
  of: (Sat | undefined)[][];
};

export function satellitesOf(forms: FormFaces[], places: FormPlace[], satLayers: number[][]): Satellites {
  const sats: FormPlace[] = [];
  const reach = forms.map(() => 0);
  const of = forms.map(() => [] as (Sat | undefined)[]);
  const none = { taper: 0, twist: 0, bend: 0, relief: 0, cut: 0 };
  forms.forEach((f, i) => {
    const seed = seedOf(f.id);
    // Board picture k + 1 is satellite candidate k; one past the layer budget has no layer and no satellite.
    const picks = satLayers[i].flatMap((layer, k) => (layer >= 0 ? [{ src: k + 1, layer }] : []));
    const [w, h] = proportion(places[i].ar);
    const sizes = picks.map((_, k) => SAT_MIN + (SAT_MAX - SAT_MIN) * hash(seed, 100 + k) ** SAT_SIZE_CURVE);
    // All shells turn the way the entity's seed says, with an occasional counter-rotating shell; the form's corners (the
    // cube turns) set how close the first shell may come.
    const dir = hash(seed, 39) > 0.5 ? 1 : -1;
    let cursor = Math.hypot(w, w, h) + 0.1;
    for (let shell = 0, first = 0; first < picks.length; shell++, first += PER_SHELL) {
      const count = Math.min(PER_SHELL, picks.length - first);
      // A satellite's bounding radius is its half-extent times sqrt(3).
      const bound = Math.max(...sizes.slice(first, first + count)) * Math.sqrt(3);
      const e = ECC_MIN + hash(seed, 60 + shell) * (ECC_MAX - ECC_MIN);
      const a = (cursor + bound) / (1 - e);
      cursor = a * (1 + e) + bound + SHELL_GAP;
      const flip = shell > 0 && hash(seed, 41 + shell) > 0.7 ? -1 : 1;
      const orbit = {
        r: a, e, omega: dir * flip * ORBIT_K * a ** -1.5,
        tilt: 0.1 + hash(seed, 10 + shell) * 0.5, azim: hash(seed, 20 + shell) * Math.PI * 2,
        // A plane precesses a few degrees a minute, and not in step with the next shell's.
        prec: (hash(seed, 70 + shell) - 0.5) * 0.06,
      };
      const start = hash(seed, 50 + shell) * Math.PI * 2;
      for (let s = 0; s < count; s++) {
        const k = first + s, { src, layer } = picks[k];
        const sat: Sat = {
          ...orbit, size: sizes[k], parentH: h, parentPhase: places[i].phase, parent: i,
          theta0: start + (s / count) * Math.PI * 2,
          spin: (hash(seed, 80 + k) - 0.5) * 0.7, phase: hash(seed, 200 + k) * 4,
        };
        of[i][src] = sat;
        reach[i] = Math.max(reach[i], a * (1 + e) + sizes[k] * 1.8);
        sats.push({
          x: places[i].x, z: places[i].z, ar: 1,
          phase: sat.phase, ownShape: 0, own: { ...none },
          layers: Array(6).fill(layer), sat,
        });
      }
    }
  });
  return { sats, reach, of };
}
