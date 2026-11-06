// Board flight in TSL: the one place a cube's way to its board place is computed, shared by the flying cube (form.ts) and the
// card that takes over from it once it is flat (board-mesh.ts), so the two are at the same place and lean at the handoff.
import type * as ThreeNS from "three/webgpu";
import type { Three, Tsl } from "./scene";
import { BANK, EASE_SKEW, FLAT, FLIGHT, LAND_DEPTH, LIFT_OUT } from "./config";

type F = ThreeNS.Node<"float">;
type V = ThreeNS.Node<"vec3">;

// s: the flight's ease (config.ts EASE_SKEW), 0 to 1 and never past 1.
const easeAt = (t: number) => { const q = 1 - (1 - t) ** EASE_SKEW; return q * q * (3 - 2 * q); };
// s when the cube is flat and its card takes over; the card's growth and crop run from here to 1.
export const S_FLAT = easeAt(FLAT);

export function makeFlight(THREE: Three, TSL: Tsl) {
  const { float, vec3, uniform, clamp, pow, sin, cos, max, length, normalize, PI } = TSL;
  // The board's frame, set at the click so the board faces the camera: turned by yaw about y, tipped back by pitch toward a
  // camera above it, with origin the world point of the board's (0, 0). Its normal is (sin yaw cos pitch, sin pitch, ...).
  const u = { yaw: uniform(0), pitch: uniform(0), origin: uniform(new THREE.Vector3()) };
  const yaw = u.yaw as unknown as F, pitch = u.pitch as unknown as F, origin = u.origin as unknown as V;

  const rotY = (v: V, a: F) => vec3(v.x.mul(cos(a)).add(v.z.mul(sin(a))), v.y, v.z.mul(cos(a)).sub(v.x.mul(sin(a))));
  const rotX = (v: V, a: F) => vec3(v.x, v.y.mul(cos(a)).sub(v.z.mul(sin(a))), v.y.mul(sin(a)).add(v.z.mul(cos(a))));
  // From the leaning board frame to the world: the lean about y, then about x, then the board's tip (tilt of it: a cube
  // takes it on as it calms, so it leaves upright) and turn.
  const orient = (v: V, ax: F, ay: F, tilt: F = float(1)) => rotY(rotX(rotX(rotY(v, ay), ax), pitch.mul(tilt).negate()), yaw);
  const zero = float(0);
  const normal = orient(vec3(0, 0, 1), zero, zero);
  const right = orient(vec3(1, 0, 0), zero, zero), up = orient(vec3(0, 1, 0), zero, zero);

  // A flight's own progress, 0 to 1, from its departure (a share of the explosion).
  const tauOf = (explode: F, start: F) => clamp(explode.sub(start).div(FLIGHT), 0, 1);
  // A board place (board.ts landing: x across, y up) in the world.
  const place = (x: F, y: F) => origin.add(right.mul(x)).add(up.mul(y));

  // A satellite leaves along its orbit (ahead: a step along it), turned toward the board's viewer.
  const away = (ahead: V) => normalize(ahead.div(max(length(ahead), 1e-4)).add(normal.mul(0.6)));

  // S: the live start (it may keep moving), E: the board place, out: the leaving direction. Returns the centre, the ease s
  // and the lean (ax about x, ay about y, in the board's frame).
  const fly = (S: V, E: V, out: V, tau: F) => {
    const q = float(1).sub(pow(float(1).sub(tau), EASE_SKEW));
    const s = q.mul(q).mul(float(3).sub(q.mul(2)));
    const sc = s, r = float(1).sub(sc);
    const L = length(E.sub(S));
    const C1 = S.add(out.mul(L.mul(LIFT_OUT)));
    const C2 = E.add(normal.mul(L.mul(LAND_DEPTH)));
    const pos = S.mul(r.mul(r).mul(r)).add(C1.mul(r.mul(r).mul(sc).mul(3))).add(C2.mul(r.mul(sc).mul(sc).mul(3))).add(E.mul(sc.mul(sc).mul(sc)));
    // The lean into the direction of travel, most at mid-flight and not at all at either end.
    const vel = C1.sub(S).mul(r.mul(r).mul(3)).add(C2.sub(C1).mul(r.mul(sc).mul(6))).add(E.sub(C2).mul(sc.mul(sc).mul(3)));
    const dir = rotX(rotY(vel.div(max(length(vel), 1e-4)), yaw.negate()), pitch);
    const lean = sin(sc.mul(PI)).mul(BANK);
    return { pos, s, ax: dir.y.negate().mul(lean), ay: dir.x.mul(lean) };
  };

  return { u, yaw, normal, tauOf, place, away, fly, orient, rotY };
}
export type Flight = ReturnType<typeof makeFlight>;
