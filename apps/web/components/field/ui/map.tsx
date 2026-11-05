// Walk minimap view: static structure only; paintMap() in map.ts writes every path and the cone from frame().
import type { V } from "../types";
import { MAP_VIEW, MAP_CONE } from "../map";
import { PLAN_INK } from "../plan";
import { PlanWalkPath } from "./plan";

export function renderMap(v: V) {
  const c = MAP_VIEW / 2;
  return (
    <div data-role="map" data-plane-ui="1" data-keepclear="24" role="button" tabIndex={0} aria-label="open the plan" onClick={v.onPlan} onKeyDown={v.onPlanKey} style={{ position: "absolute", left: "clamp(14px, 2vw, 24px)", bottom: "clamp(14px, 3vh, 28px)", width: "clamp(120px, 14vw, 180px)", aspectRatio: "1 / 1", zIndex: 21, cursor: "pointer", outline: "none" }}>
      <svg viewBox={`0 0 ${MAP_VIEW} ${MAP_VIEW}`} aria-hidden="true" style={{ display: "block", width: "100%", height: "100%", overflow: "hidden" }}>
        <path data-part="ticks" d="" fill="none" stroke={PLAN_INK.unvisited} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.28} />
        <PlanWalkPath part="route" d="" width={1.2} />
        <path data-part="marks" d="" fill={PLAN_INK.visited} stroke="none" opacity={0.85} />
        <g data-part="thumbs" opacity={0.92} />
        <g transform={`translate(${c} ${c})`}>
          <g data-part="cone">
            <path d={MAP_CONE} fill="var(--field-walk)" fillOpacity={0.16} stroke="var(--field-walk)" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.8} />
          </g>
          <circle r={2.6} fill="var(--field-walk)" />
        </g>
      </svg>
    </div>
  );
}
