// Decoded-image cache for entity media: each URL is fetched and decoded once per session, and the Image objects are
// kept so the browser holds the decoded bitmap. Unbounded on purpose: the collection is small (tens of entities).
const cache = new Map<string, HTMLImageElement>();
const ready = new Set<string>();

export const isReady = (url: string) => ready.has(url);

export function preload(url: string) {
  if (typeof window === "undefined" || cache.has(url)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  cache.set(url, img);
  img.decode().then(() => { ready.add(url); }, () => { cache.delete(url); });
}

// Peripheral media waits for an idle moment so it never competes with the open entity's own pictures.
export function preloadLater(urls: string[]) {
  if (typeof window === "undefined" || !urls.length) return;
  const run = () => urls.forEach(preload);
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1200 });
  else setTimeout(run, 300);
}
