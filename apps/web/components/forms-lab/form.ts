// Entity forms: one InstancedMesh of one subdivided rest cube, deformed per instance in TSL (round, taper, twist, bend,
// relief, cut-outs), with each face reading its picture from one texture array (STU-0006 deductions 2 and 3, DDR-0004).
import type * as ThreeNS from "three/webgpu";
import type { Three, Tsl } from "./scene";
import type { Rgb } from "@/lib/css-color";

// Enough segments for the sphere end to read round and for a few relief ribs per face; vertex cost grows with SEG².
const SEG = 24;
// Sphere radius against the cube's half-size 1: about equal volume, so the morph neither swells nor shrinks the form.
const SPHERE_R = 1.24;
// The turn cadence: each quarter turn takes TURN_PERIOD seconds, holding still for the first HOLD of it.
const TURN_PERIOD = 4;
const HOLD = 0.7;
// Settle: within SETTLE_NEAR of the camera a form faces it fully; past SETTLE_FAR it keeps its own cadence.
const SETTLE_NEAR = 5;
const SETTLE_FAR = 11;
const SHADE_MIN = 0.72;
// Relief: ribs per face across u, and the band at each face edge where the relief fades out so faces stay closed.
const RIBS = 4;
const RELIEF_EDGE = 0.12;

// Face slots in DDR-0004 order, keyed by the rest cube's outward normal.
const slotOf = (x: number, y: number, z: number) =>
  z > 0.5 ? 0 : x > 0.5 ? 1 : z < -0.5 ? 2 : x < -0.5 ? 3 : y > 0.5 ? 4 : 5;

// The outline parameters, each 0 for the plain box. taper: top shrinks (1 = point); twist: turns about y over the height
// (1 = a quarter turn); bend: leans sideways over the height (1 = one half-width); relief: rib depth (1 = 0.25 of
// a half-width); cut: window size in each side face (1 = the whole face).
export const OUTLINE = ["taper", "twist", "bend", "relief", "cut"] as const;
export type Outline = Record<(typeof OUTLINE)[number], number>;

export type FormPlace = { x: number; z: number; ar: number; phase: number; ownShape: number; own: Outline; layers: number[] };

// Half-extents of the form's front (width sx, height sy) from the cover's height / width; its depth equals sx.
export const proportion = (ar: number): [number, number] => (ar >= 1 ? [1 / ar, 1] : [1, ar]);

type U = { value: number };
export type FormUniforms = {
  // Seconds of turning; advanced only while turning is on, so switching it off freezes each form where it is.
  turnT: U;
  // Global shape, 0 cube to 1 sphere, and global outline; mixed = 1 uses each instance's own values instead.
  shape: U; mixed: U;
  settle: U; test: U;
  // Entity view: the focused instance's index (-1 none), how far it has calmed to the plain box facing +z (0 to 1),
  // and how far that box has unfolded into its flat cross net (0 folded, 1 flat).
  focus: U; open: U; unfold: U;
} & Record<(typeof OUTLINE)[number], U>;

export type Forms = { mesh: ThreeNS.InstancedMesh; u: FormUniforms; dispose: () => void };

