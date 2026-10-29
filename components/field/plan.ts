// Plan view: label placement and the view model for the field seen from above.
import type Field from "./Field";
import type { FieldNode, State, Vals } from "./types";
import { key } from "./util";

// Plan labels are placed only after the marks are already on the page, worn
// objects first, and dropped rather than overlapped if they clash — a name
// under the hand always shows.
export function placePlanLabels(f: Field) {
  const box = document.querySelector<HTMLElement>('[data-role="planbox"]');
  if (!box || !f.state.plan) return;
  const bb = box.getBoundingClientRect();
  const items = Array.from(box.children)
    .filter((n: any) => n.dataset && n.dataset.pid)
    .map((n: any) => ({ n, id: n.dataset.pid as string, mark: n.children[0] as HTMLElement, lab: n.children[1] as HTMLElement, wr: f.wearOf(n.dataset.pid) }))
    .sort((a, b) => (b.id === f.state.planHover ? 9 : b.wr) - (a.id === f.state.planHover ? 9 : a.wr));
  if (!items.length) return;
  const hov = f.state.planHover;
  const placed: DOMRect[] = items.map(it => it.mark.getBoundingClientRect());
  const clash = (r: DOMRect) => placed.some(q => r.left < q.right - 1 && r.right > q.left + 1 && r.top < q.bottom - 1 && r.bottom > q.top + 1);
  items.forEach(it => {
    const half = (5 + it.wr * 13) / 2 + 8;
    const order = it.n.dataset.side === "left" ? ["left", "right"] : ["right", "left"];
    const put = (s: string) => {
      it.lab.style.left = (s === "right" ? half : -half).toFixed(1) + "px";
      it.lab.style.transform = s === "right" ? "translateY(-50%)" : "translate(-100%, -50%)";
      return it.lab.getBoundingClientRect();
    };
    let ok = false;
    if (it.wr >= 0.3 || it.id === hov) {
      for (const s of order) {
        const r = put(s);
        if (r.left < bb.left + 3 || r.right > bb.right - 3) continue;
        if (clash(r)) continue;
        placed.push(r); ok = true; break;
      }
    }
    if (!ok && it.id === hov) put(order[0]);
    it.lab.style.opacity = it.id === hov ? "1" : ok ? "0.78" : "0";
  });
}

export function planVals(f: Field, st: State, out: Vals): void {
  const pc = (o: FieldNode) => (o.hx / f.TILE * 100).toFixed(2) + "," + (o.hz / f.TILE * 100).toFixed(2);
  const routeOf = (ids: string[]) => ids.map(id => f.byId(id)).filter(Boolean).map((o, i) => (i ? "L" : "M") + pc(o)).join("");
  out.plan = st.plan;
  out.onPlan = () => { f.panelWant = 0; f.setState({ plan: !f.state.plan, catalogue: false, tableOpen: false, compose: null, view: null }); };
  out.onPlanKey = key(() => out.onPlan());
  out.onClosePlan = () => f.setState({ plan: false });
  out.onClosePlanKey = key(out.onClosePlan);
  out.planNodes = f.OBJECTS.map(o => {
    const wr = f.wearOf(o.id);
    const go = () => { f.setState({ plan: false }); f.flyTo(o.id, "↓", false, true); };
    const on = st.planHover === o.id;
    const side = o.hx / f.TILE > 0.5 ? "row-reverse" : "row";
    const half = (5 + wr * 13) / 2 + 8;
    return {
      id: o.id, title: o.t,
      x: (o.hx / f.TILE * 100).toFixed(2) + "%",
      y: (o.hz / f.TILE * 100).toFixed(2) + "%",
      size: (5 + wr * 13).toFixed(1) + "px",
      op: on ? "1" : (0.3 + wr * 0.7).toFixed(2),
      ink: on ? "#6E9A8D" : f.visited[o.id] ? "#6E9A8D" : "#C9C5B9",
      lox: (side === "row" ? half : -half).toFixed(1) + "px",
      ltf: side === "row" ? "translateY(-50%)" : "translate(-100%, -50%)",
      z: on ? "3" : "1",
      labelOp: "0",
      side: side === "row" ? "right" : "left",
      labelInk: on ? "#E4DFD2" : "#C9C5B9",
      enter: () => f.setState({ planHover: o.id }),
      leave: () => { if (f.state.planHover === o.id) f.setState({ planHover: null }); },
      go, key: key(go)
    };
  });
  out.planEdges = (f.props.planEdges ?? true)
    ? f.ASSOC.map(a => {
        const A = f.byId(a[0]), B = f.byId(a[1]);
        return A && B ? { d: "M" + pc(A) + "L" + pc(B) } : null;
      }).filter(Boolean)
    : [];
  out.planWalks = st.seeded.map(w => {
    const objs = w.steps.map(id => f.byId(id)).filter(Boolean);
    const avg = objs.length ? objs.reduce((s, o) => s + f.wearOf(o.id), 0) / objs.length : 0;
    return { d: routeOf(w.steps), color: f.walkColor(w.name), w: (0.7 + avg * 2.6 + (st.kept[w.name] ? 1.2 : 0)).toFixed(2), op: (st.kept[w.name] ? 0.85 : 0.38).toFixed(2) };
  });
  out.planMine = st.trace.length > 1 ? routeOf(st.trace.map(t => t.id)) : "";
  const keptCount = Object.keys(st.kept).filter(k => st.kept[k]).length;
  out.planTally = f.OBJECTS.length + " entities · " + st.seeded.length + (st.seeded.length === 1 ? " route" : " routes") + (keptCount ? " · " + keptCount + " kept" : "");
}
