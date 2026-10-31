// Catalogue (the index): view model for the list of walks.
import type Field from "./Field";
import type { FieldNode, State, Vals } from "./types";
import { key, rand } from "./util";
import { plate } from "./plate";
import { yearOf } from "./chronology";

export function catalogueVals(f: Field, st: State, out: Vals): void {
  // a walk's name only ever stands for what is on it, so the reading order
  // laid across a table and the order somebody walked read the same way
  const asBook = (name: string, steps: string[], color: string, mine: boolean) => {
    const src = f.state.seeded.find(s => s.name === name);
    const tableSet = !!(src && src.table);
    const isKept = !!(f.state.kept || {})[name];
    const objs = steps.map(id => f.byId(id)).filter(Boolean);
    const years = objs.map(o => yearOf(o)).filter((y): y is number => y !== null);
    const traces = f.NOTES.filter(n => n.walk === name).length + (mine ? f.NOTES.filter(n => n.mine && !n.walk).length : 0);
    const go = () => {
      f.filterSet = new Set(steps);
      f.setState({ catalogue: false, filter: mine ? null : name, joined: mine ? null : name });
      if (steps.length) f.flyTo(steps[0], "↓", false, false);
    };
    const shown = objs.slice(0, 9);
    const xs = objs.map(o => o.hx), zs = objs.map(o => o.hz);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minZ = Math.min.apply(null, zs), maxZ = Math.max.apply(null, zs);
    const spanX = Math.max(1, maxX - minX), spanZ = Math.max(1, maxZ - minZ);
    const kk = Math.min(168 / spanX, 100 / spanZ);
    const px = (o: FieldNode) => (100 + (o.hx - (minX + maxX) / 2) * kk).toFixed(1);
    const py = (o: FieldNode) => (65 + (o.hz - (minZ + maxZ) / 2) * kk).toFixed(1);
    let route = "", nodesPath = "";
    objs.forEach((o, i) => {
      route += (i ? "L" : "M") + px(o) + "," + py(o);
      const x = +px(o), y = +py(o), rr = 2.6;
      nodesPath += "M" + (x - rr).toFixed(1) + "," + y.toFixed(1) + "L" + (x + rr).toFixed(1) + "," + y.toFixed(1) +
                   "M" + x.toFixed(1) + "," + (y - rr).toFixed(1) + "L" + x.toFixed(1) + "," + (y + rr).toFixed(1);
    });
    const keep = (ev?: any) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      const kp = Object.assign({}, f.state.kept || {});
      if (kp[name]) delete kp[name]; else kp[name] = true;
      f.setState({ kept: kp }, () => f.recomputeWear());
    };
    const hovered = f.state.hoverJourney === name;
    return {
      route, routeNodes: nodesPath,
      routeOff: hovered ? "0" : "1", routeOp: hovered ? "1" : "0", nodeOp: hovered ? "0.95" : "0",
      spineOp: hovered ? "0.28" : "0.8",
      enter_hover: () => f.setState({ hoverJourney: name }),
      leave_hover: () => { if (f.state.hoverJourney === name) f.setState({ hoverJourney: null }); },
      name, color,
      pages: shown.map((o, i) => ({
        plate: plate(o),
        x: ((i - (shown.length - 1) / 2) * 22).toFixed(1) + "px",
        y: ((rand(o.id + name + "py") - 0.5) * 6).toFixed(1) + "px",
        op: ((0.4 + (i / Math.max(1, shown.length - 1)) * 0.58) * (hovered ? 0.26 : 1)).toFixed(2)
      })),
      spineX: ((-(shown.length - 1) / 2 - 1.15) * 22).toFixed(1) + "px", spineY: "0px",
      meta: steps.length + (steps.length === 1 ? " object" : " objects") + (traces ? " · " + traces + (traces === 1 ? " trace" : " traces") : ""),
      span: years.length > 1 ? Math.min.apply(null, years) + "–" + Math.max.apply(null, years) : years.length === 1 ? String(years[0]) : "undated throughout",
      enter: go, key: key(go),
      kind: mine ? "open walk" : tableSet ? "a set, read flat or walked" : "a walk somebody took",
      isTable: tableSet,
      keptLabel: isKept ? "kept" : "keep it",
      keptColor: isKept ? "var(--field-accent)" : "color-mix(in srgb, var(--field-mist) 55%, transparent)",
      keep, keepKey: key(() => keep()),
      flatLabel: tableSet ? "open it flat" : "",
      flat: tableSet ? f.openFlat(src!) : null,
      flatKey: tableSet ? key(() => f.openFlat(src!)()) : null
    };
  };
  out.journeys = st.seeded.map(w => asBook(w.name, w.steps, f.walkColor(w.name), false));
  if (st.trace.length) out.journeys = [asBook("Your walk, still open", st.trace.map(t => t.id), "var(--field-walk)", true)].concat(out.journeys);
  const jw = st.filter ? st.seeded.find(w => w.name === st.filter) : null;
  out.inJourney = jw ? { name: jw.name, color: f.walkColor(jw.name), count: jw.steps.length + " objects" } : null;
}
