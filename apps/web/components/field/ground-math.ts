// The ground's camera and texture maths, free of the DOM and of three's runtime so a script can run it under Node and
// compare it with the CSS projection. Units: 1 world unit = 1 CSS px at the camera frame's depth 0.
import type { PerspectiveCamera } from "three";

// The stage's perspective-origin is 50% 46% of the stage (the viewport), so the horizon sits at this fraction of the height.
export const ORIGIN_Y = 0.46;
// The eye's height above the ground plane, in world units (1 unit = 1 CSS px at the camera frame's depth 0). This is the one
// number that sets how high the horizon-to-feet drop is: larger lifts the eye and flattens the ground, smaller makes it loom.
// Tune it here; cards, pins, routes and the three.js camera all follow.
export const EYE_HEIGHT = 480;

// The plane's distance below the stage centre, where card centres sat before pinning; the eye (at the perspective origin,
// (0.5 - ORIGIN_Y) * H above the centre) is EYE_HEIGHT above it. Cards stand with their bottom edge here.
export const groundY = (H: number) => EYE_HEIGHT - (0.5 - ORIGIN_Y) * H;

// The route is cut at this eye-to-point depth, not at the camera frame's origin (P in front of the eye): a ground line that
// stops at the frame origin ends mid-floor, while one cut just in front of the eye runs off the bottom and sides of the screen.
export const NEAR_EYE = 60;
// Route segments farther than this from the camera frame are not drawn; the bands fade them well before.
export const ROUTE_REACH = 9000;

type Lp = { lx: number; lz: number };

// Clips the segment a-b against the plane at distance nearD in front of the camera frame (d = -lz; nearD is negative for a
// plane behind the frame origin). Clipping happens in 3D, so the projected line still reaches the screen edge. Null when
// the whole segment is behind the plane.
export function clipNear(a: Lp, b: Lp, nearD: number): [Lp, Lp] | null {
  const da = -a.lz, db = -b.lz;
  if (da < nearD && db < nearD) return null;
  let p = a, q = b;
  if (da < nearD) p = { lx: a.lx + (b.lx - a.lx) * ((nearD - da) / (db - da)), lz: -nearD };
  if (db < nearD) q = { lx: b.lx + (a.lx - b.lx) * ((nearD - db) / (da - db)), lz: -nearD };
  return [p, q];
}

// The route unwrapped from its first point, each step taking the shortest way round the torus (as the minimap does).
export function unwrapRoute(pts: { x: number; z: number }[], tile: number) {
  const w = (v: number) => { let r = v % tile; if (r > tile / 2) r -= tile; if (r < -tile / 2) r += tile; return r; };
  const out: { x: number; z: number }[] = [];
  pts.forEach((p, i) => {
    if (!i) { out.push({ x: p.x, z: p.z }); return; }
    const prev = pts[i - 1], last = out[i - 1];
    out.push({ x: last.x + w(p.x - prev.x), z: last.z + w(p.z - prev.z) });
  });
  return out;
}

// Attention is gravity: a worn card stands closer than its coordinate says, along the line of sight. The card's foot and the
// route's foot move with it, so frame() and the tracks share this one formula.
export const wearPull = (wear: number, lzRaw: number, nearc: number) => Math.max(0, Math.min(wear * 340, -lzRaw - nearc - 60));

// CSS `perspective: P` on a stage H tall is the frustum of a vertical fov 2 atan((H/2) / P), with the principal point
// lowered so the horizon lands on the perspective origin; the eye stands above the ground at the origin's height.
export function fitCamera(cam: PerspectiveCamera, W: number, H: number, P: number) {
  cam.fov = (2 * Math.atan(H / 2 / P) * 180) / Math.PI;
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  // clip.y gets e[9] * z, so ndc.y = e[5] y / depth - e[9]; the horizon (y = 0) must land at ndc 1 - 2 * ORIGIN_Y.
  cam.projectionMatrix.elements[9] = -(1 - 2 * ORIGIN_Y);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  cam.position.set(0, EYE_HEIGHT, 0);
}

// The eye stands P behind the point (x, z) the camera names, on the line the yaw turns about, and the frame turns with
// yaw: card coordinates are rotated about that point, not about the eye. rotation.y = -yaw makes three look along
// (sin yaw, -cos yaw), the direction frame() treats as forward.
export function eyeAt(x: number, z: number, yawDeg: number, P: number) {
  const r = (yawDeg * Math.PI) / 180;
  return { x: x - P * Math.sin(r), z: z + P * Math.cos(r), rotY: -r };
}

// The plane stays under the eye and the texture slides beneath it by the eye's world position, in periods. u follows +x;
// the plane's local +y points to world -z, so v follows -z. k is how many periods the plane spans.
export function textureOffset(ex: number, ez: number, k: number, period: number) {
  const m = (v: number) => ((v % 1) + 1) % 1;
  return { u: m(ex / period - k / 2), v: m(-ez / period - k / 2) };
}
