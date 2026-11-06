// Board mesh: every entity's pictures as flat cards in one InstancedMesh. When an entity opens as a board (config.ts, the
// choreography), each cube flies toward its board place (form.ts) and, once it is flat, its card takes over in the same
// flight (flight.ts): the card starts as exactly the cube's flat face (place, lean, size, crop and shade), then grows to its
// place in the board layout (board.ts) and opens to its whole picture. A picture with no satellite grows from the form's place.
import type * as ThreeNS from "three/webgpu";
import type { Three, Tsl } from "./scene";
import type { FormFaces } from "./faces";
import type { Layers } from "./layers";
import { boardBounds, departure, landing, type BoardBounds, type BoardLayout } from "./board";
import { S_FLAT, type Flight } from "./flight";
import { proportion, type FormPlace, type FormUniforms } from "./form";
import { makeFloat } from "./float";
import type { Satellites } from "./satellites";
import type { Orbit } from "./orbit";
import { BOARD_CACHE, BOARD_PARALLEL, FLAT, LAYER, LIGHT_DIR, MODULE, SHADE_MIN } from "./config";
import { loadImage, makeStore } from "./texture-store";

// Per card, nine vec4s: A = form, bank layer, fx, fy (share of the layer the picture fills); B = board place x (across from
// the form's centre), y (height), width, height; C = departure (share of the explosion), form x, form centre y, form z;
// D = unused, face layer, start mode (0 from the form's centre, 1 from the form's front face, 2 from a satellite's), the
// form's half-depth; E = satellite r, e, omega, start anomaly;
// F = satellite tilt, azimuth, precession, half-size; G = start width, height, crop x, crop y; H = face scale x, y, crop
// centre x, y (the face's crop of the picture, in picture uv); I = satellite phase, spin, form's float seed, unused.
const STRIDE = 36;

type U = { value: number };
export type Board = {
  mesh: ThreeNS.InstancedMesh | null;
  u: { focus: U; explode: U };
  // Per form: the board's size and its centre height in world units, or null when the entity has no picture.
  bounds: (BoardBounds | null)[];
  // Fills the board's texture bank with one entity's pictures (cached ones at once, the rest as they arrive); a no-op when
  // that entity already holds the bank.
  ensure: (form: number) => void;
  dispose: () => void;
};

