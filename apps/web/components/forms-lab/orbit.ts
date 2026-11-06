// Satellite orbit in TSL: the one place the ellipse is computed, shared by the satellite cubes (form.ts) and the board pieces
// that start from them (board-mesh.ts), so a picture leaves exactly where its cube was.
import type * as ThreeNS from "three/webgpu";
import type { Tsl } from "./scene";

type F = ThreeNS.Node<"float">;
export type OrbitParams = { r: F; e: F; omega: F; theta0: F; tilt: F; azim: F; prec: F };

export function makeOrbit(TSL: Tsl) {
  const { float, vec3, uniform, sin, cos, sqrt } = TSL;
  // t: orbit clock in seconds, advanced on the CPU; radius and size scale every orbit and every satellite; on is 0 or 1.
  const u = { t: uniform(0), radius: uniform(1), size: uniform(1), on: uniform(1) };

  // The satellite's offset from its form's centre. An ellipse with the form at its focus lies in the xz plane, is tipped about
  // x by the tilt and turned about y by the azimuth, which precesses by prec per orbit second. The eccentric anomaly E is the
  // mean anomaly M with the first two terms of Kepler's equation, enough for e < 0.2: fast near the form, slow far from it.
  // at: the clock to evaluate at (default now); a slightly later clock gives the direction of travel.
  const offset = (p: OrbitParams, at: F = u.t as unknown as F) => {
    const M = p.theta0.add(p.omega.mul(at));
    const E = M.add(p.e.mul(sin(M))).add(p.e.mul(p.e).mul(0.5).mul(sin(M.mul(2))));
    const a = p.r.mul(u.radius);
    const o0 = vec3(a.mul(cos(E).sub(p.e)), 0, a.mul(sqrt(float(1).sub(p.e.mul(p.e)))).mul(sin(E)));
    const az = p.azim.add(at.mul(p.prec));
    const ct = cos(p.tilt), st = sin(p.tilt), ca = cos(az), sa = sin(az);
    const o1 = vec3(o0.x, o0.y.mul(ct).sub(o0.z.mul(st)), o0.y.mul(st).add(o0.z.mul(ct)));
    return vec3(o1.x.mul(ca).add(o1.z.mul(sa)), o1.y, o1.z.mul(ca).sub(o1.x.mul(sa)));
  };
  return { u, offset };
}
export type Orbit = ReturnType<typeof makeOrbit>;
