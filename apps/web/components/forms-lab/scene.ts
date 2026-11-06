// Forms lab scene: one WebGPURenderer (WebGPU, or its WebGL 2 backend under ?gl=webgl2), an orbit camera, a faint ground
// grid and every entity's form. three is loaded by dynamic import, as in the field (components/field/world.ts).
import type * as ThreeNS from "three/webgpu";
import type { FormFaces } from "./faces";
import { makeLayers } from "./layers";
import { makeBoard } from "./board-mesh";
import { boardLayout, departure, landing, type BoardBounds } from "./board";
import { makeFlight } from "./flight";
import { satellitesOf } from "./satellites";
import { makeOrbit } from "./orbit";
import {
  CALM_END, CAMERA_FREQ, CLICK_SLOP, CLOSE_SPEED, MAX_BOARD, DRAG_SLOP, FIT_MARGIN, FLING, GLIDE_MS, HERO_SPAN, MORPH_PERIOD, SPACING, VIEW_SECONDS, WHEEL_MOMENTUM, ZOOM_FLOOR,
  ZOOM_MAX,
} from "./config";
import { makeForms, CHANNELS, OUTLINE, proportion, type FormPlace, type Motion, type Outline } from "./form";
import { readCssColor } from "@/lib/css-color";

export type Three = typeof ThreeNS;
export type Tsl = typeof import("three/tsl");

// What an opened entity becomes: the board of all its pictures (as the DOM entity view), or the cube's flat net (EXP-0016).
export type EntityView = "board" | "net";
export type LabOptions = { entityView: EntityView; motion: Motion; turn: boolean; drift: boolean; settle: boolean; satOn: boolean; satRadius: number; satSize: number; satSpeed: number; mixed: boolean; test: boolean; autoMorph: boolean; shape: number } & Outline;
export type LabStatus = {
  backend: "webgpu" | "webgl2"; forms: number; sats: number; pictures: number; loaded: number; layers: number; draws: number; shape: number;
};
// The entity view: the title of the form in view, or null in the free view.
export type LabView = { title: string } | null;
export type Lab = { set: (o: Partial<LabOptions>) => void; back: () => void; dispose: () => void };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const forceWebGL = (search: string) => new URLSearchParams(search).get("gl") === "webgl2";

// A seeded value per form and parameter, so "per-form" shows the same varied field on every load.
const hash = (i: number, k: number) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
// Each form gets one or two outline parameters, not all five, so the variety stays readable.
function ownOutline(i: number): Outline {
  const o = Object.fromEntries(OUTLINE.map(k => [k, 0])) as Outline;
  const first = OUTLINE[Math.floor(hash(i, 1) * OUTLINE.length)];
  o[first] = 0.3 + hash(i, 2) * 0.7;
  if (hash(i, 3) > 0.5) o[OUTLINE[Math.floor(hash(i, 4) * OUTLINE.length)]] = 0.3 + hash(i, 5) * 0.7;
  return o;
}

function placesOf(forms: FormFaces[], faceLayers: number[][]): FormPlace[] {
  const cols = Math.ceil(Math.sqrt(forms.length));
  return forms.map((f, i) => ({
    x: (i % cols - (cols - 1) / 2) * SPACING,
    z: (Math.floor(i / cols) - (Math.ceil(forms.length / cols) - 1) / 2) * SPACING,
    ar: f.ar,
    // An irrational step, so neighbours never share a turn phase.
    phase: (i * 1.618) % 4,
    ownShape: (i % 3) / 2,
    own: ownOutline(i),
    layers: faceLayers[i],
  }));
}

