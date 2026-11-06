// Form layers: every face picture as one square layer of one DataArrayTexture, filled as images arrive.
// Layers 0-5 are test cards naming each face slot, used to check face order and texture direction on both backends.
import type * as ThreeNS from "three/webgpu";
import type { Three } from "./scene";
import { SLOTS, type FacePicture, type FormFaces } from "./faces";
import { mediaUrl, crossOriginMedia } from "@/lib/media/url";
import type { Rgb } from "@/lib/css-color";

// 256² is larger than the field's planned 128² (STU-0006 budget) because the lab is viewed close up.
export const LAYER = 256;
// WebGL 2's guaranteed floor and WebGPU's default limit; pictures past it stay plain.
export const MAX_LAYERS = 256;
const PARALLEL = 6;

export type Layers = {
  tex: ThreeNS.DataArrayTexture;
  // Layer per face, -1 for a plain face; one array of six per form, in slot order.
  faceLayers: number[][];
  total: number;
  load: (onLayer: (done: number) => void) => void;
  dispose: () => void;
};

function testCard(slot: string, plain: Rgb, ink: Rgb): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = LAYER;
  const c = cv.getContext("2d")!;
  c.fillStyle = `rgb(${plain})`;
  c.fillRect(0, 0, LAYER, LAYER);
  c.strokeStyle = c.fillStyle = `rgb(${ink})`;
  c.lineWidth = 6;
  c.strokeRect(3, 3, LAYER - 6, LAYER - 6);
  c.font = "600 34px ui-monospace, monospace";
  c.textAlign = "center";
  c.fillText(slot.toUpperCase(), LAYER / 2, LAYER / 2 + 12);
  // An arrow to the face's up (v = 1) and a dot in the u = 0, v = 0 corner, so a flip or mirror shows at once.
  c.beginPath();
  c.moveTo(LAYER / 2, 28); c.lineTo(LAYER / 2 - 18, 60); c.lineTo(LAYER / 2 + 18, 60);
  c.fill();
  c.beginPath(); c.arc(26, LAYER - 26, 9, 0, Math.PI * 2); c.fill();
  return cv;
}

function draw(img: ImageBitmap, p: FacePicture, plain: Rgb): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = LAYER;
  const c = cv.getContext("2d")!;
  c.fillStyle = `rgb(${plain})`;
  c.fillRect(0, 0, LAYER, LAYER);
  const w = img.width, h = img.height;
  // Cover keeps the focal point in view; contain letterboxes on the plain material.
  const s = p.fit === "contain" ? Math.min(LAYER / w, LAYER / h) : Math.max(LAYER / w, LAYER / h);
  const dw = w * s, dh = h * s;
  const [fx, fy] = p.fit === "contain" ? [0.5, 0.5] : p.focal ?? [0.5, 0.5];
  c.drawImage(img, (LAYER - dw) * fx, (LAYER - dh) * fy, dw, dh);
  return cv;
}

// cache: "reload" skips the browser's copy: the field loads the same files as plain <img> without CORS, and Chrome reuses
// that cached response, which has no Access-Control-Allow-Origin, for this CORS request (docs/deployment.md, Known issue).
function loadImage(url: string): Promise<ImageBitmap> {
  return fetch(mediaUrl(url), { mode: crossOriginMedia ? "cors" : "same-origin", cache: "reload" })
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
    .then(b => createImageBitmap(b));
}

export function makeLayers(THREE: Three, forms: FormFaces[], plain: Rgb, ink: Rgb): Layers {
  const byUrl = new Map<string, number>();
  const pics: FacePicture[] = [];
  const faceLayers = forms.map(f => f.faces.map(p => {
    if (!p) return -1;
    let i = byUrl.get(p.url);
    if (i === undefined) {
      if (SLOTS.length + pics.length >= MAX_LAYERS) return -1;
      i = SLOTS.length + pics.length;
      byUrl.set(p.url, i);
      pics.push(p);
    }
    return i;
  }));
  const total = SLOTS.length + pics.length;
  // A one-layer array is not treated as an array by three (Texture.js), so there are always the six test layers.
  const data = new Uint8Array(LAYER * LAYER * 4 * total);
  for (let i = 0; i < data.length; i += 4) { data[i] = plain[0]; data[i + 1] = plain[1]; data[i + 2] = plain[2]; data[i + 3] = 255; }

  const tex = new THREE.DataArrayTexture(data, LAYER, LAYER, total);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  let uploaded = false;
  tex.onUpdate = () => { uploaded = true; };

  // Canvas rows run top-down and texture rows bottom-up (v = 0 at the bottom), so rows are copied flipped.
  const write = (layer: number, cv: HTMLCanvasElement) => {
    const px = cv.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, LAYER, LAYER).data;
    const row = LAYER * 4, base = layer * LAYER * row;
    for (let y = 0; y < LAYER; y++) data.set(px.subarray(y * row, (y + 1) * row), base + (LAYER - 1 - y) * row);
    // three uploads only the listed layers whenever any are listed, even on the first upload, which would leave every
    // other layer zero (black); so layers are listed only once the whole array is on the GPU.
    if (uploaded) tex.addLayerUpdate(layer);
    tex.needsUpdate = true;
  };


  SLOTS.forEach((s, i) => write(i, testCard(s, plain, ink)));

  let alive = true;
  return {
    tex,
    faceLayers,
    total,
    load: onLayer => {
      let next = 0, done = 0;
      const pump = () => {
        if (!alive || next >= pics.length) return;
        const i = next++, p = pics[i];
        loadImage(p.url)
          .then(img => { if (alive) write(SLOTS.length + i, draw(img, p, plain)); img.close(); })
          .catch(err => console.warn("[forms-lab] picture failed", p.url, err))
          .finally(() => { if (!alive) return; onLayer(++done); pump(); });
      };
      for (let k = 0; k < PARALLEL; k++) pump();
    },
    dispose: () => { alive = false; tex.dispose(); },
  };
}
