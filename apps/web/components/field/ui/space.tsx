// Space control: the way back to the field while standing in a walkable curation.
import type { V } from "../types";

export function renderSpaceBar(v: V) {
  return (
    <div style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", zIndex: 20, animation: "am-in 400ms ease both" }}>
      <div role="button" tabIndex={0} onClick={v.onLeaveSpace} onKeyDown={v.onLeaveSpaceKey} className="field-label field-hover-accent" style={{ cursor: "pointer", outline: "none", fontSize: 9.5, color: "rgba(var(--field-mute-rgb), 0.8)", transition: "color 400ms ease" }}>back to field · esc</div>
    </div>
  );
}