export async function startLab(
  canvas: HTMLCanvasElement, forms: FormFaces[], opts: LabOptions, onStatus: (s: LabStatus) => void, onView: (v: LabView) => void,
): Promise<Lab> {
  const [THREE, TSL, { OrbitControls }] = await Promise.all([
    import("three/webgpu"), import("three/tsl"), import("three/addons/controls/OrbitControls.js"),
  ]);

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: forceWebGL(location.search) });
  await renderer.init();
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? "webgpu" : "webgl2";
  canvas.dataset.backend = backend;

  const bg = readCssColor("--field-bg", "#1e1e1e"), ink = readCssColor("--field-ink", "#bdbab0");
  renderer.setClearColor(new THREE.Color().setRGB(bg[0] / 255, bg[1] / 255, bg[2] / 255, THREE.SRGBColorSpace), 1);

  const layers = makeLayers(THREE, forms, ink, bg);
  const pictures = layers.total - 6;
  const places = placesOf(forms, layers.faceLayers);
  // Satellites are more instances of the same mesh, after the main forms; the board and picking use the main places only.
  const { sats, reach, of } = satellitesOf(forms, places, layers.satLayers);
  // One orbit (clock, radius, size, switch) shared by the satellite cubes and the board pieces that start from them.
  const orbit = makeOrbit(TSL);
  // The board flight (its turn to the camera), shared by the flying cubes and the cards that take over from them.
  const flight = makeFlight(THREE, TSL);
  // Each form and satellite whose picture is on the board flies to it: when it leaves (the wave) and where it lands.
  const layouts = forms.map(f => boardLayout(f.board.slice(0, MAX_BOARD)));
  const satPlace = new Map(sats.map(sp => [sp.sat!, sp]));
  layouts.forEach((l, i) => l.boxes.forEach(b => {
    const s = of[i][b.src], pl = b.src === 0 ? places[i] : s && satPlace.get(s);
    if (pl) pl.card = { start: departure(b.delay), ...landing(l, b) };
  }));
  const formsObj = makeForms(THREE, TSL, [...places, ...sats], layers.tex, orbit, flight);
  const scene = new THREE.Scene();
  scene.add(formsObj.mesh);
  const board = makeBoard(THREE, TSL, forms, places, layouts, of, orbit, layers, formsObj.u, flight);
  if (board.mesh) scene.add(board.mesh);

  const extent = Math.ceil(Math.sqrt(forms.length)) * SPACING;
  const inkColor = new THREE.Color().setRGB(ink[0] / 255, ink[1] / 255, ink[2] / 255, THREE.SRGBColorSpace);
  const grid = new THREE.GridHelper(extent + SPACING * 4, Math.round((extent + SPACING * 4) / 1.5), inkColor, inkColor);
  const gridMat = grid.material as ThreeNS.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.14;
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  // The renderer only relabels the coordinate system at render time; set it so the projection is built for this backend (EXP-0013).
  camera.coordinateSystem = renderer.coordinateSystem;
  camera.position.set(0, 3.2, extent / 2 + 9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  fit();
  window.addEventListener("resize", fit);

  const u = formsObj.u;
  const apply = () => {
    u.mixed.value = opts.mixed ? 1 : 0;
    u.settle.value = opts.settle ? 1 : 0;
    u.drift.value = opts.drift ? 1 : 0;
    orbit.u.on.value = opts.satOn ? 1 : 0;
    orbit.u.radius.value = opts.satRadius;
    orbit.u.size.value = opts.satSize;
    const m = opts.motion;
    for (const c of CHANNELS) u.m.amp[c].value = m.channels[c].amp;
    u.m.spread.value = m.spread;
    u.m.nearCalm.value = m.nearCalm;
    u.m.hold.value = m.hold;
    u.test.value = opts.test ? 1 : 0;
    if (!opts.autoMorph) u.shape.value = opts.shape;
    for (const k of OUTLINE) u[k].value = opts[k];
  };
  apply();

  // Entity view: p runs toward goal (1 in, 0 out) while a form is in view; focus is null in the free view. The form's own
  // motion lives in the shader (u.focus, u.open, u.unfold); this code moves the camera and picks the form.
  // board is the entity's board size when it opens as a board, null when it opens as the net. yaw, pitch and origin are the
  // frame the board (or net) is set up in (flight.ts): a board in front of the camera, facing it, so the camera stays put;
  // a net at its form, turned toward the camera, which then travels in.
  type Focus = {
    i: number; w: number; h: number; yaw: number; pitch: number; origin: ThreeNS.Vector3; board: BoardBounds | null;
    from: ThreeNS.Vector3; fromTarget: ThreeNS.Vector3;
  };
  let focus: Focus | null = null, p = 0, goal = 0, pending = -1;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ball = new THREE.Sphere(), hit = new THREE.Vector3();
  const toTarget = new THREE.Vector3(), toPos = new THREE.Vector3(), fwd = new THREE.Vector3();
  // A point in the board's frame (x across, y up, dz out of the board toward the viewer) in the world, as flight.ts has it.
  const onBoard = (out: ThreeNS.Vector3, f: Focus, x: number, y: number, dz: number) => {
    const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);
    return out.set(x * cy - y * sp * sy + dz * cp * sy, y * cp + dz * sp, -x * sy - y * sp * cy + dz * cp * cy).add(f.origin);
  };
  // The camera and the point it looks at each follow a critically damped spring to the view's pose: off at once, soft on
  // arrival, never past it, and a reversal mid-way simply turns around.
  const cam = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), look: new THREE.Vector3(), lookVel: new THREE.Vector3() };
  const spring = (x: ThreeNS.Vector3, v: ThreeNS.Vector3, to: ThreeNS.Vector3, dt: number) => {
    const e = Math.exp(-CAMERA_FREQ * dt);
    for (const k of ["x", "y", "z"] as const) {
      const d = x[k] - to[k], t = (v[k] + CAMERA_FREQ * d) * dt;
      v[k] = (v[k] - CAMERA_FREQ * t) * e;
      x[k] = to[k] + (d + t) * e;
    }
  };
  // Orbit controls keep damping motion that has not been applied yet; applying it now keeps a later pose from jumping.
  const flush = () => { controls.enableDamping = false; controls.update(); controls.enableDamping = true; };
  const halfTan = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const fitDist = (fw: number, fh: number) => Math.max(fh / 2 / halfTan(), fw / 2 / (halfTan() * camera.aspect)) * FIT_MARGIN;

  // Traversing a board follows the DOM entity view (interior/physics.ts, input.ts): the wheel pans the board, a drag pans it with a
  // glide, edges are walls, a board smaller than the view is held centred, and zoom (pinch, ctrl-wheel, + - 0) holds the point
  // under the pointer, from the overview of the whole board up to 2x. The camera stays straight in front of the board.
  // Nav works in the board's frame, its x centred on the board (onBoard turns it into the world).
  type Nav = {
    bd: BoardBounds; x: number; z: number; cx: number; cy: number; d1: number; zoom: number;
    // Glide speed in px per ms; positive moves the board right and down on screen.
    vx: number; vy: number;
    drag: { id: number; x: number; y: number; t: number; moved: number } | null;
    pointers: Map<number, { x: number; y: number }>;
    pinch: { d0: number; z0: number } | null;
    wheelAt: number; wheelMag: number;
  };
  let nav: Nav | null = null;
  const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const distOf = (n: Nav) => n.d1 / n.zoom;
  const zoomMin = (n: Nav) => clampN(n.d1 / fitDist(n.bd.w, n.bd.h), ZOOM_FLOOR, 1);
  // The camera centre is kept where the board still covers the view; a board smaller than the view stays centred.
  const hold = (n: Nav): [boolean, boolean] => {
    const hh = distOf(n) * halfTan(), hw = hh * camera.aspect;
    const rx = Math.max(0, n.bd.w / 2 - hw), ry = Math.max(0, n.bd.h / 2 - hh);
    const cx = clampN(n.cx, n.x - rx, n.x + rx), cy = clampN(n.cy, n.bd.cy - ry, n.bd.cy + ry);
    const hit: [boolean, boolean] = [cx !== n.cx, cy !== n.cy];
    n.cx = cx; n.cy = cy;
    return hit;
  };
  // dx, dy: how far the board moves on screen, in px.
  const nudge = (n: Nav, dx: number, dy: number) => {
    const wpp = (2 * distOf(n) * halfTan()) / Math.max(1, canvas.clientHeight);
    n.cx -= dx * wpp; n.cy += dy * wpp;
    const [hx, hy] = hold(n);
    if (hx) n.vx = 0;
    if (hy) n.vy = 0;
  };
  const zoomAt = (n: Nav, z: number, px: number, py: number) => {
    const z1 = clampN(z, zoomMin(n), ZOOM_MAX);
    if (Math.abs(z1 - n.zoom) < 1e-4) return;
    const r = canvas.getBoundingClientRect(), u = ((px - r.left) / r.width) * 2 - 1, v = -((py - r.top) / r.height) * 2 + 1;
    const h0 = distOf(n) * halfTan(), wx = n.cx + u * h0 * camera.aspect, wy = n.cy + v * h0;
    n.zoom = z1; n.vx = 0; n.vy = 0;
    const h1 = distOf(n) * halfTan();
    n.cx = wx - u * h1 * camera.aspect; n.cy = wy - v * h1;
    hold(n);
  };
  const startNav = (bd: BoardBounds, cx: number, cy: number, d1: number) => {
    nav = { bd, x: 0, z: 0, cx, cy, d1, zoom: 1, vx: 0, vy: 0, drag: null, pointers: new Map(), pinch: null, wheelAt: 0, wheelMag: 0 };
    canvas.style.cursor = "grab";
  };
  const stopNav = () => { nav = null; canvas.style.cursor = ""; };
  // Per frame: the glide after a drag, and the camera at the board's centre of view.
  const stepNav = (n: Nav, dt: number) => {
    if (!n.drag && n.pointers.size < 2) {
      const ms = dt * 1000, decay = Math.exp(-ms / GLIDE_MS), travel = GLIDE_MS * (1 - decay);
      nudge(n, n.vx * travel, n.vy * travel);
      n.vx *= decay; n.vy *= decay;
      if (Math.abs(n.vx) < 0.01) n.vx = 0;
      if (Math.abs(n.vy) < 0.01) n.vy = 0;
    }
    hold(n);
    onBoard(camera.position, focus!, n.cx, n.cy, distOf(n));
    camera.lookAt(onBoard(hit, focus!, n.cx, n.cy, 0));
  };

  // A ray against one bounding sphere per form, from the known places: no GPU picking, since the shader moves the vertices.
  const formAt = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = -1, bestD = Infinity;
    places.forEach((pl, i) => {
      const [w, h] = proportion(pl.ar);
      // Centre and radius carry slack for the float: hover 0.3, bob 0.18, sway 0.16.
      ball.set(hit.set(pl.x, h * 1.1 + 0.3, pl.z), Math.max(w, h) * 1.5 + 0.35);
      if (ray.ray.intersectSphere(ball, hit)) {
        const d = hit.distanceTo(ray.ray.origin);
        if (d < bestD) { bestD = d; best = i; }
      }
    });
    // The cluster is tested only when no form is hit, so a satellite never hides a form in front of it; hitting one opens its entity.
    if (best < 0 && opts.satOn) places.forEach((pl, i) => {
      if (!reach[i]) return;
      const [, h] = proportion(pl.ar);
      ball.set(hit.set(pl.x, h * 1.1 + 0.3, pl.z), reach[i] * opts.satRadius + 0.3);
      if (ray.ray.intersectSphere(ball, hit)) {
        const d = hit.distanceTo(ray.ray.origin);
        if (d < bestD) { bestD = d; best = i; }
      }
    });
    return best;
  };

  const enter = (i: number) => {
    const [w, h] = proportion(places[i].ar);
    // An entity with no picture has no board, so it opens as the net.
    const bd = opts.entityView === "board" ? board.bounds[i] : null;
    flush();
    const { x, z } = places[i];
    focus = {
      i, w, h, board: bd, from: camera.position.clone(), fromTarget: controls.target.clone(),
      yaw: Math.atan2(camera.position.x - x, camera.position.z - z), pitch: 0, origin: new THREE.Vector3(x, 0, z),
    };
    if (bd) {
      // The board faces the camera square on, its hero centred in the view at the hero's framing distance (never farther
      // than the whole board needs), held inside the board's walls like any later pan; the camera does not move.
      camera.getWorldDirection(fwd);
      focus.yaw = Math.atan2(-fwd.x, -fwd.z);
      focus.pitch = Math.asin(clampN(-fwd.y, -1, 1));
      const d1 = Math.min(fitDist(bd.hero.w * HERO_SPAN, bd.hero.h * HERO_SPAN), fitDist(bd.w, bd.h));
      const at = { bd, x: 0, cx: bd.hero.dx, cy: bd.hero.y, d1, zoom: 1 } as Nav;
      hold(at);
      // The origin that puts that view exactly where the camera is.
      focus.origin.subVectors(camera.position, onBoard(toPos, { ...focus, origin: new THREE.Vector3() }, at.cx, at.cy, d1));
      startNav(bd, at.cx, at.cy, d1);
    }
    flight.u.yaw.value = focus.yaw;
    flight.u.pitch.value = focus.pitch;
    flight.u.origin.value.copy(focus.origin);
    u.turnAt.value = orbit.u.t.value;
    cam.pos.copy(camera.position); cam.vel.set(0, 0, 0);
    cam.look.copy(controls.target); cam.lookVel.set(0, 0, 0);
    u.focus.value = board.u.focus.value = i;
    u.board.value = bd ? 1 : 0;
    if (bd) board.ensure(i);
    goal = 1;
    controls.enabled = false;
    if (!bd) canvas.style.cursor = "";
    onView({ title: forms[i].title });
  };
  const back = () => {
    if (!focus || goal !== 1) return;
    if (nav) stopNav();
    // Fully open, every cube is hidden: each satellite picks its quarter turn afresh, from its turn now, for the way back.
    if (p === 1) u.turnAt.value = orbit.u.t.value;
    goal = 0;
    onView(null);
  };

  // A board opens with the camera near the entity, straight in front of its hero picture; a net, straight in front of the
  // net, far enough to fit it (6w wide, 4h + 4w tall) with a margin.
  const stepView = (dt: number) => {
    if (!focus) return;
    p += Math.sign(goal - p) * Math.min(Math.abs(goal - p), (dt / VIEW_SECONDS) * (goal < p ? CLOSE_SPEED : 1));
    // The form calms and every other form recedes first; a board's explosion runs with p from the start (every cube leaves
    // at once, config.ts) and is linear here since every flight eases on its own; a net unfolds after the calm.
    u.open.value = u.recede.value = smooth(0, CALM_END, p);
    u.unfold.value = focus.board ? 0 : smooth(CALM_END, 1, p);
    u.explode.value = board.u.explode.value = focus.board ? p : 0;
    const { w, h } = focus;
    if (nav && goal === 1) {
      // The board is traversed from the click on, while its pictures fly in; the spring picks up from wherever it was left.
      stepNav(nav, dt);
      cam.pos.copy(camera.position); cam.vel.set(0, 0, 0);
      onBoard(cam.look, focus, nav.cx, nav.cy, 0); cam.lookVel.set(0, 0, 0);
    } else {
      if (goal === 1) {
        onBoard(toTarget, focus, 0, 2 * h + 2 * w, w);
        onBoard(toPos, focus, 0, 2 * h + 2 * w, w + fitDist(6 * w, 4 * h + 4 * w));
      } else {
        toPos.copy(focus.from);
        toTarget.copy(focus.fromTarget);
      }
      spring(cam.pos, cam.vel, toPos, dt);
      spring(cam.look, cam.lookVel, toTarget, dt);
      camera.position.copy(cam.pos);
      camera.lookAt(cam.look);
    }
    if (p === 0 && goal === 0) {
      // The spring is within a hair of the free view by now; the free view takes over exactly where it was left.
      camera.position.copy(focus.from);
      controls.target.copy(focus.fromTarget);
      controls.enabled = true;
      u.focus.value = board.u.focus.value = -1;
      focus = null;
      controls.update();
      // A form clicked while the last one was still folding back opens now.
      if (pending >= 0) { const i = pending; pending = -1; enter(i); }
    }
  };

  let press: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => {
    if (nav) {
      if (e.button !== 0) return;
      nav.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      nav.vx = 0; nav.vy = 0;
      if (nav.pointers.size === 2) {
        // A second finger ends the drag and starts a pinch.
        const [a, b] = [...nav.pointers.values()];
        nav.drag = null;
        nav.pinch = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: nav.zoom };
      } else nav.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, moved: 0 };
      return;
    }
    press = { x: e.clientX, y: e.clientY };
  };
  const onNavMove = (n: Nav, e: PointerEvent) => {
    const p = n.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (n.pointers.size > 1) {
      const [a, b] = [...n.pointers.values()];
      if (n.pinch && b) zoomAt(n, n.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / n.pinch.d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const d = n.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y, ms = Math.max(1, e.timeStamp - d.t);
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX; d.y = e.clientY; d.t = e.timeStamp;
    // Captured only once it is a drag, so a plain click is not retargeted.
    if (d.moved > DRAG_SLOP && !canvas.hasPointerCapture(e.pointerId)) canvas.setPointerCapture(e.pointerId);
    nudge(n, dx, dy);
    n.vx = n.vx * 0.6 + (dx / ms) * 0.4;
    n.vy = n.vy * 0.6 + (dy / ms) * 0.4;
    canvas.style.cursor = d.moved > DRAG_SLOP ? "grabbing" : "grab";
  };
  const onNavEnd = (n: Nav, e: PointerEvent) => {
    n.pointers.delete(e.pointerId);
    if (n.pointers.size < 2) n.pinch = null;
    const d = n.drag;
    if (d && d.id === e.pointerId) {
      n.drag = null;
      // Holding still before letting go means no fling.
      if (e.timeStamp - d.t > 90) { n.vx = 0; n.vy = 0; }
      n.vx = clampN(n.vx, -FLING, FLING); n.vy = clampN(n.vy, -FLING, FLING);
    }
    canvas.style.cursor = "grab";
  };
  const onWheel = (e: WheelEvent) => {
    const n = nav;
    if (!n) return;
    e.preventDefault();
    // A pinch on a trackpad arrives as a ctrl-wheel: it zooms about the pointer.
    if (e.ctrlKey) { zoomAt(n, n.zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); return; }
    const now = performance.now(), mag = Math.hypot(e.deltaX, e.deltaY);
    // A shrinking delta is the device's own momentum, not the hand: only part of it moves the board.
    const k = mag < n.wheelMag && now - n.wheelAt < 200 ? WHEEL_MOMENTUM : 1;
    n.wheelAt = now; n.wheelMag = mag; n.vx = 0; n.vy = 0;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1;
    nudge(n, -(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * unit * k, e.shiftKey ? 0 : -e.deltaY * unit * k);
  };
  const onUp = (e: PointerEvent) => {
    if (nav) { onNavEnd(nav, e); return; }
    const start = press;
    press = null;
    if (e.type === "pointercancel") return;
    if (!start || e.button !== 0 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP) return;
    // While a view folds back the click is kept and opens that form as soon as the fold is done.
    if (focus) { if (goal === 0) pending = formAt(e); return; }
    const i = formAt(e);
    if (i >= 0) enter(i);
  };
  const onMove = (e: PointerEvent) => {
    if (nav) { onNavMove(nav, e); return; }
    if (focus || e.buttons !== 0) return;
    const i = formAt(e);
    canvas.style.cursor = i >= 0 ? "pointer" : "";
    // A hovered entity's board pictures start loading now, so they are usually in by the time it is clicked open.
    if (i >= 0 && opts.entityView === "board") board.ensure(i);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { back(); return; }
    // + and - zoom about the view's centre, 0 returns to zoom 1; the browser's own zoom keeps its modifier keys.
    if (!nav || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key === "+" || e.key === "=" ? 1.25 : e.key === "-" || e.key === "_" ? 0.8 : null;
    const r = canvas.getBoundingClientRect();
    if (k) zoomAt(nav, nav.zoom * k, r.left + r.width / 2, r.top + r.height / 2);
    else if (e.key === "0") zoomAt(nav, 1, r.left + r.width / 2, r.top + r.height / 2);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  let loaded = 0, draws = 0, last = performance.now(), lastStatus = 0, morphT = Math.acos(1 - 2 * opts.shape) / (2 * Math.PI) * MORPH_PERIOD;
  const status = () => onStatus({ backend, forms: forms.length, sats: sats.length, pictures, loaded, layers: layers.total, draws, shape: u.shape.value });
  layers.load(done => { loaded = done; });

  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (opts.turn) u.turnT.value += dt * opts.motion.turnSpeed;
    for (const c of CHANNELS) u.m.t[c].value += dt * opts.motion.channels[c].speed;
    orbit.u.t.value += dt * opts.satSpeed;
    if (opts.autoMorph) {
      morphT += dt;
      u.shape.value = 0.5 - 0.5 * Math.cos((morphT / MORPH_PERIOD) * Math.PI * 2);
    }
    if (focus) stepView(dt); else controls.update();
    renderer.render(scene, camera);
    draws = renderer.info.render.drawCalls;
    if (now - lastStatus > 250) { lastStatus = now; status(); }
  });

  return {
    set: o => {
      // Picking up the automatic morph from the slider's value, so the form does not jump.
      if (o.autoMorph && !opts.autoMorph) morphT = Math.acos(1 - 2 * u.shape.value) / (2 * Math.PI) * MORPH_PERIOD;
      Object.assign(opts, o);
      apply();
    },
    back,
    dispose: () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.style.cursor = "";
      controls.dispose();
      formsObj.dispose();
      board.dispose();
      layers.dispose();
      grid.geometry.dispose();
      gridMat.dispose();
      renderer.dispose();
    },
  };
}
