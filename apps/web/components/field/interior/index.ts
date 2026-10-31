// Interior: an entity's view — its authored board, panning with momentum and rubber-band, the fixed frame and tools drawer, and edge pulls to neighbours.
export { newInterior } from "./state";
export type { Interior, Phase, Comp } from "./state";
export { begin, collapse, leaveToward, dismiss, goNeighbour, setDrawer } from "./lifecycle";
export { step } from "./physics";
export { keyPan, bindInterior } from "./input";
export { paint } from "./paint";
export { interiorVals } from "./layout";
