// Entity forms: one InstancedMesh of one subdivided rest cube, deformed per instance in TSL (round, taper, twist, bend,
// relief, cut-outs), with each face reading its picture from one texture array (STU-0006 deductions 2 and 3, DDR-0004).
import type * as ThreeNS from "three/webgpu";
import type { Three, Tsl } from "./scene";
import type { Orbit } from "./orbit";
import type { Flight } from "./flight";
import { makeFloat } from "./float";
import { FLAT, LIGHT_DIR, PRESS, RELIEF_EDGE, RIBS, SEG, SETTLE_FAR, SETTLE_NEAR, SHADE_MIN, SPHERE_R, TURN_PERIOD } from "./config";

// Face slots in DDR-0004 order, keyed by the rest cube's outward normal.
const slotOf = (x: number, y: number, z: number) =>
  z > 0.5 ? 0 : x > 0.5 ? 1 : z < -0.5 ? 2 : x < -0.5 ? 3 : y > 0.5 ? 4 : 5;

// The outline parameters, each 0 for the plain box. taper: top shrinks (1 = point); twist: turns about y over the height
// (1 = a quarter turn); bend: leans sideways over the height (1 = one half-width); relief: rib depth (1 = 0.25 of
// a half-width); cut: window size in each side face (1 = the whole face).
export const OUTLINE = ["taper", "twist", "bend", "relief", "cut"] as const;
export type Outline = Record<(typeof OUTLINE)[number], number>;

// The motion matrix. Per channel: amp (radians for pitch, roll and yaw; world units for bob, sway and hover) and speed
// (a clock rate; hover has no clock). Global: spread (per-form phase spread, 0 = all in step), nearCalm (how much motion
// fades near the camera), turnSpeed (rate of the quarter-turn clock), hold (share of each quarter turn spent still).
export const CHANNELS = ["pitch", "roll", "yaw", "bob", "sway", "hover"] as const;
export type Channel = (typeof CHANNELS)[number];
export type Motion = {
  channels: Record<Channel, { amp: number; speed: number }>;
  spread: number; nearCalm: number; turnSpeed: number; hold: number;
};
// A satellite's orbit about its entity's form, which sits at the ellipse's focus: size (half-extent), parentH (the form's
// half-height) and parentPhase (the form's float seed, shared so the cluster moves as one body), r (semi-major axis), e
// (eccentricity), omega (mean motion, rad per orbit second, signed), theta0 (start mean anomaly), tilt and azim (the orbit
// plane: tipped about x by tilt, then turned about y by azim), prec (azim drift, rad per orbit second), spin (own turn rate)
// and phase (own turn and tumble seed), parent (the form's instance index, to follow its entity view).
export type Sat = {
  size: number; parentH: number; parentPhase: number; parent: number; r: number; e: number; omega: number; theta0: number;
  tilt: number; azim: number; prec: number; spin: number; phase: number;
};
// A satellite is a place of its own (x, z are the parent's; layers are one picture on all six faces) with `sat` set.
// card: where its picture lands on the entity's board (board.ts: departure, landing), if the board shows it.
export type FormPlace = {
  x: number; z: number; ar: number; phase: number; ownShape: number; own: Outline; layers: number[]; sat?: Sat;
  card?: { start: number; x: number; y: number };
};

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
  // The board's explosion (0 to 1, config.ts), and how far every other form has receded (0 to 1).
  explode: U; recede: U;
  // Float: drift is the on switch (0 or 1); m is the motion matrix.
  drift: U;
  // 1 when the opened entity opens as a board (its form and satellites then fly to it, flight.ts), else 0; turnAt is the
  // orbit clock when that flight began, from which a flying satellite picks the quarter turn it settles to.
  board: U; turnAt: U;
  m: { amp: Record<Channel, U>; t: Record<Channel, U>; spread: U; nearCalm: U; hold: U };
} & Record<(typeof OUTLINE)[number], U>;

export type Forms = { mesh: ThreeNS.InstancedMesh; u: FormUniforms; dispose: () => void };

