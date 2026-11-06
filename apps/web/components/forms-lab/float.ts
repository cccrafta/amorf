// Cluster float in TSL: the bob, sway and hover that move a form's centre, shared by the forms (form.ts) and the board cards
// that leave from a moving satellite (board-mesh.ts), so a card starts exactly where its satellite floats.
import type * as ThreeNS from "three/webgpu";
import type { Tsl } from "./scene";
import type { FormUniforms } from "./form";

type F = ThreeNS.Node<"float">;

// seed: the centre's float seed (a satellite takes its form's, so the cluster floats as one body), before spread; gain and
// hoverGain: 0 to 1, how much of the bob and sway, and of the hover (the lift above the ground, on whatever the phase), is on.
export function makeFloat(TSL: Tsl, m: FormUniforms["m"], drift: FormUniforms["drift"]) {
  const { sin, cos, vec2 } = TSL;
  // FormUniforms types the uniforms by their value only; they are uniform nodes (form.ts).
  const n = (x: { value: number }) => x as unknown as F;
  const A = m.amp, T = m.t, on = n(drift);
  return (seed: F, gain: F, hoverGain: F) => {
    const s = seed.mul(n(m.spread));
    const g = gain.mul(on);
    const bob = sin(n(T.bob).mul(0.7).add(s.mul(1.9))).mul(n(A.bob)).mul(g);
    const sway = vec2(sin(n(T.sway).mul(0.29).add(s.mul(2.7))), cos(n(T.sway).mul(0.33).add(s.mul(1.1)))).mul(n(A.sway).mul(g));
    const hover = n(A.hover).mul(on).mul(hoverGain);
    return { bob, sway, hover };
  };
}
