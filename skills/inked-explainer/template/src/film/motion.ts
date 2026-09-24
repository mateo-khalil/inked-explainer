/**
 * Small, pure timing helpers for drawing by frame. Every function takes the
 * frame explicitly — nothing here reads a clock — so a scene is a function of
 * its own local frame and nothing else.
 */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = lerp;

export const easeInCubic = (t: number) => t * t * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t: number, s = 1.70158) => {
  const c3 = s + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
/** A damped spring's settle, 0→1 with a little wobble past 1. */
export const easeOutSpring = (t: number, bounce = 0.35) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const decay = Math.exp(-6 * t);
  return 1 - decay * Math.cos(t * Math.PI * (2 + bounce * 4)) * (1 - t * 0.2);
};

/** 0→1 progress of `frame` through [start, start+dur], eased and clamped. */
export const prog = (frame: number, start: number, dur: number, ease: (t: number) => number = easeInOutCubic) =>
  ease(clamp((frame - start) / Math.max(dur, 1e-6)));

/** Linear map with clamping and optional easing — `interpolate` for numbers only. */
export const map = (
  frame: number,
  [f0, f1]: [number, number],
  [v0, v1]: [number, number],
  ease: (t: number) => number = (t) => t,
) => lerp(v0, v1, ease(clamp((frame - f0) / Math.max(f1 - f0, 1e-6))));

/** Piecewise keyframes: [[frame, value], ...], eased per segment. */
export const keys = (frame: number, points: Array<[number, number]>, ease: (t: number) => number = easeInOutCubic) => {
  if (frame <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [f1, v1] = points[i];
    const [f0, v0] = points[i - 1];
    if (frame <= f1) return lerp(v0, v1, ease(clamp((frame - f0) / Math.max(f1 - f0, 1e-6))));
  }
  return points[points.length - 1][1];
};

/** A pop-in scale: 0 → overshoot → 1 over `dur` frames starting at `at`. */
export const pop = (frame: number, at: number, dur = 18, overshoot = 2.2) =>
  frame < at ? 0 : easeOutBack(clamp((frame - at) / dur), overshoot);

/** 1 while `at` <= frame < `until`, with a short fade at each end. */
export const visible = (frame: number, at: number, until = Infinity, fade = 8) =>
  clamp((frame - at) / fade) * clamp((until - frame) / fade);

/** The first `n` characters of `text`, typed from `start` at `cps` chars/second (60 fps). */
export const typed = (text: string, frame: number, start: number, cps = 30) => {
  const n = Math.floor(Math.max(0, frame - start) * (cps / 60));
  return text.slice(0, Math.min(text.length, n));
};

/** Seeded PRNG (mulberry32) — deterministic scatter for particles and layouts. */
export const rng = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Smooth 1D value noise in -1..1 — for idle drift, bob and hand-held camera. */
export const noise = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
};

/** Gentle sinusoidal bob, in px. */
export const bob = (frame: number, amp = 6, period = 90, phase = 0) =>
  Math.sin(((frame + phase) / period) * Math.PI * 2) * amp;

/** Point on a quadratic Bézier. */
export const quad = (
  t: number,
  [x0, y0]: [number, number],
  [cx, cy]: [number, number],
  [x1, y1]: [number, number],
): [number, number] => {
  const u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
};

/** Four-point sparkle star path centred on 0,0 with outer radius r. */
export const sparklePath = (r: number, pinch = 0.18) => {
  const k = r * pinch;
  return `M0 ${-r} C ${k} ${-k} ${k} ${-k} ${r} 0 C ${k} ${k} ${k} ${k} 0 ${r} C ${-k} ${k} ${-k} ${k} ${-r} 0 C ${-k} ${-k} ${-k} ${-k} 0 ${-r} Z`;
};

/** Rounded-rect path (for clip paths and outlines that need a `d`). */
export const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x + rr} ${y} H${x + w - rr} A${rr} ${rr} 0 0 1 ${x + w} ${y + rr} V${y + h - rr} A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} H${x + rr} A${rr} ${rr} 0 0 1 ${x} ${y + h - rr} V${y + rr} A${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`;
};

/** Format a number with thin thousands separators, e.g. 12 400. */
export const thousands = (n: number) => Math.round(n).toLocaleString("en-US");