export function makeForms(THREE: Three, TSL: Tsl, places: FormPlace[], tex: ThreeNS.DataArrayTexture, orbit: Orbit, flight: Flight): Forms {
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
  // D = own taper, twist, bend, relief; E = own cut, satellite parent index, board departure (2: no board place), board x;
  // F = satellite parent half-height, semi-major axis, omega, start anomaly; G = satellite tilt, azimuth, satellite flag (1),
  // board y; H = satellite eccentricity, spin rate, parent phase, precession. For a satellite C holds its parent's x, z and its size twice.
  // @types/three r187 types instancedBufferAttribute as Node<string>, which has no swizzles; the attribute is a vec4.
  const v4 = (node: unknown) => node as ThreeNS.Node<"vec4">;
  const n = places.length;
  // All eight share one interleaved array: WebGPU's default limit is 8 vertex buffers, and position, normal, uv, faceSlot
  // and three's instanceMatrix already take 5. The buffer must be an InstancedInterleavedBuffer: given a bare typed array,
  // three wraps it in a plain InterleavedBuffer, which the WebGPU backend steps per vertex, not per instance (r187).
  const STRIDE = 32;
  const data = new Float32Array(n * STRIDE);
  places.forEach((p, i) => {
    const s = p.sat;
    const [sx, sy] = s ? [s.size, s.size] : proportion(p.ar);
    data.set([
      ...p.layers.slice(0, 4),
      p.layers[4], p.layers[5], p.ownShape, p.phase,
      p.x, p.z, sx, sy,
      p.own.taper, p.own.twist, p.own.bend, p.own.relief,
      p.own.cut, s?.parent ?? 0, p.card?.start ?? 2, p.card?.x ?? 0,
      s?.parentH ?? 0, s?.r ?? 0, s?.omega ?? 0, s?.theta0 ?? 0,
      s?.tilt ?? 0, s?.azim ?? 0, s ? 1 : 0, p.card?.y ?? 0,
      s?.e ?? 0, s?.spin ?? 0, s?.parentPhase ?? 0, s?.prec ?? 0,
    ], i * STRIDE);
  });
  const buf = new THREE.InstancedInterleavedBuffer(data, STRIDE, 1);
  const [iA, iB, iC, iD, iE, iF, iG, iH] = [0, 4, 8, 12, 16, 20, 24, 28].map(off => v4(instancedBufferAttribute(buf, "vec4", STRIDE, off)));

  const u = {
    turnT: uniform(0), shape: uniform(0), mixed: uniform(0), settle: uniform(1), test: uniform(0),
    taper: uniform(0), twist: uniform(0), bend: uniform(0), relief: uniform(0), cut: uniform(0),
    focus: uniform(-1), open: uniform(0), unfold: uniform(0), explode: uniform(0), recede: uniform(0), drift: uniform(1),
    board: uniform(0), turnAt: uniform(0),
    // The motion matrix: amp and clock per channel, then the global rows. Values arrive from Motion through the lab.
    m: {
      amp: { pitch: uniform(0), roll: uniform(0), yaw: uniform(0), bob: uniform(0), sway: uniform(0), hover: uniform(0) },
      t: { pitch: uniform(0), roll: uniform(0), yaw: uniform(0), bob: uniform(0), sway: uniform(0), hover: uniform(0) },
      spread: uniform(1), nearCalm: uniform(0.75), hold: uniform(0.7),
    },
  };
  // A satellite is gated by the lab's switch and scaled by its size multiplier; a main form is untouched.
  const isSat = iG.z.greaterThan(0.5);
  const satK = mix(float(1), orbit.u.size.mul(orbit.u.on), iG.z);
  const isFocus = instanceIndex.toFloat().sub(u.focus).abs().lessThan(0.5);
  // The entity a form or satellite belongs to; ownerFocused is true for the focused form and for its satellites.
  const owner = select(isSat, iE.y, instanceIndex.toFloat());
  const ownerFocused = owner.sub(u.focus).abs().lessThan(0.5);
  // Opened as a board, the focused form and each of its satellites with a board place fly there in motion (flight.ts): w
  // calms tumble, turn and shape over the first FLAT of the flight, press flattens the cube over the last PRESS of that,
  // and from FLAT on the cube is hidden behind its card (board-mesh.ts), which starts as exactly its flat face.
  const fly = ownerFocused.and(u.board.greaterThan(0.5)).and(iE.z.lessThan(1.5));
  const flySat = fly.and(isSat);
  const tauF = flight.tauOf(u.explode, iE.z);
  const w = select(fly, smoothstep(0, FLAT, tauF), float(0));
  const press = select(fly, smoothstep(FLAT - PRESS, FLAT, tauF), float(0));
  const flat = select(fly.and(tauF.greaterThanEqual(FLAT)), float(1), float(0));
  // f is 0 for every instance but the focused one, whose shape and outline fade to the plain box: over its own flight in a
  // board, as the view opens for the net.
  const f = select(isFocus, select(u.board.greaterThan(0.5), w, u.open), float(0));
  // calmT: how much tumble and shape are left; the rest of the opened entity calms as the view opens.
  const openO = select(ownerFocused, u.open, float(0));
  const calmO = float(1).sub(openO);
  const calmT = select(fly, float(1).sub(w), calmO);
  const pick = (g: typeof u.shape, own: ThreeNS.Node<"float">) => mix(g, own, u.mixed).mul(calmT);
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
  // Every other form recedes while a view is open; so do the opened entity's satellites when it opens as the net.
  const boxed = mix(p1, net, f);
  const gone = select(fly, flat, select(isFocus, float(0), u.recede));

  // Turn: a quarter turn per period, eased, after a hold; the phase staggers forms so they do not turn in step.
  const q = u.turnT.add(iB.w).div(TURN_PERIOD);
  const quarter = floor(q).add(smoothstep(u.m.hold, 1, fract(q))).mul(PI.div(2));
  // A satellite turns steadily at its own slow rate on the orbit clock, not in quarter turns (board-mesh.ts follows it).
  const cadence = select(isSat, iB.w.add(iH.y.mul(orbit.u.t)), quarter);
  // Settle: near the camera the angle eases to the one that points the front face (+z) at the camera, along the short way.
  const toCam = cameraPosition.xz.sub(vec2(iC.x, iC.y));
  // The focused form's target eases from the camera's direction to the board's (flight.yaw) as it calms, the short way, so
  // its front is square to the board when its card takes over.
  const camYaw = atan(toCam.x, toCam.y), dYaw = flight.yaw.sub(camYaw);
  const facing = camYaw.add(dYaw.sub(floor(dYaw.add(PI).div(PI.mul(2))).mul(PI.mul(2))).mul(f));
  // The focused form always settles: the view's camera sits straight in front of it, so its facing ends at 0.
  const near = max(float(1).sub(smoothstep(SETTLE_NEAR, SETTLE_FAR, length(toCam))).mul(u.settle), f).mul(float(1).sub(iG.z));
  const d = facing.sub(cadence);
  const short = d.sub(floor(d.add(PI).div(PI.mul(2))).mul(PI.mul(2)));
  // Float: the form drifts about all three axes and bobs and sways, like a body hanging in still water, seeded by the
  // form's phase so no form repeats a neighbour. The motion fades near the camera and to 0 in the entity view, where the
  // form must lie flat and face the viewer.
  // Amplitudes and clocks come from the motion matrix (Motion): each channel has its own clock, advanced on the CPU by
  // dt · speed, so changing a speed never jumps the phase. spread scales the per-form seed (0 = every form in step).
  const { amp: A, t: T } = u.m;
  const seed = iB.w.mul(u.m.spread);
  const nearGain = float(1).sub(near.mul(u.m.nearCalm));
  const gain = nearGain.mul(calmT).mul(u.drift);
  // A rotation axis is two sines at unrelated frequencies, the second at 0.45 of the first's amplitude.
  const wave = (t: ThreeNS.Node<"float">, f1: number, s1: number, f2: number, s2: number) =>
    sin(t.mul(f1).add(seed.mul(s1))).add(sin(t.mul(f2).add(seed.mul(s2))).mul(0.45));
  const pitch = wave(T.pitch, 0.53, 2.1, 0.31, 1).mul(A.pitch).mul(gain);
  const roll = wave(T.roll, 0.41, 3.3, 0.23, 1.3).mul(A.roll).mul(gain);
  const yawWobble = sin(T.yaw.mul(0.37).add(seed.mul(0.9))).mul(A.yaw).mul(gain);
  // Bob, sway and hover move the centre (float.ts); a satellite takes its form's seed, so the cluster floats as one body.
  const { bob, sway, hover } = makeFloat(TSL, u.m, u.drift)(
    select(isSat, iH.z, iB.w), select(flySat, float(1), nearGain.mul(calmT)), select(flySat, float(1), calmT),
  );

  // A flying satellite turns to the nearest quarter of the board's yaw (all its faces show its picture), picked from its
  // turn at turnAt, so the pick never flips during the flight.
  const quarterTo = floor(iB.w.add(iH.y.mul(u.turnAt)).sub(flight.yaw).div(PI.div(2)).add(0.5)).mul(PI.div(2));
  const angle = select(flySat, mix(cadence, flight.yaw.add(quarterTo), w), cadence.add(short.mul(near))).add(yawWobble);
  const rotX = (v: ThreeNS.Node<"vec3">, a: ThreeNS.Node<"float">) =>
    vec3(v.x, v.y.mul(cos(a)).sub(v.z.mul(sin(a))), v.y.mul(sin(a)).add(v.z.mul(cos(a))));
  const rotZ = (v: ThreeNS.Node<"vec3">, a: ThreeNS.Node<"float">) =>
    vec3(v.x.mul(cos(a)).sub(v.y.mul(sin(a))), v.x.mul(sin(a)).add(v.y.mul(cos(a))), v.z);
  // The face a card lifts from, in the form's own frame: the side turned to the board, the front for the form. The box is
  // pressed toward that face's plane.
  const faceTurn = select(isSat, quarterTo, float(0));
  const toZ = vec2(sin(faceTurn).negate(), cos(faceTurn));
  const axis = select(abs(toZ.y).greaterThanEqual(abs(toZ.x)), vec3(0, 0, sign(toZ.y)), vec3(sign(toZ.x), 0, 0));
  const pressed = boxed.add(axis.mul(D.sub(dot(boxed, axis)).mul(press)));
  const local = pressed.mul(float(1).sub(gone)).mul(satK);

  // The form rests on the ground at every shape: lifted by its own half-height, which grows toward the sphere.
  // The unfolded net reaches 3H + 2D below its front's centre, so it rises by 2H + 2D to stay above the ground.
  const lift = select(isSat, iF.x, iC.w).mul(mix(float(1), float(SPHERE_R), shape)).add(f.mul(u.unfold).mul(iC.w.mul(2).add(iC.z.mul(2))));

  // The satellite's offset from its form's centre (orbit.ts). It collapses with the other forms while any entity view is open,
  // except for the opened entity's satellites when it opens as a board: they keep orbiting until their pictures take over.
  const orbiting = select(isSat, select(fly, float(1), float(1).sub(u.recede)), float(0));
  const params = { r: iF.y, e: iH.x, omega: iF.z, theta0: iF.w, tilt: iG.x, azim: iG.y, prec: iH.w };
  const off0 = orbit.offset(params), off = off0.mul(orbiting);
  // A satellite's centre never sinks below its own half-size, so a tipped orbit does not dip through the ground.
  const cy = lift.add(hover).add(bob).add(off.y);
  // The instance matrix is identity and unused: positionNode replaces positionLocal after three's instancing transform,
  // so every per-instance value comes from the attributes above.
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  const live = vec3(iC.x.add(sway.x).add(off.x), select(isSat, max(cy, iC.w.mul(satK)), cy), iC.y.add(sway.y).add(off.z));
  // A flying cube's centre follows its flight from where it is now; it turns into the board's frame as it calms (w) and
  // leans with the flight (flight.ts).
  const ahead = orbit.offset(params, (orbit.u.t as unknown as ThreeNS.Node<"float">).add(0.05)).sub(off0);
  const fl = flight.fly(live, flight.place(iE.w, iG.w), select(isSat, flight.away(ahead), flight.normal), tauF);
  const tumbled = rotX(rotZ(local, roll), pitch);
  const flown = flight.orient(flight.rotY(tumbled, angle.sub(flight.yaw)), fl.ax, fl.ay, w);
  mat.positionNode = select(fly, flown.add(fl.pos), flight.rotY(tumbled, angle).add(live));

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
  const sample = texture(tex, uv()).depth(int(max(layer, 0).add(0.5)));
  // A face with no picture (layer -1) and the unfilled parts of a picture (layer alpha 0) are transparent: discarded by
  // alpha test, not blended, so there is no draw-order sorting and the inside of the form shows through.
  const visible = select(layer.lessThan(-0.5), float(0), sample.a);
  mat.opacityNode = select(inWindow.and(side.greaterThan(0.5)), float(0), visible);
  mat.alphaTest = 0.5;

  // Shading from the deformed surface itself (screen derivatives), so every deformation shades without its own normal
  // maths. The derivative's sign differs between the backends' framebuffer y, so the normal is turned toward the camera.
  const fn = normalize(cross(dFdx(positionWorld), dFdy(positionWorld)));
  const n2 = fn.mul(sign(dot(fn, cameraPosition.sub(positionWorld))));
  const shade = float(SHADE_MIN).add(max(dot(n2, normalize(vec3(...LIGHT_DIR))), 0).mul(1 - SHADE_MIN));
  mat.colorNode = vec4(sample.rgb.mul(shade), 1);

  const mesh = new THREE.InstancedMesh(geo, mat, n);
  // The bounds three computes come from the identity instance matrices, not from the attributes.
  mesh.frustumCulled = false;

  return { mesh, u, dispose: () => { geo.dispose(); mat.dispose(); } };
}
