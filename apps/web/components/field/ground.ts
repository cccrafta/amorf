// The ground: one textured plane in the world (world.ts) that recedes to a horizon and fades into the stage by distance.
// The plane stays under the eye and the texture slides beneath it, which wraps the torus without moving geometry.
// Shading is TSL, so the same node material runs on the WebGPU and WebGL 2 backends (ADR-0019: no onBeforeCompile).
import type * as ThreeNS from "three/webgpu";
import type Field from "./Field";
import type { Three, Tsl } from "./world";
import { textureOffset } from "./ground-math";
import { readCssColor as readColor, type Rgb } from "@/lib/css-color";

export type Ground = {
  mesh: ThreeNS.Mesh;
  size: number;
  place: (eyeX: number, eyeZ: number) => void;
  dispose: () => void;
};

// The torus is TILE wide; the texture repeats TILE / CELLS units, so the pattern closes on itself after one wrap.
const CELLS = 20;
// One texture period holds DIV equal squares; every DIV/2-th line is stronger, the period edge strongest.
const DIV = 10;
const TEX = 1024;
// Fade, as view depth from the eye; the ground is transparent from P + FAR * FOG_FAR_OF_FAR on.
const FOG_NEAR = 400;
const FOG_FAR_OF_FAR = 1.3;
const TINT = 0.06;

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

export function makeGround(THREE: Three, TSL: Tsl, renderer: ThreeNS.WebGPURenderer, f: Field): Ground {
  const { texture, uv, uniform, smoothstep, positionView, float } = TSL;

  const tex = new THREE.CanvasTexture(drawPeriod(readColor("--field-line", "#8a8876"), readColor("--field-ink", "#bdbab0")));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.getMaxAnisotropy();

  const period = f.TILE / CELLS;
  // Whole periods, so the repeat count is an integer and the plane edge never shows a partial tile.
  const size = period * Math.ceil((2 * (f.P + f.FAR * FOG_FAR_OF_FAR) * 1.5) / period);
  const k = size / period;

  // uv * k + offset is what Texture.repeat and Texture.offset did; written out so the slide is one uniform write per frame.
  const offset = uniform(new THREE.Vector2());
  const sample = texture(tex, uv().mul(k).add(offset));
  // The stage behind is a gradient, so the ground fades its alpha with view depth instead of mixing toward a fog colour.
  const fade = float(1).sub(smoothstep(float(f.P + FOG_NEAR), float(f.P + f.FAR * FOG_FAR_OF_FAR), positionView.z.negate()));

  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  mat.colorNode = sample;
  mat.opacityNode = fade;

  const geo = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;

  return {
    mesh,
    size,
    place: (ex, ez) => {
      const o = textureOffset(ex, ez, k, period);
      offset.value.set(o.u, o.v);
    },
    dispose: () => { tex.dispose(); geo.dispose(); mat.dispose(); },
  };
}
