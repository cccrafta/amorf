// Forms lab tuning: every tuned number in one place, grouped by what it shapes. Look and feel change here, not inside shaders.
import type { Motion } from "./form";

// World
// Distance between neighbouring forms on the lab's grid, in world units.
export const SPACING = 4.5;

// Form geometry and shading
// Subdivisions per cube edge: enough for the sphere end to read round and for a few relief ribs per face; vertex cost grows with SEG².
export const SEG = 24;
// Sphere radius against the cube's half-size 1: about equal volume, so the morph neither swells nor shrinks the form.
export const SPHERE_R = 1.24;
// Relief: ribs per face across u, and the band at each face edge where the relief fades out so faces stay closed.
export const RIBS = 4;
export const RELIEF_EDGE = 0.12;
// The darkest shade a face takes against the light.
export const SHADE_MIN = 0.72;
// The one light direction, shared by the forms and the board cards so a card matches the face it lifts from.
export const LIGHT_DIR: [number, number, number] = [0.4, 0.85, 0.5];
// One full cube, sphere and back cycle of the automatic morph, in seconds.
export const MORPH_PERIOD = 8;

// Turn and settle
// Each quarter turn takes TURN_PERIOD seconds of the turn clock.
export const TURN_PERIOD = 4;
// Within SETTLE_NEAR of the camera a form faces it fully; past SETTLE_FAR it keeps its own cadence.
export const SETTLE_NEAR = 5;
export const SETTLE_FAR = 11;

// Float: the starting motion matrix (the lab's panel edits a copy).
export const DEFAULT_MOTION: Motion = {
  channels: {
    pitch: { amp: 0.22, speed: 1 }, roll: { amp: 0.2, speed: 1 }, yaw: { amp: 0.14, speed: 1 },
    bob: { amp: 0.18, speed: 1 }, sway: { amp: 0.16, speed: 1 }, hover: { amp: 0.3, speed: 1 },
  },
  spread: 1, nearCalm: 0.75, turnSpeed: 1, hold: 0.7,
};

// Satellites (DDR-0005)
// Most satellites one entity shows; the rest of its pictures appear only on the board.
export const MAX_SAT = 9;
// Up to PER_SHELL satellites share one orbit ellipse; GAP is the free distance between neighbouring shells.
export const PER_SHELL = 5;
export const SHELL_GAP = 0.12;
// Half-extent range, many small and few large (a power curve on the seeded value).
export const SAT_MIN = 0.06, SAT_MAX = 0.26, SAT_SIZE_CURVE = 1.8;
// Eccentricity range of a shell's ellipse.
export const ECC_MIN = 0.04, ECC_MAX = 0.12;
// Kepler's third law, T² proportional to a³: omega = ORBIT_K * a^-1.5, so inner shells run faster than outer ones.
export const ORBIT_K = 0.75;

// Entity view
// The choreography of opening an entity as a board, on one progress p from 0 to 1 (the explosion runs with p).
// The board comes to the view: it is set up facing the camera, in front of it, and the camera does not travel.
//   every cube  (the thumbnail and each satellite) never stops. It leaves from its live motion, the thumbnail first (LEAD)
//               and the satellites after it over BOARD_WAVE, nearest the hero first, and flies for FLIGHT to its place.
//   mid-flight  its tumble, turn and shape calm over the first FLAT of the flight, and the last PRESS of that presses it
//               flat; at FLAT the cube is exactly its flat card, which takes over, then grows and opens to its whole picture.
//   others      the other entities recede over p 0 to CALM_END. A picture with no satellite grows from the form's place.
// Every flight is a curved path with an eased arrival that never passes its place (flight.ts). Panning and zoom work from
// the click; on closing, the camera springs back to where it was (CAMERA_FREQ).
// Closing runs it back, faster: each card shrinks to its cube on the way, and the cube lands back in its live motion.
// About 1 s per flight, as Material 3's extra-long transitions (700 to 1000 ms) for a large move across the view, with the
// stagger of the wave on top; closing is shorter, as exits are.
export const VIEW_SECONDS = 1.35;
export const CLOSE_SPEED = 1.3;
export const CALM_END = 0.3;
export const LEAD = 0.03;
export const BOARD_WAVE = 0.25;
export const FLIGHT = 1 - LEAD - BOARD_WAVE;
// The ease is front-loaded, so FLAT 0.35 is about half the path; PRESS is a share of the flight too.
export const FLAT = 0.35;
export const PRESS = 0.15;
// A flight's ease: smoothstep of 1 - (1 - t)^EASE_SKEW. Soft start, soft landing, never past its place, and the speed
// peaks before the middle, like Material 3's standard curve, cubic-bezier(0.2, 0, 0, 1). It is an ease-in-out, so played
// backward on closing it still leaves gently and lands softly. 1 is a plain smoothstep; higher is more front-loaded.
export const EASE_SKEW = 1.6;
// A flight's path is a cubic curve: it leaves along LIFT_OUT of the path's length (outward along its orbit and toward the
// viewer) and comes in to the board from LAND_DEPTH of the path's length in front of it, so it is set down, not slid in.
export const LIFT_OUT = 0.35, LAND_DEPTH = 0.3;
// Largest lean of a flying cube or card into its direction of travel, in radians, at mid-flight.
export const BANK = 0.3;
// The camera's critically damped spring (the net view, and the way back from a panned board), in rad/s: 90 percent of the
// way in about 3.9 / CAMERA_FREQ seconds, with no overshoot.
export const CAMERA_FREQ = 7;
// How many hero-picture sizes the camera shows on arrival (zoom 1); the rest of the board is reached by panning and zooming.
export const HERO_SPAN = 2.2;
// Camera distance margin when fitting a size to the view.
export const FIT_MARGIN = 1.15;
// A press that moves less than this many pixels is a click; more is an orbit drag.
export const CLICK_SLOP = 5;

// Board traversal (follows the DOM entity view: interior/physics.ts, input.ts)
export const ZOOM_MAX = 2, ZOOM_FLOOR = 0.15, GLIDE_MS = 140, FLING = 2.5, WHEEL_MOMENTUM = 0.35, DRAG_SLOP = 6;

// Board layout and flight
// World units per board module; a 5-module picture is 4.5 wide against a form's 2.
export const MODULE = 0.9;
// The board's lowest edge clears the ground by this much.
export const BASE_Y = 0.4;
// Rings are stretched vertically by the screen's aspect so a wide screen is filled sideways first; SEARCH bounds the grid search.
export const BOARD_ASPECT = 16 / 9;
export const BOARD_SEARCH = 40;
// Module widths by kind, as in the DOM board: a landscape picture 5, a portrait 4, a video 7.
export const BOARD_COLS = { landscape: 5, portrait: 4, video: 7 };

// Textures
// 256² is larger than the field's planned 128² (STU-0006 budget) because the lab is viewed close up.
export const LAYER = 256;
// WebGL 2's guaranteed floor and WebGPU's default limit; pictures past it stay plain.
export const MAX_LAYERS = 256;
// Pictures fetched at once: for the form faces at start, for one entity's board on first open.
export const FACE_PARALLEL = 6;
export const BOARD_PARALLEL = 4;
// The board's texture bank holds one entity's pictures, at most MAX_BOARD; drawn pictures stay in a cache of BOARD_CACHE
// (by url, least recently used out), so reopening or hovering again fills the bank without a fetch.
export const MAX_BOARD = 64;
export const BOARD_CACHE = 48;
