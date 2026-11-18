// Card to world: where a form stands for a card, from the numbers frame() already holds for the card, free of the DOM and of
// three so a script can run it under Node (as ground-math.ts does). The world is in the eye frame: the eye is the xz origin,
// y is up from the ground, and the camera only turns by -yaw (world.ts), so a card's camera-frame offset (lx, lz - P) is
// turned by yaw about the eye to land in the world.
import { proportion } from "../../forms-lab/form";
import { PLATE_H, PLATE_W } from "./config";

export type CardPlace = {
  // frame()'s lx and lz (after wearPull), the wrapDeg that turns the card to the viewer, the card's layout height and the camera yaw in degrees.
  lx: number; lz: number; wrapDeg: number; cardH: number; yawDeg: number; P: number;
};
// x, y, z: the form's centre in the eye frame; yaw: its front's world heading (three's rotation about y); k: lab units to world units.
export type Anchor = { x: number; y: number; z: number; yaw: number; k: number };

// ar: the cover's height / width, which the form takes as its proportion. The form is as large as the plate allows and stands
// with its front face in the card's plane (its centre half a depth behind), so at rest its picture is the DOM plate.
export function plateAnchor(c: CardPlace, ar: number): Anchor {
  const r = (c.yawDeg * Math.PI) / 180, w = (c.wrapDeg * Math.PI) / 180;
  const cz = c.lz - c.P;
  const wx = c.lx * Math.cos(r) - cz * Math.sin(r), wz = c.lx * Math.sin(r) + cz * Math.cos(r);
  // Pinned cards stand on the ground, so the card's bottom is at y = 0 and the plate's centre is half a plate below its top.
  const wy = c.cardH - PLATE_H / 2;
  const yaw = w - r;
  const [sx, sy] = proportion(ar);
  const k = Math.min(PLATE_W / 2 / sx, PLATE_H / 2 / sy);
  return { x: wx - Math.sin(yaw) * sx * k, y: wy, z: wz - Math.cos(yaw) * sx * k, yaw, k };
}
