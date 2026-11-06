// The field's 3D world: one three.js WebGPURenderer (WebGPU, or its WebGL 2 backend when WebGPU is missing), one scene and
// one camera, drawn on a canvas behind the DOM cards and kept in step with the CSS camera from frame(). three is loaded by
// dynamic import, so it stays out of the eager bundle and is never fetched under ?gl=0. ?gl=webgl2 forces the WebGL 2 backend.
// Today the world holds only the ground; entities, routes and spaces join it in later steps (docs/design/one-world-many-cameras.md).
// Limit: hidden inside a space, where the camera is the space's own view and not f.cam.
import type * as ThreeNS from "three/webgpu";
import type Field from "./Field";
import { inSpace } from "./spaces";
import { fitCamera, eyeAt } from "./ground-math";
import { makeGround, type Ground } from "./ground";

export type Three = typeof ThreeNS;
export type Tsl = typeof import("three/tsl");

export type WorldRt = {
  three: Three;
  canvas: HTMLCanvasElement;
  renderer: ThreeNS.WebGPURenderer;
  backend: "webgpu" | "webgl2";
  scene: ThreeNS.Scene;
  camera: ThreeNS.PerspectiveCamera;
  ground: Ground;
  w: number;
  h: number;
  dpr: number;
  key: string;
};

export const parseGl = (search: string) => new URLSearchParams(search).get("gl") !== "0";
const forceWebGL = (search: string) => new URLSearchParams(search).get("gl") === "webgl2";
export const glVals = (f: Field) => ({ glOn: f.glOn });

// Starts three's import once the canvas is in the DOM (paintWorld retries until then). Asynchronous: until the renderer has
// finished init() f.gl is null, and frame() keeps running without it.
export function initWorld(f: Field) {
  if (f.gl || f.glPending) return;
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-role="ground"]');
  if (!canvas) return;
  f.glPending = true;
  let renderer: ThreeNS.WebGPURenderer | null = null;
  Promise.all([import("three/webgpu"), import("three/tsl")]).then(async ([THREE, TSL]) => {
    if (!f.glOn || !canvas.isConnected) { f.glPending = false; return; }
    renderer = new THREE.WebGPURenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power", forceWebGL: forceWebGL(location.search) });
    renderer.setClearColor(0x000000, 0);
    await renderer.init();
    f.glPending = false;
    if (!f.glOn || !canvas.isConnected) { renderer.dispose(); return; }

    const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? "webgpu" : "webgl2";
    const scene = new THREE.Scene();
    const ground = makeGround(THREE, TSL, renderer, f);
    scene.add(ground.mesh);

    const camera = new THREE.PerspectiveCamera(50, 1, 10, f.P + f.FAR * 4 + ground.size);
    // The renderer only relabels a camera's coordinate system and does not rebuild its matrix, which would leave WebGL's
    // -1..1 depth on WebGPU's 0..1 clip; set it first so fitCamera builds the matrix for this backend.
    camera.coordinateSystem = renderer.coordinateSystem;
    f.gl = { three: THREE, canvas, renderer, backend, scene, camera, ground, w: 0, h: 0, dpr: 0, key: "" };
    canvas.dataset.backend = backend;
  }).catch(err => {
    // switched off for the session, so paintWorld does not retry every frame
    f.glPending = false; f.glOn = false;
    renderer?.dispose();
    console.warn("[amorf] world renderer failed to start", err);
  });
}

export function disposeWorld(f: Field) {
  const g = f.gl;
  f.gl = null;
  if (!g) return;
  g.ground.dispose();
  g.renderer.dispose();
}

function fit(f: Field, g: WorldRt, W: number, H: number, dpr: number) {
  g.w = W; g.h = H; g.dpr = dpr;
  g.renderer.setPixelRatio(dpr);
  g.renderer.setSize(W, H, false);
  fitCamera(g.camera, W, H, f.P);
  g.key = "";
}

// Called every frame from frame(): drawn only when the camera, the window or the visibility changed. render() is the
// synchronous call; it is valid because init() resolved before f.gl was set.
export function paintWorld(f: Field) {
  const g = f.gl;
  if (!g) { initWorld(f); return; }
  if (!g.canvas.isConnected) { disposeWorld(f); initWorld(f); return; }
  const hide = inSpace(f);
  if (g.canvas.style.display !== (hide ? "none" : "block")) g.canvas.style.display = hide ? "none" : "block";
  if (hide) return;
  // The world leaves with the field when an entity is opened, like the cards do.
  const op = (1 - f.ix.depth).toFixed(2);
  if (g.canvas.style.opacity !== op) g.canvas.style.opacity = op;

  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (W !== g.w || H !== g.h || dpr !== g.dpr) fit(f, g, W, H, dpr);

  const cam = f.cam, eye = eyeAt(cam.x, cam.z, cam.yaw, f.P);
  const key = eye.x.toFixed(1) + "|" + eye.z.toFixed(1) + "|" + cam.yaw.toFixed(2);
  if (key === g.key) return;
  g.key = key;

  g.ground.place(eye.x, eye.z);
  g.camera.rotation.y = eye.rotY;
  g.renderer.render(g.scene, g.camera);
}

// Cards stand on the ground whenever it is drawn (or about to be: the flag is on and three is still loading, so they do not
// jump when it arrives). frame() then drops each card's scatter and seats its bottom edge on the plane.
export const groundPinned = (f: Field) => f.glOn && !inSpace(f);
