// Interior neighbours: the entity past each edge of the open one, read from the field's slot grid, with a walk's next step on the right.
import type Field from "../Field";
import type { Dir } from "./state";

const STEP: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

// The field tiles, so the grid wraps; empty trailing slots of the last row are stepped over.
export function neighbour(f: Field, id: string, dir: Dir): { id: string; walk?: string } | null {
  if (dir === "right") {
    const p = f.passingTrace(), next = p && p.trace.steps[p.index] === id ? p.trace.steps[p.index + 1] : null;
    if (p && next && next !== id && f.byId(next)) return { id: next, walk: p.trace.name };
  }
  const nodes = f.OBJECTS, me = f.byId(id);
  if (nodes.length < 2 || !me || me.gx === undefined) return null;
  const cols = Math.ceil(Math.sqrt(nodes.length)), rows = Math.ceil(nodes.length / cols);
  const slot = new Map<number, string>();
  nodes.forEach(o => slot.set(o.gz * cols + o.gx, o.id));
  const [dx, dz] = STEP[dir];
  let x = me.gx, z = me.gz;
  for (let i = 0; i <= cols; i++) {
    x = (x + dx + cols) % cols; z = (z + dz + rows) % rows;
    const hit = slot.get(z * cols + x);
    if (hit && hit !== id) return { id: hit };
  }
  return null;
}
