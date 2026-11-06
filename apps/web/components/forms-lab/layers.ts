// Form layers: every face picture as one square layer of one DataArrayTexture, filled as images arrive.
// Layers 0-5 are test cards naming each face slot, used to check face order and texture direction on both backends.
import type * as ThreeNS from "three/webgpu";
import type { Three } from "./scene";
import { SLOTS, type FacePicture, type FormFaces } from "./faces";
import { LAYER, MAX_LAYERS, MAX_SAT, FACE_PARALLEL } from "./config";
import { loadImage, makeStore } from "./texture-store";
import type { Rgb } from "@/lib/css-color";

export type Layers = {
  tex: ThreeNS.DataArrayTexture;
  // Layer per face, -1 for a plain face; one array of six per form, in slot order.
  faceLayers: number[][];
  // Layer per satellite candidate, per form: entry k is board picture k + 1 (the cover is on the faces); -1 when the layer budget is spent.
  satLayers: number[][];
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

function draw(img: ImageBitmap, p: FacePicture): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = cv.height = LAYER;
  const c = cv.getContext("2d")!;
  // The canvas starts fully transparent: a contained picture leaves its margins transparent, not filled.
  const w = img.width, h = img.height;
  // Cover keeps the focal point in view; contain letterboxes on the plain material.
  const s = p.fit === "contain" ? Math.min(LAYER / w, LAYER / h) : Math.max(LAYER / w, LAYER / h);
  const dw = w * s, dh = h * s;
  const [fx, fy] = p.fit === "contain" ? [0.5, 0.5] : p.focal ?? [0.5, 0.5];
  c.drawImage(img, (LAYER - dw) * fx, (LAYER - dh) * fy, dw, dh);
  return cv;
}

export function makeLayers(THREE: Three, forms: FormFaces[], plain: Rgb, ink: Rgb): Layers {
  const byUrl = new Map<string, number>();
  const pics: FacePicture[] = [];
  // One layer per distinct url; a satellite's picture shares the layer of the same picture on a face.
  const layerOf = (p: FacePicture | null) => {
    if (!p) return -1;
    let i = byUrl.get(p.url);
    if (i === undefined) {
      if (SLOTS.length + pics.length >= MAX_LAYERS) return -1;
      i = SLOTS.length + pics.length;
      byUrl.set(p.url, i);
      pics.push(p);
    }
    return i;
  };
  const faceLayers = forms.map(f => f.faces.map(layerOf));
  const satLayers = forms.map(f => f.board.slice(1, 1 + MAX_SAT).map(b => layerOf({ url: b.url, fit: "cover" })));
  const total = SLOTS.length + pics.length;
  // A one-layer array is not treated as an array by three (Texture.js), so there are always the six test layers.
  const { tex, write } = makeStore(THREE, total);

  SLOTS.forEach((s, i) => write(i, testCard(s, plain, ink)));

  let alive = true;
  return {
    tex,
    faceLayers,
    satLayers,
    total,
    load: onLayer => {
      let next = 0, done = 0;
      const pump = () => {
        if (!alive || next >= pics.length) return;
        const i = next++, p = pics[i];
        loadImage(p.url)
          .then(img => { if (alive) write(SLOTS.length + i, draw(img, p)); img.close(); })
          .catch(err => console.warn("[forms-lab] picture failed", p.url, err))
          .finally(() => { if (!alive) return; onLayer(++done); pump(); });
      };
      for (let k = 0; k < FACE_PARALLEL; k++) pump();
    },
    dispose: () => { alive = false; tex.dispose(); },
  };
}
