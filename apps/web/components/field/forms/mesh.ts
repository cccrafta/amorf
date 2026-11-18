// The field's forms in three.js (EXP-0020): every entity with a picture is one instance of the forms lab's mesh, its satellites
// more instances, all added to the field's own scene so they share its renderer and camera. Each frame frame() hands over every
// shown card's numbers and plateAnchor turns them into the instance's eye-frame centre. Dynamic import only (runtime.ts).
import type Field from "../Field";
import type { WorldRt } from "../world";
import { formFaces, type FormFaces } from "../../forms-lab/faces";
import { makeLayers } from "../../forms-lab/layers";
import { satellitesOf } from "../../forms-lab/satellites";
import { makeOrbit } from "../../forms-lab/orbit";
import { makeFlight } from "../../forms-lab/flight";
import { makeForms, CHANNELS, type FormPlace, type Sat } from "../../forms-lab/form";
import { DEFAULT_MOTION, MORPH_PERIOD } from "../../forms-lab/config";
import { readCssColor } from "@/lib/css-color";
import { tune } from "./settings";
import { plateAnchor, type CardPlace } from "./anchor";
import { FLOAT_SCALE, ROT_SCALE, SAT_REACH } from "./config";
import type { FormsRt } from "./runtime";

const NO_OUTLINE = { taper: 0, twist: 0, bend: 0, relief: 0, cut: 0 };

export async function buildForms(f: Field, g: WorldRt): Promise<FormsRt> {
  const TSL = await import("three/tsl");
  const THREE = g.three;

  const ids: string[] = [], faces: FormFaces[] = [];
  for (const o of f.OBJECTS) {
    const ff = formFaces(o);
    if (ff) { ids.push(o.id); faces.push(ff); }
  }
  const index = new Map(ids.map((id, i) => [id, i]));
  const seen = new Uint8Array(ids.length);

  // Nothing to draw: an entity set without a picture keeps its DOM cards.
  const rt: FormsRt = {
    rev: 0, begin: () => {}, place: () => {}, end: () => {}, ready: () => false, step: () => {}, moving: () => false, dispose: () => {},
  };
  if (!ids.length) return rt;

  const bg = readCssColor("--field-bg", "#1e1e1e"), ink = readCssColor("--field-ink", "#bdbab0"), fog = readCssColor("--field-bg-mid", "#111111");
  const layers = makeLayers(THREE, faces, ink, bg);
  const places: FormPlace[] = faces.map((ff, i) => ({
    x: 0, z: 0, ar: ff.ar, phase: (i * 1.618) % 4, ownShape: 0, own: { ...NO_OUTLINE }, layers: layers.faceLayers[i],
  }));
  const { sats } = satellitesOf(faces, places, layers.satLayers);
  // One orbit plane per entity: every shell takes the first shell's tilt, azimuth and precession, so a cluster reads as one disc.
  const lead = new Map<number, Sat>();
  for (const sp of sats) {
    const s = sp.sat!, l = lead.get(s.parent);
    if (!l) lead.set(s.parent, s); else { s.tilt = l.tilt; s.azim = l.azim; s.prec = l.prec; }
  }

  const orbit = makeOrbit(TSL), flight = makeFlight(THREE, TSL);
  const forms = makeForms(THREE, TSL, [...places, ...sats], layers.tex, orbit, flight, ids.length);
  const an = forms.an!, u = forms.u;
  an.fog.setRGB(fog[0] / 255, fog[1] / 255, fog[2] / 255, THREE.SRGBColorSpace);
  // The lab's ground-bound parts are off: no settling toward the camera, no hover (the centre is the card's).
  u.settle.value = 0; u.mixed.value = 0; u.m.amp.hover.value = 0; u.m.nearCalm.value = 0;
  orbit.u.radius.value = SAT_REACH;

  const loaded = new Set<number>();
  let dead = false, morphT = 0, last = "", shown = false;
  const coverReady = (i: number) => loaded.has(layers.faceLayers[i][0]);

  // A failure after the mesh is in the scene must not leave it, its textures or the layer loader behind.
  const undo = () => {
    dead = true;
    g.scene.remove(forms.mesh);
    forms.mesh.dispose();
    forms.dispose();
    layers.dispose();
  };
  try {
    g.scene.add(forms.mesh);
    try { await g.renderer.compileAsync(g.scene, g.camera); } catch { /* the first render compiles it */ }
    layers.load((_done, layer, ok) => { if (ok && !dead) { loaded.add(layer); rt.rev++; } });
  } catch (err) { undo(); throw err; }

  Object.assign(rt, {
    begin: () => seen.fill(0),
    place: (id: string, c: CardPlace, op: number) => {
      const i = index.get(id);
      if (i === undefined) return;
      seen[i] = 1;
      const a = plateAnchor(c, faces[i].ar);
      if (an.set(i, { ...a, w: coverReady(i) ? op : 0 })) rt.rev++;
    },
    end: () => {
      shown = false;
      for (let i = 0; i < seen.length; i++) {
        const a = an.get(i);
        if (!seen[i] && a.w !== 0 && an.set(i, { ...a, w: 0 })) rt.rev++;
        else if (a.w > 0) shown = true;
      }
    },
    ready: (id: string) => { const i = index.get(id); return i !== undefined && coverReady(i); },
    step: (dt: number, lightYaw: number) => {
      const a = tune.float;
      for (const c of CHANNELS) {
        u.m.t[c].value += dt * DEFAULT_MOTION.channels[c].speed;
        if (c !== "hover") u.m.amp[c].value = DEFAULT_MOTION.channels[c].amp * a * (c === "bob" || c === "sway" ? FLOAT_SCALE : ROT_SCALE);
      }
      u.drift.value = a > 0 ? 1 : 0;
      orbit.u.on.value = tune.sats ? 1 : 0;
      orbit.u.size.value = tune.satSize;
      u.spin.value = tune.satSpin ? 1 : 0;
      u.turnOn.value = tune.turn ? 1 : 0;
      if (tune.turn) u.turnT.value += dt * DEFAULT_MOTION.turnSpeed;
      orbit.u.t.value += dt * tune.orbit;
      if (tune.morph) { morphT += dt; u.shape.value = 0.5 - 0.5 * Math.cos((morphT / MORPH_PERIOD) * Math.PI * 2); } else u.shape.value = 0;
      u.lightYaw.value = lightYaw;
      // a static setting (size, satellites on or off) must repaint even when nothing moves
      const key = JSON.stringify(tune);
      if (key !== last) { last = key; rt.rev++; }
    },
    moving: () => shown && (tune.float > 0 || tune.turn || tune.morph || (sats.length > 0 && tune.sats && tune.orbit > 0)),
    dispose: undo,
  } satisfies Partial<FormsRt>);
  return rt;
}
