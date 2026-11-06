// Texture store: the image fetch and the DataArrayTexture layer store shared by the form faces (layers.ts) and the board (board-mesh.ts).
import type { Three } from "./scene";
import { LAYER } from "./config";
import { mediaUrl, crossOriginMedia } from "@/lib/media/url";

// cache: "reload" skips the browser's copy: the field loads the same files as plain <img> without CORS, and Chrome reuses
// that cached response, which has no Access-Control-Allow-Origin, for this CORS request (docs/deployment.md, Known issue).
export function loadImage(url: string): Promise<ImageBitmap> {
  return fetch(mediaUrl(url), { mode: crossOriginMedia ? "cors" : "same-origin", cache: "reload" })
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
    .then(b => createImageBitmap(b));
}

// A DataArrayTexture of LAYER² RGBA layers, all transparent until written, and the one way to write a layer into it.
export function makeStore(THREE: Three, total: number) {
  const data = new Uint8Array(LAYER * LAYER * 4 * total);
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
  // Empties a layer (transparent), for a layer that is handed to another picture.
  const clear = (layer: number) => {
    data.fill(0, layer * LAYER * LAYER * 4, (layer + 1) * LAYER * LAYER * 4);
    if (uploaded) tex.addLayerUpdate(layer);
    tex.needsUpdate = true;
  };
  return { tex, write, clear };
}
