// Media lives in the R2 bucket when NEXT_PUBLIC_MEDIA_BASE is set. "/media/x" maps to the bucket root, "/entities/<id>/x" keeps its prefix.
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || "").replace(/\/$/, "");

export const mediaUrl = (path: string) => {
  if (!BASE) return path;
  if (path.startsWith("/media/")) return BASE + path.slice("/media".length);
  if (path.startsWith("/entities/")) return BASE + path;
  return path;
};

// Web Audio refuses to read a cross-origin element unless it was requested with CORS.
export const crossOriginMedia = !!BASE;
