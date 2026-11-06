// CSS colour reading: a custom property (hex, color-mix, oklch) resolved to sRGB bytes, for canvas and shader colours.
export type Rgb = [number, number, number];

// A 1px canvas parses the value, so any CSS colour syntax works. Browser only: call from effects, never during render.
export function readCssColor(name: string, fallback: string): Rgb {
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
