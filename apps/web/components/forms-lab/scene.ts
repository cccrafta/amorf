// Forms lab scene: one WebGPURenderer (WebGPU, or its WebGL 2 backend under ?gl=webgl2), an orbit camera, a faint ground
// grid and every entity's form. three is loaded by dynamic import, as in the field (components/field/world.ts).
import type * as ThreeNS from "three/webgpu";
import type { FormFaces } from "./faces";
import { makeLayers } from "./layers";
import { makeForms, OUTLINE, proportion, type FormPlace, type Outline } from "./form";
import { readCssColor } from "@/lib/css-color";

export type Three = typeof ThreeNS;
export type Tsl = typeof import("three/tsl");

export type LabOptions = { turn: boolean; settle: boolean; mixed: boolean; test: boolean; autoMorph: boolean; shape: number } & Outline;
export type LabStatus = {
  backend: "webgpu" | "webgl2"; forms: number; pictures: number; loaded: number; layers: number; draws: number; shape: number;
};
// The entity view: the title of the form in view, or null in the free view.
export type LabView = { title: string } | null;
export type Lab = { set: (o: Partial<LabOptions>) => void; back: () => void; dispose: () => void };

const SPACING = 4.5;
// Seconds for the camera to travel in and the form to unfold (or the reverse).
const VIEW_SECONDS = 1.8;
// The view's progress p runs 0 to 1: the form calms to a plain box over the first part, then unfolds over the rest.
const CALM_END = 0.35;
// A press that moves less than this many pixels is a click; more is an orbit drag.
const CLICK_SLOP = 5;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// One full cube, sphere and back cycle of the automatic morph, in seconds.
const MORPH_PERIOD = 8;

export const forceWebGL = (search: string) => new URLSearchParams(search).get("gl") === "webgl2";

// A seeded value per form and parameter, so "per-form" shows the same varied field on every load.
const hash = (i: number, k: number) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
// Each form gets one or two outline parameters, not all five, so the variety stays readable.
function ownOutline(i: number): Outline {
  const o = Object.fromEntries(OUTLINE.map(k => [k, 0])) as Outline;
  const first = OUTLINE[Math.floor(hash(i, 1) * OUTLINE.length)];
  o[first] = 0.3 + hash(i, 2) * 0.7;
  if (hash(i, 3) > 0.5) o[OUTLINE[Math.floor(hash(i, 4) * OUTLINE.length)]] = 0.3 + hash(i, 5) * 0.7;
  return o;
}

function placesOf(forms: FormFaces[], faceLayers: number[][]): FormPlace[] {
  const cols = Math.ceil(Math.sqrt(forms.length));
  return forms.map((f, i) => ({
    x: (i % cols - (cols - 1) / 2) * SPACING,
    z: (Math.floor(i / cols) - (Math.ceil(forms.length / cols) - 1) / 2) * SPACING,
    ar: f.ar,
    // An irrational step, so neighbours never share a turn phase.
    phase: (i * 1.618) % 4,
    ownShape: (i % 3) / 2,
    own: ownOutline(i),
    layers: faceLayers[i],
  }));
}

