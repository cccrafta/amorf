"use client";
// Motion matrix panel for the forms lab: one row per motion channel with amplitude and speed, then the global rows.
// Copy writes the current numbers as JSON, ready to paste into DEFAULT_MOTION in form.ts.
import { CHANNELS, type Channel, type Motion } from "./form";
import { DEFAULT_MOTION } from "./config";

// max is the slider's top end; unit is shown beside the amplitude. Hover has no clock, so no speed.
const ROWS: Record<Channel, { label: string; unit: string; max: number; speed: boolean }> = {
  pitch: { label: "pitch (tip fwd/back)", unit: "rad", max: 1.6, speed: true },
  roll: { label: "roll (tip sideways)", unit: "rad", max: 1.6, speed: true },
  yaw: { label: "yaw wobble", unit: "rad", max: 1.6, speed: true },
  bob: { label: "bob (up/down)", unit: "u", max: 1, speed: true },
  sway: { label: "sway (drift x/z)", unit: "u", max: 1, speed: true },
  hover: { label: "hover (above ground)", unit: "u", max: 1.5, speed: false },
};
const GLOBALS: { key: "spread" | "nearCalm" | "turnSpeed" | "hold"; label: string; max: number }[] = [
  { key: "spread", label: "spread between forms", max: 2 },
  { key: "nearCalm", label: "calm near camera", max: 1 },
  { key: "turnSpeed", label: "turn speed", max: 3 },
  { key: "hold", label: "hold per quarter turn", max: 0.95 },
];

function Slider({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <span className="flex items-center gap-1">
      <input type="range" min={0} max={max} step={0.01} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: 90 }} />
      <span style={{ width: 34, textAlign: "right" }}>{value.toFixed(2)}</span>
    </span>
  );
}

export default function MotionMatrix({ motion, onChange }: { motion: Motion; onChange: (m: Motion) => void }) {
  const setChannel = (c: Channel, k: "amp" | "speed", v: number) =>
    onChange({ ...motion, channels: { ...motion.channels, [c]: { ...motion.channels[c], [k]: v } } });
  return (
    <div className="field-label absolute right-4 top-4 flex flex-col gap-2 overflow-y-auto text-xs" style={{ maxHeight: "calc(100% - 2rem)" }}>
      <div>motion matrix</div>
      <div className="grid items-center gap-x-3 gap-y-1" style={{ gridTemplateColumns: "auto auto auto" }}>
        <span />
        <span>amplitude</span>
        <span>speed</span>
        {CHANNELS.map(c => (
          <div key={c} className="contents">
            <span>{ROWS[c].label} <span style={{ opacity: 0.6 }}>{ROWS[c].unit}</span></span>
            <Slider value={motion.channels[c].amp} max={ROWS[c].max} onChange={v => setChannel(c, "amp", v)} />
            {ROWS[c].speed
              ? <Slider value={motion.channels[c].speed} max={4} onChange={v => setChannel(c, "speed", v)} />
              : <span />}
          </div>
        ))}
        {GLOBALS.map(g => (
          <div key={g.key} className="contents">
            <span>{g.label}</span>
            <Slider value={motion[g.key]} max={g.max} onChange={v => onChange({ ...motion, [g.key]: v })} />
            <span />
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <button type="button" className="underline" onClick={() => onChange(structuredClone(DEFAULT_MOTION))}>reset</button>
        <button type="button" className="underline" onClick={() => navigator.clipboard?.writeText(JSON.stringify(motion, null, 2))}>
          copy as JSON
        </button>
      </div>
    </div>
  );
}
