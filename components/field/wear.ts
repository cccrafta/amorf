// Wear: how much attention has settled on each object, and the cloud it leaves around it.
import type Field from "./Field";
import { rand } from "./util";
import { scribble } from "./plate";

// Wear is not a score. It is how much of the collection's attention has
// settled on a thing: the sheets left on it, the routes that go through it,
// and how often it has been opened. It only ever shows up as material.
export function recomputeWear(f: Field) {
  const kept = f.state.kept || {};
  f.wearBase = {};
  f.OBJECTS.forEach(o => {
    const sheets = f.NOTES.filter(x => x.obj === o.id).length;
    let routes = 0;
    (f.state.seeded || []).forEach(s => { if (s.steps.indexOf(o.id) > -1) routes += kept[s.name] ? 0.2 : 0.11; });
    f.wearBase[o.id] = Math.min(1, sheets * 0.1 + routes + rand(o.id + "wear") * 0.26);
  });
  f.wearRev = (f.wearRev || 0) + 1;
  f.cloudCache = {};
  f.trackKey = null;
}

export function wearOf(f: Field, id: string): number {
  const base = f.wearBase[id] || 0, v = f.visits[id] || 0;
  return Math.max(0, Math.min(1, (base + v * 0.11) * (f.props.wearStrength ?? 1)));
}

// The accumulation that hangs around a worn object in the field, before you
// are close enough to read whose hand any of it is.
export function cloudFor(f: Field, id: string, wr: number) {
  const n = Math.max(0, Math.round(wr * 6));
  const key = id + ":" + n;
  if (!f.cloudCache[key]) f.cloudCache[key] = n ? scribble("cloud" + id).slice(0, n) : [];
  return f.cloudCache[key];
}
