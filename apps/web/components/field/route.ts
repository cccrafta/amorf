// Route: the address bar mirrors the field's view (/, /entities/<id>, /plan, /walks/<name>, ?q=) through the History
// API, so one mounted Field serves every URL; back and forward replay the view through the same lifecycle calls.
import type Field from "./Field";
import { switchTo } from "./navigation";
import { slugOf, type Route } from "./route-path";
import { SEEDED_WALKS } from "@/lib/field-data";

// The path the field's current state stands for.
function wantPath(f: Field): string {
  const st = f.state;
  if (st.open) return "/entities/" + st.open;
  if (st.plan) return "/plan";
  // only walks known at build time have a prerendered page; a walk named in this visit has no address
  const w = st.filter ? SEEDED_WALKS.find(s => s.name === st.filter) : null;
  return w ? "/walks/" + slugOf(w.name) : "/";
}

const pathNow = () => location.pathname.replace(/\/+$/, "") || "/";

// Runs after every commit. A pending popstate target (routeGoal) is waited for rather than overwritten, and a field
// view reached by flying between entities is not recorded while routeHold lasts, so the history keeps entity to entity.
export function syncUrl(f: Field) {
  const now = performance.now(), want = wantPath(f);
  if (f.routeGoal !== null) {
    if (want === f.routeGoal || now - f.routeGoalAt > 3000) f.routeGoal = null; else return;
  }
  if (want === "/" && now < f.routeHold) return;
  const q = f.state.query.trim(), cur = new URLSearchParams(location.search), spaces = cur.get("spaces"), map = cur.get("map"), gl = cur.get("gl");
  const parts = [q ? "q=" + encodeURIComponent(q) : "", spaces ? "spaces=" + encodeURIComponent(spaces) : "", map ? "map=" + encodeURIComponent(map) : "", gl ? "gl=" + encodeURIComponent(gl) : ""].filter(Boolean);
  const search = parts.length ? "?" + parts.join("&") : "";
  if (pathNow() !== want) history.pushState(null, "", want + search);
  else if (location.search !== search) history.replaceState(null, "", want + search);
  const title = want.startsWith("/entities/") ? f.byId(f.state.open as string)?.t : null;
  document.title = title ? title + " · " + f.baseTitle : f.baseTitle;
}

// Puts the field into the view the URL names. cold = first load: go straight inside the entity instead of flying to it.
export function applyRoute(f: Field, r: Route, cold: boolean) {
  const q = new URLSearchParams(location.search).get("q") || "";
  f.setState({ query: q, askOpen: !!q });
  const seen = { plan: false, catalogue: false, tableOpen: false, compose: null, view: null };
  let goal = "/";
  if (r.kind === "entity" && f.OBJECTS.some(o => o.id === r.id)) {
    goal = "/entities/" + r.id;
    f.routeGoal = goal; f.routeGoalAt = performance.now();
    f.setState({ ...seen });
    if (f.state.open === r.id) {
      // Back then Forward before the leave finished: take the pull-back back instead of letting it close the entity.
      if (f.ix.phase === "leaving") { f.ix.phase = "inside"; f.ix.leaveTo = null; }
      if (f.ix.phase !== "slide") f.routeGoal = null;
      return;
    }
    if (cold) switchTo(f, r.id, ""); else f.flyTo(r.id, "↺", false, true);
    return;
  }
  const walk = r.kind === "walk" ? f.state.seeded.find(s => slugOf(s.name) === r.slug) : null;
  if (r.kind === "plan") goal = "/plan";
  else if (walk) goal = "/walks/" + slugOf(walk.name);
  f.routeGoal = goal; f.routeGoalAt = performance.now();
  f.collapse();
  if (walk) f.filterSet = new Set(walk.steps); else f.filterSet = null;
  f.setState({ ...seen, plan: r.kind === "plan", filter: walk ? walk.name : null, joined: walk ? walk.name : null });
}
