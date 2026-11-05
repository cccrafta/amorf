// WebGL ground (on by default; ?gl=0 turns it off and leaves the CSS-only field): a textured plane that recedes to a horizon,
// drawn by three.js on a canvas behind the DOM cards and kept in step with the CSS camera from frame(). three is loaded with a
// dynamic import, so it stays out of the eager bundle and is never fetched under ?gl=0. Cards stand on it (groundPinned).
// Limit: hidden inside a space, where the camera is the space's own view and not f.cam.
import type * as ThreeNS from "three";
import type Field from "./Field";
import { inSpace } from "./spaces";
import { fitCamera, eyeAt, textureOffset } from "./ground-math";

type Three = typeof ThreeNS;
type Rgb = [number, number, number];

export type GroundRt = {
  three: Three;
  canvas: HTMLCanvasElement;
  renderer: ThreeNS.WebGLRenderer;
  scene: ThreeNS.Scene;
  camera: ThreeNS.PerspectiveCamera;
  tex: ThreeNS.CanvasTexture;
  geo: ThreeNS.PlaneGeometry;
  mat: ThreeNS.MeshBasicMaterial;
  size: number;
  period: number;
  w: number;
  h: number;
  dpr: number;
  eye: number;
  key: string;
};

export const parseGl = (search: string) => new URLSearchParams(search).get("gl") !== "0";
export const glVals = (f: Field) => ({ glOn: f.glOn });

// The torus is TILE wide; the texture repeats TILE / CELLS units, so the pattern closes on itself after one wrap.
const CELLS = 20;
// One texture period holds DIV equal squares; every DIV/2-th line is stronger, the period edge strongest.
const DIV = 10;
const TEX = 1024;
// Fog, as distance in front of the camera frame (the same d the cards use); the ground is transparent from FOG_FAR on.
const FOG_NEAR = 400;
const FOG_FAR_OF_FAR = 1.3;
const TINT = 0.06;

// Any CSS colour (hex, color-mix, oklch) resolved to rgb by letting a 1px canvas parse it.
function readColor(name: string, fallback: string): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c) return [128, 128, 128];
  c.fillStyle = fallback;
  c.fillStyle = raw || fallback;
  c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

const rgba = (c: Rgb, a: number) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";

// One period of the ground. Every pixel carries ink rgb (even where nearly transparent), so mipmap averaging toward the
// horizon blends tone and does not darken the lines. Lines are centred on the edges, so the copy beside it closes the line.
function drawPeriod(line: Rgb, ink: Rgb): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = TEX;
  const c = cv.getContext("2d")!;
  c.fillStyle = rgba(ink, TINT);
  c.fillRect(0, 0, TEX, TEX);
  const cell = TEX / DIV;
  for (let i = 0; i <= DIV; i++) {
    const edge = i % DIV === 0, mid = i % (DIV / 2) === 0;
    const w = edge ? 3 : mid ? 2 : 1;
    c.fillStyle = rgba(line, edge ? 0.55 : mid ? 0.34 : 0.2);
    c.fillRect(i * cell - w / 2, 0, w, TEX);
    c.fillRect(0, i * cell - w / 2, TEX, w);
  }
  // A seeded speckle gives the surface grain whose density rises toward the horizon.
  let s = 1234567;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 1500; i++) {
    const r = 1 + rnd() * 1.6;
    c.fillStyle = rgba(ink, 0.08 + rnd() * 0.22);
    c.fillRect(4 + rnd() * (TEX - 8), 4 + rnd() * (TEX - 8), r, r);
  }
  return cv;
}

// Starts three's import once the canvas is in the DOM (paintGround retries until then). Asynchronous: until three arrives f.gl is null.
export function initGround(f: Field) {
  if (f.gl || f.glPending) return;
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-role="ground"]');
  if (!canvas) return;
  f.glPending = true;
  import("three").then(THREE => {
    f.glPending = false;
    if (!f.glOn || !canvas.isConnected) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);

    const tex = new THREE.CanvasTexture(drawPeriod(readColor("--field-line", "#8a8876"), readColor("--field-ink", "#bdbab0")));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const period = f.TILE / CELLS;
    // Whole periods, so the repeat count is an integer and the plane edge never shows a partial tile.
    const size = period * Math.ceil((2 * (f.P + f.FAR * FOG_FAR_OF_FAR) * 1.5) / period);
    tex.repeat.set(size / period, size / period);

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    // three's fog mixes toward a colour; the stage behind is a gradient, so fog here fades the ground out instead.
    mat.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        "#ifdef USE_FOG\n gl_FragColor.a *= 1.0 - smoothstep( fogNear, fogFar, vFogDepth );\n#endif"
      );
    };
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;

    const scene = new THREE.Scene();
    const bg = readColor("--field-bg-mid", "#111111");
    scene.fog = new THREE.Fog(new THREE.Color(bg[0] / 255, bg[1] / 255, bg[2] / 255), f.P + FOG_NEAR, f.P + f.FAR * FOG_FAR_OF_FAR);
    scene.add(mesh);

    const camera = new THREE.PerspectiveCamera(50, 1, 10, f.P + f.FAR * 4 + size);
    f.gl = { three: THREE, canvas, renderer, scene, camera, tex, geo, mat, size, period, w: 0, h: 0, dpr: 0, eye: 0, key: "" };
  }).catch(err => {
    // switched off for the session, so paintGround does not retry every frame
    f.glPending = false; f.glOn = false;
    console.warn("[amorf] ground failed to start", err);
  });
}

export function disposeGround(f: Field) {
  const g = f.gl;
  f.gl = null;
  if (!g) return;
  g.tex.dispose(); g.geo.dispose(); g.mat.dispose(); g.renderer.dispose();
}

function fit(f: Field, g: GroundRt, W: number, H: number, dpr: number) {
  g.w = W; g.h = H; g.dpr = dpr;
  g.renderer.setPixelRatio(dpr);
  g.renderer.setSize(W, H, false);
  fitCamera(g.camera, W, H, f.P);
  g.key = "";
}

// Called every frame from frame(): drawn only when the camera, the window or the visibility changed.
export function paintGround(f: Field) {
  const g = f.gl;
  if (!g) { initGround(f); return; }
  if (!g.canvas.isConnected) { disposeGround(f); initGround(f); return; }
  const hide = inSpace(f);
  if (g.canvas.style.display !== (hide ? "none" : "block")) g.canvas.style.display = hide ? "none" : "block";
  if (hide) return;
  // The ground leaves with the field when an entity is opened, like the cards do.
  const op = (1 - f.ix.depth).toFixed(2);
  if (g.canvas.style.opacity !== op) g.canvas.style.opacity = op;

  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (W !== g.w || H !== g.h || dpr !== g.dpr) fit(f, g, W, H, dpr);

  const cam = f.cam, eye = eyeAt(cam.x, cam.z, cam.yaw, f.P);
  const key = eye.x.toFixed(1) + "|" + eye.z.toFixed(1) + "|" + cam.yaw.toFixed(2);
  if (key === g.key) return;
  g.key = key;

  const off = textureOffset(eye.x, eye.z, g.size / g.period, g.period);
  g.tex.offset.set(off.u, off.v);
  g.camera.rotation.y = eye.rotY;
  g.renderer.render(g.scene, g.camera);
}

// Cards stand on the ground whenever it is drawn (or about to be: the flag is on and three is still loading, so they do not
// jump when it arrives). frame() then drops each card's scatter and seats its bottom edge on the plane.
export const groundPinned = (f: Field) => f.glOn && !inSpace(f);