export function makeForms(THREE: Three, TSL: Tsl, places: FormPlace[], tex: ThreeNS.DataArrayTexture, plain: Rgb): Forms {
  const {
    float, int, vec2, vec3, vec4, uniform, positionGeometry, normalGeometry, positionWorld, attribute, instancedBufferAttribute,
    varying, texture, uv, mix, normalize, tan, sin, cos, floor, fract, smoothstep, atan, cameraPosition, select, max, abs, dot,
    length, cross, dFdx, dFdy, sign, PI, instanceIndex,
  } = TSL;

  const geo = new THREE.BoxGeometry(2, 2, 2, SEG, SEG, SEG);
  const nrm = geo.getAttribute("normal");
  const slots = new Float32Array(nrm.count);
  for (let i = 0; i < nrm.count; i++) slots[i] = slotOf(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
  geo.setAttribute("faceSlot", new THREE.BufferAttribute(slots, 1));

  // Per instance: A = layers front, right, back, left; B = layers top, bottom, own shape, phase; C = x, z, width, height;
  // D = own taper, twist, bend, relief; E = own cut (rest spare).
  // @types/three r187 types instancedBufferAttribute as Node<string>, which has no swizzles; the attribute is a vec4.
  const v4 = (node: unknown) => node as ThreeNS.Node<"vec4">;
  const n = places.length;
  // All five share one interleaved array: WebGPU's default limit is 8 vertex buffers, and position, normal, uv, faceSlot
  // and three's instanceMatrix already take 5. The buffer must be an InstancedInterleavedBuffer: given a bare typed array,
  // three wraps it in a plain InterleavedBuffer, which the WebGPU backend steps per vertex, not per instance (r187).
  const STRIDE = 20;
  const data = new Float32Array(n * STRIDE);
  places.forEach((p, i) => {
    const [sx, sy] = proportion(p.ar);
    data.set([
      ...p.layers.slice(0, 4),
      p.layers[4], p.layers[5], p.ownShape, p.phase,
      p.x, p.z, sx, sy,
      p.own.taper, p.own.twist, p.own.bend, p.own.relief,
      p.own.cut, 0, 0, 0,
    ], i * STRIDE);
  });
  const buf = new THREE.InstancedInterleavedBuffer(data, STRIDE, 1);
  const [iA, iB, iC, iD, iE] = [0, 4, 8, 12, 16].map(off => v4(instancedBufferAttribute(buf, "vec4", STRIDE, off)));

  const u = {
    turnT: uniform(0), shape: uniform(0), mixed: uniform(0), settle: uniform(1), test: uniform(0),
    taper: uniform(0), twist: uniform(0), bend: uniform(0), relief: uniform(0), cut: uniform(0),
    focus: uniform(-1), open: uniform(0), unfold: uniform(0),
  };
  // f is 0 for every instance but the focused one, whose shape and outline fade to the plain box as the view opens.
  const f = select(instanceIndex.toFloat().sub(u.focus).abs().lessThan(0.5), u.open, float(0));
  const calm = float(1).sub(f);
  const pick = (g: typeof u.shape, own: ThreeNS.Node<"float">) => mix(g, own, u.mixed).mul(calm);
  const shape = pick(u.shape, iB.z);
  const taper = pick(u.taper, iD.x), twist = pick(u.twist, iD.y), bend = pick(u.bend, iD.z), relief = pick(u.relief, iD.w);
  const cut = pick(u.cut, iE.x);

  // Shape: the rest cube c, or the tan-warped cube-sphere (area ratio about 1.41 against 5.2 for a plain normalize).
  const c = positionGeometry;
  const sph = normalize(tan(c.mul(PI.div(4)))).mul(SPHERE_R);
  const nor = normalize(mix(normalGeometry, normalize(sph), shape));
  // Relief: vertical ribs pushed out along the normal, faded to zero at every face edge so neighbouring faces still meet.
  const fu = uv().x, fv = uv().y;
  const edge = smoothstep(0, RELIEF_EDGE, fu).mul(smoothstep(0, RELIEF_EDGE, fu.oneMinus()))
    .mul(smoothstep(0, RELIEF_EDGE, fv)).mul(smoothstep(0, RELIEF_EDGE, fv.oneMinus()));
  const rib = sin(fu.mul(RIBS * 2 * Math.PI)).mul(0.5).add(0.5);
  const raised = mix(c, sph, shape).add(nor.mul(rib.mul(edge).mul(relief).mul(0.25)));
  // Proportion from the cover, then the outline in a fixed order: taper, twist, bend, all as functions of the height h.
  const p0 = raised.mul(vec3(iC.z, iC.w, iC.z));
  const h = c.y.add(1).mul(0.5);
  const k = float(1).sub(taper.mul(h));
  const tw = twist.mul(h).mul(PI.div(2)), tc = cos(tw), ts = sin(tw);
  const xz = vec2(p0.x.mul(k), p0.z.mul(k));
  const p1 = vec3(xz.x.mul(tc).sub(xz.y.mul(ts)).add(bend.mul(iC.z).mul(h).mul(h)), p0.y, xz.x.mul(ts).add(xz.y.mul(tc)));

  // Net (entity view): the plain box c·(W, H, D) unfolded into a cross in the plane of its front face (z = D): left, front,
  // right in a row, top above, bottom below, back below the bottom. Each side face hinges on a front edge by the angle
  // phi (pi/2 folded, 0 flat); the back hinges on the bottom's far edge, so it turns by 2 phi in all.
  const W = iC.z, H = iC.w, D = iC.z;
  const ps = c.mul(vec3(W, H, D));
  const phi = float(1).sub(u.unfold).mul(PI.div(2));
  const cp = cos(phi), sp = sin(phi), c2 = cos(phi.mul(2)), s2 = sin(phi.mul(2));
  const reach = D.sub(ps.z);
  const bottomFar = vec3(ps.x, H.negate().sub(D.mul(2).mul(cp)), D.sub(D.mul(2).mul(sp)));
  const back = bottomFar.add(vec3(0, c2.negate(), s2.negate()).mul(ps.y.add(H)));
  const slotN = attribute("faceSlot", "float");
  const net = select(slotN.lessThan(0.5), ps,
    select(slotN.lessThan(1.5), vec3(W.add(reach.mul(cp)), ps.y, D.sub(reach.mul(sp))),
    select(slotN.lessThan(2.5), back,
    select(slotN.lessThan(3.5), vec3(W.negate().sub(reach.mul(cp)), ps.y, D.sub(reach.mul(sp))),
    select(slotN.lessThan(4.5), vec3(ps.x, H.add(reach.mul(cp)), D.sub(reach.mul(sp))),
      vec3(ps.x, H.negate().sub(reach.mul(cp)), D.sub(reach.mul(sp))))))));
  const local = mix(p1, net, f);

  // Turn: a quarter turn per period, eased, after a hold; the phase staggers forms so they do not turn in step.
  const q = u.turnT.add(iB.w).div(TURN_PERIOD);
  const cadence = floor(q).add(smoothstep(HOLD, 1, fract(q))).mul(PI.div(2));
  // Settle: near the camera the angle eases to the one that points the front face (+z) at the camera, along the short way.
  const toCam = cameraPosition.xz.sub(vec2(iC.x, iC.y));
  const facing = atan(toCam.x, toCam.y);
  // The focused form always settles: the view's camera sits straight in front of it, so its facing ends at 0.
  const near = max(float(1).sub(smoothstep(SETTLE_NEAR, SETTLE_FAR, length(toCam))).mul(u.settle), f);
  const d = facing.sub(cadence);
  const short = d.sub(floor(d.add(PI).div(PI.mul(2))).mul(PI.mul(2)));
  const angle = cadence.add(short.mul(near));
  const cs = cos(angle), sn = sin(angle);
  const rotY = (v: ThreeNS.Node<"vec3">) => vec3(v.x.mul(cs).add(v.z.mul(sn)), v.y, v.z.mul(cs).sub(v.x.mul(sn)));

  // The form rests on the ground at every shape: lifted by its own half-height, which grows toward the sphere.
  // The unfolded net reaches 3H + 2D below its front's centre, so it rises by 2H + 2D to stay above the ground.
  const lift = iC.w.mul(mix(float(1), float(SPHERE_R), shape)).add(f.mul(u.unfold).mul(iC.w.mul(2).add(iC.z.mul(2))));

  // The instance matrix is identity and unused: positionNode replaces positionLocal after three's instancing transform,
  // so every per-instance value comes from the attributes above.
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  mat.positionNode = rotY(local).add(vec3(iC.x, lift, iC.y));

  // The layer is fixed per face, so it travels flat; the uv is the rest cube's, so a texel stays put through every deformation.
  const slot = attribute("faceSlot", "float");
  const picked = select(slot.lessThan(0.5), iA.x, select(slot.lessThan(1.5), iA.y, select(slot.lessThan(2.5), iA.z,
    select(slot.lessThan(3.5), iA.w, select(slot.lessThan(4.5), iB.x, iB.y)))));
  // The WGSL builder honours flat; the GLSL builder (WebGL 2) makes only integer varyings flat and interpolates this one,
  // which is constant per triangle but may land a hair off the integer, so it is rounded rather than truncated below.
  const layer = varying(select(u.test.greaterThan(0.5), slot, picked)).setInterpolation(THREE.InterpolationSamplingType.FLAT);

  // Cut-outs: a window centred in each of the four side faces, discarded by alpha test; DoubleSide shows the inside through it.
  const side = varying(select(slot.lessThan(3.5), float(1), float(0))).setInterpolation(THREE.InterpolationSamplingType.FLAT);
  const inWindow = max(abs(fu.sub(0.5)), abs(fv.sub(0.5))).lessThan(cut.mul(0.5));
  mat.opacityNode = select(inWindow.and(side.greaterThan(0.5)), float(0), float(1));
  mat.alphaTest = 0.5;

  // Shading from the deformed surface itself (screen derivatives), so every deformation shades without its own normal
  // maths. The derivative's sign differs between the backends' framebuffer y, so the normal is turned toward the camera.
  const fn = normalize(cross(dFdx(positionWorld), dFdy(positionWorld)));
  const n2 = fn.mul(sign(dot(fn, cameraPosition.sub(positionWorld))));
  const plainColor = uniform(new THREE.Color().setRGB(plain[0] / 255, plain[1] / 255, plain[2] / 255, THREE.SRGBColorSpace));
  const sample = texture(tex, uv()).depth(int(max(layer, 0).add(0.5)));
  const col = select(layer.lessThan(-0.5), plainColor, sample.rgb);
  const shade = float(SHADE_MIN).add(max(dot(n2, normalize(vec3(0.4, 0.85, 0.5))), 0).mul(1 - SHADE_MIN));
  mat.colorNode = vec4(col.mul(shade), 1);

  const mesh = new THREE.InstancedMesh(geo, mat, n);
  // The bounds three computes come from the identity instance matrices, not from the attributes.
  mesh.frustumCulled = false;

  return { mesh, u, dispose: () => { geo.dispose(); mat.dispose(); } };
}