export async function startLab(
  canvas: HTMLCanvasElement, forms: FormFaces[], opts: LabOptions, onStatus: (s: LabStatus) => void, onView: (v: LabView) => void,
): Promise<Lab> {
  const [THREE, TSL, { OrbitControls }] = await Promise.all([
    import("three/webgpu"), import("three/tsl"), import("three/addons/controls/OrbitControls.js"),
  ]);

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: forceWebGL(location.search) });
  await renderer.init();
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? "webgpu" : "webgl2";
  canvas.dataset.backend = backend;

  const bg = readCssColor("--field-bg", "#1e1e1e"), ink = readCssColor("--field-ink", "#bdbab0");
  renderer.setClearColor(new THREE.Color().setRGB(bg[0] / 255, bg[1] / 255, bg[2] / 255, THREE.SRGBColorSpace), 1);

  const layers = makeLayers(THREE, forms, ink, bg);
  const pictures = layers.total - 6;
  const places = placesOf(forms, layers.faceLayers);
  const formsObj = makeForms(THREE, TSL, places, layers.tex, ink);
  const scene = new THREE.Scene();
  scene.add(formsObj.mesh);

  const extent = Math.ceil(Math.sqrt(forms.length)) * SPACING;
  const inkColor = new THREE.Color().setRGB(ink[0] / 255, ink[1] / 255, ink[2] / 255, THREE.SRGBColorSpace);
  const grid = new THREE.GridHelper(extent + SPACING * 4, Math.round((extent + SPACING * 4) / 1.5), inkColor, inkColor);
  const gridMat = grid.material as ThreeNS.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.14;
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  // The renderer only relabels the coordinate system at render time; set it so the projection is built for this backend (EXP-0013).
  camera.coordinateSystem = renderer.coordinateSystem;
  camera.position.set(0, 3.2, extent / 2 + 9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  fit();
  window.addEventListener("resize", fit);

  const u = formsObj.u;
  const apply = () => {
    u.mixed.value = opts.mixed ? 1 : 0;
    u.settle.value = opts.settle ? 1 : 0;
    u.test.value = opts.test ? 1 : 0;
    if (!opts.autoMorph) u.shape.value = opts.shape;
    for (const k of OUTLINE) u[k].value = opts[k];
  };
  apply();

  // Entity view: p runs toward goal (1 in, 0 out) while a form is in view; focus is null in the free view. The form's own
  // motion lives in the shader (u.focus, u.open, u.unfold); this code moves the camera and picks the form.
  type Focus = { i: number; x: number; z: number; w: number; h: number; from: ThreeNS.Vector3; fromTarget: ThreeNS.Vector3 };
  let focus: Focus | null = null, p = 0, goal = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ball = new THREE.Sphere(), hit = new THREE.Vector3();
  const toTarget = new THREE.Vector3(), toPos = new THREE.Vector3();

  // A ray against one bounding sphere per form, from the known places: no GPU picking, since the shader moves the vertices.
  const formAt = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = -1, bestD = Infinity;
    places.forEach((pl, i) => {
      const [w, h] = proportion(pl.ar);
      ball.set(hit.set(pl.x, h * 1.1, pl.z), Math.max(w, h) * 1.35);
      if (ray.ray.intersectSphere(ball, hit)) {
        const d = hit.distanceTo(ray.ray.origin);
        if (d < bestD) { bestD = d; best = i; }
      }
    });
    return best;
  };

  const enter = (i: number) => {
    const [w, h] = proportion(places[i].ar);
    focus = { i, x: places[i].x, z: places[i].z, w, h, from: camera.position.clone(), fromTarget: controls.target.clone() };
    u.focus.value = i;
    goal = 1;
    controls.enabled = false;
    canvas.style.cursor = "";
    onView({ title: forms[i].title });
  };
  const back = () => { if (focus && goal === 1) { goal = 0; onView(null); } };

  // The camera ends straight in front of the net, far enough to fit it (2W + 4D wide, 4H + 4D tall, W = D) with a margin.
  const stepView = (dt: number) => {
    if (!focus) return;
    p += Math.sign(goal - p) * Math.min(Math.abs(goal - p), dt / VIEW_SECONDS);
    u.open.value = smooth(0, CALM_END, p);
    u.unfold.value = smooth(CALM_END, 1, p);
    const { x, z, w, h } = focus;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((4 * h + 4 * w) / 2 / half, (6 * w) / 2 / (half * camera.aspect)) * 1.15;
    const e = smooth(0, 1, p);
    toTarget.set(x, 2 * h + 2 * w, z + w);
    toPos.set(x, 2 * h + 2 * w, z + w + dist);
    camera.position.lerpVectors(focus.from, toPos, e);
    camera.lookAt(hit.lerpVectors(focus.fromTarget, toTarget, e));
    if (p === 0 && goal === 0) {
      controls.target.copy(focus.fromTarget);
      controls.enabled = true;
      u.focus.value = -1;
      focus = null;
      controls.update();
    }
  };

  let press: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => { press = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    const start = press;
    press = null;
    if (!start || focus || e.button !== 0 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP) return;
    const i = formAt(e);
    if (i >= 0) enter(i);
  };
  const onMove = (e: PointerEvent) => { if (!focus && e.buttons === 0) canvas.style.cursor = formAt(e) >= 0 ? "pointer" : ""; };
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") back(); };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("keydown", onKey);

  let loaded = 0, draws = 0, last = performance.now(), lastStatus = 0, morphT = Math.acos(1 - 2 * opts.shape) / (2 * Math.PI) * MORPH_PERIOD;
  const status = () => onStatus({ backend, forms: forms.length, pictures, loaded, layers: layers.total, draws, shape: u.shape.value });
  layers.load(done => { loaded = done; });

  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (opts.turn) u.turnT.value += dt;
    if (opts.autoMorph) {
      morphT += dt;
      u.shape.value = 0.5 - 0.5 * Math.cos((morphT / MORPH_PERIOD) * Math.PI * 2);
    }
    if (focus) stepView(dt); else controls.update();
    renderer.render(scene, camera);
    draws = renderer.info.render.drawCalls;
    if (now - lastStatus > 250) { lastStatus = now; status(); }
  });

  return {
    set: o => {
      // Picking up the automatic morph from the slider's value, so the form does not jump.
      if (o.autoMorph && !opts.autoMorph) morphT = Math.acos(1 - 2 * u.shape.value) / (2 * Math.PI) * MORPH_PERIOD;
      Object.assign(opts, o);
      apply();
    },
    back,
    dispose: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.style.cursor = "";
      controls.dispose();
      formsObj.dispose();
      layers.dispose();
      grid.geometry.dispose();
      gridMat.dispose();
      renderer.dispose();
    },
  };
}