// layouts: each entity's board (board.ts), shared with the satellites' departures; of: the satellite that shows each board
// picture (satellites.ts); faces: the form textures, shown on a card until its own picture has arrived; fu: the forms'
// motion uniforms, so a card flies on from where its satellite floats (float.ts); flight: the shared flight (flight.ts).
export function makeBoard(
  THREE: Three, TSL: Tsl, forms: FormFaces[], places: FormPlace[], layouts: BoardLayout[], of: Satellites["of"], orbit: Orbit,
  faces: Pick<Layers, "tex" | "faceLayers" | "satLayers">, fu: Pick<FormUniforms, "m" | "drift">, flight: Flight,
): Board {
  const {
    float, int, vec2, vec3, vec4, uniform, positionGeometry, uv, instancedBufferAttribute, varying, texture, mix, select, max,
    clamp, dot, normalize,
  } = TSL;

  type Piece = { form: number; slot: number; url: string; fx: number; fy: number; data: number[] };
  const pieces: Piece[] = [];
  const byForm: number[][] = forms.map(() => []);
  const bounds = layouts.map(boardBounds);

  layouts.forEach((lay, i) => {
    const b = bounds[i];
    if (!b) return;
    const [ex, ey] = proportion(places[i].ar);
    lay.boxes.forEach((box, slot) => {
      const pic = forms[i].board[box.src], sat = of[i][box.src];
      // The picture is drawn uncropped into the layer's centre at its own ratio; fx and fy are the share of the layer it fills.
      const [fx, fy] = pic.ar <= 1 ? [1, pic.ar] : [1 / pic.ar, 1];
      const mode = box.src === 0 ? 1 : sat ? 2 : 0;
      const face = mode === 1 ? forms[i].faces[0] : mode === 2 ? { fit: "cover" as const, focal: undefined } : null;
      const faceLayer = mode === 1 ? faces.faceLayers[i][0] : mode === 2 ? faces.satLayers[i][box.src - 1] : -1;
      // The face shows a square layer of the picture: cover crops it to the share cw by ch about the focal point, contain
      // letterboxes it into the share sw by sh. Either way the layer is stretched over the front (2ex by 2ey for the hero,
      // a square for a satellite), so the card starts at that size showing the same part of the picture.
      const bw = box.w * MODULE, bh = box.h * MODULE;
      const [fw, fh] = mode === 1 ? [2 * ex, 2 * ey] : sat ? [2 * sat.size, 2 * sat.size] : [0, 0];
      const cw = Math.min(1, pic.ar), ch = Math.min(1, 1 / pic.ar);
      const sw = 1 / Math.max(1, pic.ar), sh = Math.min(1, pic.ar);
      // A picture with no face (mode 0) starts whole, so its crop, centre and scale are the identity.
      const contain = !face || face.fit === "contain";
      const [fcx, fcy] = face?.focal ?? [0.5, 0.5];
      const start = contain ? [fw * sw, fh * sh, 1, 1] : [fw, fh, cw, ch];
      // Picture uv runs up from the bottom; the focal point is measured down from the top.
      const centre = contain ? [0.5, 0.5] : [cw / 2 + (1 - cw) * fcx, 1 - (ch / 2 + (1 - ch) * fcy)];
      const scale = contain ? [sw, sh] : [1 / cw, 1 / ch];
      const at = landing(lay, box);
      byForm[i].push(pieces.length);
      pieces.push({
        form: i, slot, url: pic.url, fx, fy,
        data: [i, slot, fx, fy, at.x, at.y, bw, bh,
          departure(box.delay), places[i].x, ey, places[i].z,
          0, faceLayer, mode, mode === 1 ? ex : 0,
          sat?.r ?? 0, sat?.e ?? 0, sat?.omega ?? 0, sat?.theta0 ?? 0,
          sat?.tilt ?? 0, sat?.azim ?? 0, sat?.prec ?? 0, sat?.size ?? 0,
          ...start, ...scale, ...centre,
          sat?.phase ?? 0, sat?.spin ?? 0, sat?.parentPhase ?? 0, 0],
      });
    });
  });

  const u = { focus: uniform(-1), explode: uniform(0) };
  if (!pieces.length) return { mesh: null, u, bounds, ensure: () => {}, dispose: () => {} };

  // The bank holds one entity's pictures at a time, a layer per card; a one-layer array is not an array to three (Texture.js).
  const { tex, write, clear } = makeStore(THREE, Math.max(2, ...byForm.map(k => k.length)));
  const data = new Float32Array(pieces.length * STRIDE);
  pieces.forEach((p, k) => data.set(p.data, k * STRIDE));
  // An InstancedInterleavedBuffer, not a bare array: see the same note in form.ts.
  const buf = new THREE.InstancedInterleavedBuffer(data, STRIDE, 1);
  const v4 = (node: unknown) => node as ThreeNS.Node<"vec4">;
  const [iA, iB, iC, iD, iE, iF, iG, iH, iI] = [0, 4, 8, 12, 16, 20, 24, 28, 32].map(off => v4(instancedBufferAttribute(buf, "vec4", STRIDE, off)));

  // tau: this card's own flight, 0 to 1, from its departure. Only the focused entity's cards show: one from a cube once the
  // cube is flat (FLAT into the flight), one with no cube from its start.
  const tau = flight.tauOf(u.explode, iC.x);
  const mode = iD.z, isSat = mode.greaterThan(1.5), fromCube = mode.greaterThan(0.5);
  const shown = select(fromCube, tau.greaterThanEqual(FLAT), tau.greaterThan(1e-4));
  const here = iA.x.sub(u.focus).abs().lessThan(0.5).and(shown);
  const satK = orbit.u.size.mul(orbit.u.on);
  // A satellite's card flies on from its moving cube's centre, placed as form.ts places it once its shape has calmed: on its
  // orbit, floating with its form.
  const params = { r: iE.x, e: iE.y, omega: iE.z, theta0: iE.w, tilt: iF.x, azim: iF.y, prec: iF.z };
  const orb = orbit.offset(params);
  const ahead = orbit.offset(params, (orbit.u.t as unknown as ThreeNS.Node<"float">).add(0.05)).sub(orb);
  const { bob, sway, hover } = makeFloat(TSL, fu.m, fu.drift)(iI.z, float(1), float(1));
  const base = vec3(iC.y, iC.z, iC.w);
  const satCentre = vec3(base.x.add(sway.x).add(orb.x), max(base.y.add(hover).add(bob).add(orb.y), iF.w.mul(satK)), base.z.add(sway.y).add(orb.z));
  const S = select(isSat, mix(base, satCentre, orbit.u.on), base);
  const fl = flight.fly(S, flight.place(iB.x, iB.y), select(isSat, flight.away(ahead), flight.normal), tau);
  // g: the card's own growth, 0 when it takes over from the flat cube (the ease at S_FLAT), 1 at its place. Size, crop
  // and shade run on it from the face's to the board's.
  const g = clamp(select(fromCube, fl.s.sub(S_FLAT).div(1 - S_FLAT), fl.s), 0, 1);
  const dims = mix(iG.xy.mul(select(isSat, satK, float(1))), iB.zw, g);
  // It starts in the plane of the cube's flat face, the cube's half-depth in front of the flight's centre, a hair proud of
  // it, and comes down onto the board as it grows.
  const depth = select(isSat, iF.w.mul(satK), iD.w).add(select(fromCube, float(0.004), float(0))).mul(float(1).sub(g));
  const corner = flight.orient(vec3(positionGeometry.x.mul(dims.x), positionGeometry.y.mul(dims.y), depth), fl.ax, fl.ay);

  // The instance matrix is identity and unused, as in form.ts: positionNode places the vertex from the attributes.
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  mat.positionNode = fl.pos.add(corner).mul(select(here, float(1), float(0)));

  // The card's view of its picture: the face's crop about the face's centre at the start, the whole picture at the end.
  const crop = mix(iG.zw, vec2(1, 1), g);
  const pic = uv().sub(0.5).mul(crop).add(mix(iH.zw, vec2(0.5, 0.5), g));
  const layer = varying(iA.y).setInterpolation(THREE.InterpolationSamplingType.FLAT);
  const faceLayer = varying(iD.y).setInterpolation(THREE.InterpolationSamplingType.FLAT);
  // The picture fills the centre fx by fy of its bank layer.
  const own = texture(tex, pic.sub(0.5).mul(vec2(iA.z, iA.w)).add(0.5)).depth(int(layer.add(0.5)));
  // Until the card's own picture is in the bank it shows the face's layer (the same picture, square-cropped or contained),
  // so a card never flies empty; outside the face's part of the picture it is transparent.
  const fuv = pic.sub(iH.zw).mul(iH.xy).add(0.5);
  const inFace = fuv.x.greaterThanEqual(0).and(fuv.x.lessThanEqual(1)).and(fuv.y.greaterThanEqual(0)).and(fuv.y.lessThanEqual(1))
    .and(faceLayer.greaterThan(-0.5));
  const fallback = texture(faces.tex, fuv).depth(int(max(faceLayer, 0).add(0.5)));
  const ready = own.a.greaterThan(0.5);
  // The flat cube's face is shaded by its turn to the light; the board's pictures are not.
  const shade0 = float(SHADE_MIN).add(max(dot(flight.orient(vec3(0, 0, 1), fl.ax, fl.ay), normalize(vec3(...LIGHT_DIR))), 0).mul(1 - SHADE_MIN));
  const shade = mix(shade0, float(1), g);
  mat.colorNode = vec4(select(ready, own.rgb, fallback.rgb).mul(shade), 1);
  mat.opacityNode = select(ready, own.a, select(inFace, fallback.a, float(0)));
  mat.alphaTest = 0.5;

  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mat, pieces.length);
  mesh.frustumCulled = false;

  // Drawn pictures by url, most recently used last, so reopening an entity (or one hovered before) fills the bank at once.
  const cache = new Map<string, HTMLCanvasElement>();
  const remember = (url: string, cv: HTMLCanvasElement) => {
    cache.delete(url);
    cache.set(url, cv);
    if (cache.size > BOARD_CACHE) cache.delete(cache.keys().next().value!);
  };
  let owner = -1, active = 0, alive = true;
  const queue: number[] = [];
  const pump = () => {
    while (alive && active < BOARD_PARALLEL && queue.length) {
      const p = pieces[queue.shift()!];
      active++;
      loadImage(p.url)
        .then(img => {
          const cv = drawFit(img, p.fx, p.fy);
          img.close();
          remember(p.url, cv);
          // A late picture is written only while its entity still holds the bank.
          if (alive && owner === p.form) write(p.slot, cv);
        })
        .catch(err => console.warn("[forms-lab] board picture failed", p.url, err))
        .finally(() => { active--; pump(); });
    }
  };

  return {
    mesh, u, bounds,
    ensure: form => {
      if (form === owner || !byForm[form]?.length) return;
      owner = form;
      queue.length = 0;
      for (const k of byForm[form]) {
        const p = pieces[k], cv = cache.get(p.url);
        if (cv) { remember(p.url, cv); write(p.slot, cv); } else { clear(p.slot); queue.push(k); }
      }
      pump();
    },
    dispose: () => { alive = false; geo.dispose(); mat.dispose(); tex.dispose(); },
  };
}

// The picture stretched to its own ratio into the layer's centre fx by fy, the rest transparent.
function drawFit(img: ImageBitmap, fx: number, fy: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = LAYER;
  const c = cv.getContext("2d")!;
  c.drawImage(img, (LAYER * (1 - fx)) / 2, (LAYER * (1 - fy)) / 2, LAYER * fx, LAYER * fy);
  return cv;
}
