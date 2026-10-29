// Web Audio graph for proximity sound: per-entity source -> gain -> stereo pan -> master.
// Every method is a no-op until a user gesture has produced a running AudioContext.

type Entry = { gain: GainNode; pan: StereoPannerNode; teardown: () => void };

const entries = new Map<string, Entry>();
// createMediaElementSource throws on a second call per element, so the node outlives detach().
let sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let masterLevel = 1;

// 1 - exp(-t / TC) reaches 95% after ~0.25 s.
const TC = 0.08;
const TONE_LEVEL = 0.1;
const BEHIND_MARGIN = 150;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function spatialFrom(
  lx: number,
  lz: number,
  opts: { near?: number; far?: number } = {},
): { gain: number; pan: number } {
  const near = opts.near ?? 200;
  const far = opts.far ?? 2200;
  const t = clamp((far - Math.hypot(lx, lz)) / (far - near), 0, 1);
  // Behind the lens a source fades out over BEHIND_MARGIN, then is silent.
  const front = lz >= 0 ? 1 : clamp(1 + lz / BEHIND_MARGIN, 0, 1);
  return { gain: t * t * (3 - 2 * t) * front, pan: clamp(lx / (Math.abs(lz) + 400), -1, 1) };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function running(): AudioContext | null {
  return ctx && ctx.state === "running" && master ? ctx : null;
}

export function unlock() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = masterLevel;
      master.connect(ctx.destination);
    }
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  } catch {
    ctx = null;
    master = null;
  }
}

function bus(c: AudioContext): Pick<Entry, "gain" | "pan"> {
  const gain = c.createGain();
  gain.gain.value = 0;
  const pan = c.createStereoPanner();
  gain.connect(pan);
  pan.connect(master!);
  return { gain, pan };
}

// el.volume must stay at 1 once attached: gain owns loudness, and the element's own volume would multiply with it.
export function attachMedia(id: string, el: HTMLMediaElement) {
  const c = running();
  if (!c || entries.has(id)) return;
  try {
    let src = sources.get(el);
    if (!src) { src = c.createMediaElementSource(el); sources.set(el, src); }
    const { gain, pan } = bus(c);
    src.disconnect();
    src.connect(gain);
    // A source left unconnected silences the element for good, so detach hands it straight to the output.
    const teardown = () => { gain.disconnect(); pan.disconnect(); src.disconnect(); src.connect(c.destination); };
    entries.set(id, { gain, pan, teardown });
  } catch { /* element already owned by another context or graph */ }
}

export function attachTone(id: string, seed: string) {
  const c = running();
  if (!c || entries.has(id)) return;
  try {
    const rnd = prng(hash(seed));
    const { gain, pan } = bus(c);
    const mix = c.createGain();
    mix.gain.value = TONE_LEVEL;
    mix.connect(gain);
    const stops: (() => void)[] = [];

    // Root, fifth and octave around 45-80 Hz, detuned a few cents apart so they beat slowly.
    const root = 45 + rnd() * 35;
    ([[1, 0.5, "sine"], [1.5, 0.28, "sine"], [2, 0.22, "triangle"]] as const).forEach(([ratio, level, type]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = root * ratio;
      o.detune.value = (rnd() - 0.5) * 16;
      g.gain.value = level;
      o.connect(g);
      g.connect(mix);
      o.start();
      stops.push(() => o.stop());
    });

    // Brownian noise keeps the low-passed bed soft, with no hiss above the cutoff.
    const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 280 + rnd() * 220;
    lp.Q.value = 0.7;
    const ng = c.createGain();
    ng.gain.value = 0.35;
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 0.03 + rnd() * 0.05;
    depth.gain.value = 120;
    lfo.connect(depth);
    depth.connect(lp.frequency);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(mix);
    noise.start();
    lfo.start();
    stops.push(() => noise.stop(), () => lfo.stop());

    entries.set(id, { gain, pan, teardown: () => { stops.forEach(s => s()); gain.disconnect(); pan.disconnect(); mix.disconnect(); } });
  } catch { /* graph build failed; the entity stays silent */ }
}

// Gain is squared so a far source stays faintly audible before it drops to silence.
export function update(id: string, s: { gain: number; pan: number }) {
  const e = entries.get(id);
  if (!e || !ctx) return;
  const now = ctx.currentTime;
  const g = clamp(s.gain, 0, 1);
  e.gain.gain.setTargetAtTime(g * g, now, TC);
  e.pan.pan.setTargetAtTime(clamp(s.pan, -1, 1), now, TC);
}

export function setMaster(v: number) {
  masterLevel = clamp(v, 0, 1);
  if (master && ctx) master.gain.setTargetAtTime(masterLevel, ctx.currentTime, TC);
}

export function detach(id: string) {
  const e = entries.get(id);
  if (!e) return;
  entries.delete(id);
  try { e.teardown(); } catch { /* node already gone */ }
}

export function dispose() {
  [...entries.keys()].forEach(detach);
  const c = ctx;
  ctx = null;
  master = null;
  sources = new WeakMap();
  c?.close().catch(() => {});
}

export const spatial = { unlock, attachMedia, attachTone, update, setMaster, detach, dispose, spatialFrom };
