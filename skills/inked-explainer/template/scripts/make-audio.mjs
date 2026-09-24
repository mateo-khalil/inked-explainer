/**
 * The film's whole soundtrack, synthesised from nothing:
 *
 *   public/music-<cut>.wav   one bed per cut in timeline.ts's CUTS, at its BPM,
 *                            locked to that cut's chapter bars
 *   public/sfx/<name>.wav    every sound in `src/film/sfx.ts`'s vocabulary
 *
 *   node scripts/make-audio.mjs        (or `npm run assets`)
 *
 * No samples, nothing licensed, so it is yours to use anywhere, and it is
 * regenerable rather than a binary somebody has to hunt down. Zero deps.
 *
 * The arrangement reads `src/film/timeline.ts` (ids, grounds and bar counts),
 * so the music always changes where the picture cuts:
 *
 *   paper chapters  marimba arpeggios, shaker, a breeze + birds underneath
 *   night chapters  glassy bells, a warmer pad, a low hum + faint twinkles
 *   every cut       a soft air swell into it and a light cymbal on the downbeat
 *   the last chapter the progression resolves to C, a bell motif, a fade
 *                    (the end card — give it 3 or 4 bars)
 *
 * Retime `timeline.ts` and re-run this; nothing here holds a time of its own.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");
const SR = 48000;

/* ------------------------------------------------------------------ timeline */

const timelineSrc = readFileSync(join(ROOT, "src", "film", "timeline.ts"), "utf8");
const BPM = Number(/export const BPM = (\d+)/.exec(timelineSrc)[1]);
const specsStart = timelineSrc.indexOf("export const CHAPTER_SPECS");
const specsBlock = timelineSrc.slice(specsStart, timelineSrc.indexOf("export type Chapter =", specsStart));
const SPECS = [...specsBlock.matchAll(/\{([^{}]*)\}/g)]
  .map((m) => m[1])
  .filter((b) => /id:\s*"/.test(b))
  .map((b) => ({
    id: /id:\s*"([^"]+)"/.exec(b)[1],
    ground: /ground:\s*"([^"]+)"/.exec(b)[1],
    bars: Number(/bars:\s*(\d+)/.exec(b)[1]),
  }));
if (SPECS.length === 0) throw new Error("could not read CHAPTER_SPECS from timeline.ts");

// The cuts: `CUTS = { full: [...], appstore: [...] }` - one music bed each.
const cutsStart = timelineSrc.indexOf("export const CUTS");
const cutsBlock = timelineSrc.slice(cutsStart, timelineSrc.indexOf("} as const;", cutsStart));
const CUTS = Object.fromEntries(
  [...cutsBlock.matchAll(/(\w+):\s*\[([^\]]*)\]/g)].map((m) => [
    m[1],
    [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
  ]),
);
if (!CUTS.full) throw new Error("could not read CUTS from timeline.ts");

const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// Set per cut by `layCut` before `music()` runs.
let CHAPTERS;
let TOTAL_BARS;
let DURATION;
let N;
const layCut = (ids) => {
  let barCursor = 0;
  CHAPTERS = ids.map((id) => {
    const spec = SPECS.find((c) => c.id === id);
    if (!spec) throw new Error(`cut names unknown chapter ${id}`);
    const c = { ...spec, bar0: barCursor };
    barCursor += spec.bars;
    return c;
  });
  TOTAL_BARS = barCursor;
  DURATION = TOTAL_BARS * BAR;
  N = Math.ceil(DURATION * SR) + SR; // a second of tail, trimmed at the end
};

/* ------------------------------------------------------------------ helpers */

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const TAU = Math.PI * 2;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

class Buf {
  constructor(len) {
    this.L = new Float32Array(len);
    this.R = new Float32Array(len);
  }
  /** Mix a mono signal in at time t (s), with gain and pan (-1..1). */
  add(sig, t, gain = 1, pan = 0) {
    const i0 = Math.round(t * SR);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    for (let i = 0; i < sig.length; i += 1) {
      const j = i0 + i;
      if (j < 0 || j >= this.L.length) continue;
      this.L[j] += sig[i] * gl;
      this.R[j] += sig[i] * gr;
    }
  }
  addStereo(l, r, t, gain = 1) {
    const i0 = Math.round(t * SR);
    for (let i = 0; i < l.length; i += 1) {
      const j = i0 + i;
      if (j < 0 || j >= this.L.length) continue;
      this.L[j] += l[i] * gain;
      this.R[j] += r[i] * gain;
    }
  }
}

/** RBJ biquad, processed in place. */
const biquad = (x, type, f0, q = 0.707) => {
  const w = (TAU * clamp(f0, 10, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (type === "hp") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }
  a0 = 1 + alpha;
  a1 = -2 * cos;
  a2 = 1 - alpha;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
};

/** A band-pass whose centre moves: f(t01) → Hz. Processed in short blocks. */
const sweep = (x, fOf, q = 1.2, type = "bp") => {
  const out = new Float32Array(x.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const w = (TAU * clamp(fOf(i / x.length), 20, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    const a0 = 1 + alpha,
      a1 = -2 * cos,
      a2 = 1 - alpha;
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
};

const noise = (len, seed = 1) => {
  const r = mulberry32(seed);
  const x = new Float32Array(len);
  for (let i = 0; i < len; i += 1) x[i] = r() * 2 - 1;
  return x;
};

/** Freeverb, lightly: 8 combs + 4 allpasses per channel. Returns [L, R] wet. */
const reverb = (L, R, { room = 0.82, damp = 0.35, wet = 0.25, tail = 2.5 } = {}) => {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => Math.round(n * scale));
  const alls = [556, 441, 341, 225].map((n) => Math.round(n * scale));
  const len = L.length + Math.round(tail * SR);
  const run = (input, spread) => {
    const out = new Float32Array(len);
    const cBufs = combs.map((n) => ({ buf: new Float32Array(n + spread), i: 0, store: 0 }));
    const aBufs = alls.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    for (let s = 0; s < len; s += 1) {
      const x = (s < input.length ? input[s] : 0) * 0.015;
      let acc = 0;
      for (const c of cBufs) {
        const y = c.buf[c.i];
        c.store = y * (1 - damp) + c.store * damp;
        c.buf[c.i] = x + c.store * room;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of aBufs) {
        const b = a.buf[a.i];
        const y = -acc + b;
        a.buf[a.i] = acc + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = y;
      }
      out[s] = acc * wet;
    }
    return out;
  };
  return [run(L, 0), run(R, 23)];
};

const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

/* ------------------------------------------------------------------ instruments */

/** Marimba: a fundamental, the bar's 4th partial, and a mallet tick. */
const marimba = (f, dur = 0.9, bright = 1) => {
  const n = Math.round(dur * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    x[i] =
      Math.sin(TAU * f * t) * env(t, 0.002, 0.32) +
      0.32 * bright * Math.sin(TAU * f * 3.93 * t) * env(t, 0.001, 0.05) +
      0.12 * Math.sin(TAU * f * 9.2 * t) * env(t, 0.0005, 0.012);
  }
  return x;
};

/** Glassy bell / glockenspiel. */
const bell = (f, dur = 1.8) => {
  const n = Math.round(dur * SR);
  const x = new Float32Array(n);
  const parts = [
    [1, 1, 0.9],
    [2.76, 0.42, 0.35],
    [5.4, 0.2, 0.16],
    [8.93, 0.1, 0.08],
  ];
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    let v = 0;
    for (const [r, g, d] of parts) v += g * Math.sin(TAU * f * r * t) * env(t, 0.001, d);
    x[i] = v;
  }
  return x;
};

/** Soft pad: detuned triangle-ish partials with a slow swell. */
const pad = (freqs, dur, attack = 0.35, release = 0.6) => {
  const n = Math.round((dur + release) * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const a = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
    let v = 0;
    for (const f of freqs) {
      for (const det of [-0.12, 0.12]) {
        const ff = f * Math.pow(2, det / 12);
        v += Math.sin(TAU * ff * t) * 0.6 + Math.sin(TAU * ff * 2 * t) * 0.12 + Math.sin(TAU * ff * 3 * t) * 0.05;
      }
    }
    x[i] = (v / (freqs.length * 2)) * a * (1 + 0.04 * Math.sin(TAU * 4.2 * t));
  }
  return biquad(x, "lp", 2400);
};

/** Round bass: sine + a touch of 2nd, short. */
const bass = (f, dur = 0.34) => {
  const n = Math.round((dur + 0.08) * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const a =
      (t < 0.004 ? t / 0.004 : 1) *
      (t < dur ? Math.exp(-t / (dur * 1.4)) : Math.exp(-dur / (dur * 1.4)) * Math.max(0, 1 - (t - dur) / 0.08));
    x[i] = Math.tanh((Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t)) * 1.4) * a;
  }
  return x;
};

const kick = (gain = 1) => {
  const n = Math.round(0.32 * SR);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const f = 44 + 90 * Math.exp(-t / 0.035);
    ph += (TAU * f) / SR;
    x[i] = Math.sin(ph) * env(t, 0.002, 0.13) * gain;
  }
  return x;
};

const snap = () => {
  const n = Math.round(0.14 * SR);
  const x = biquad(noise(n, 77), "bp", 1900, 1.4);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    x[i] = x[i] * env(t, 0.001, 0.035) * 2.2 + Math.sin(TAU * 1250 * t) * env(t, 0.0005, 0.012) * 0.3;
  }
  return x;
};

const shaker = (seed, accent = 1) => {
  const n = Math.round(0.07 * SR);
  const x = biquad(biquad(noise(n, seed), "hp", 6500), "lp", 13000);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    x[i] *= (t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) / 0.018)) * accent;
  }
  return x;
};

const cymbal = (dur = 1.6) => {
  const n = Math.round(dur * SR);
  const x = biquad(noise(n, 991), "hp", 5200);
  for (let i = 0; i < n; i += 1) x[i] *= env(i / SR, 0.004, 0.45);
  return biquad(x, "lp", 11000);
};

const airSwell = (dur = 0.45) => {
  const n = Math.round(dur * SR);
  const x = sweep(noise(n, 314), (u) => 600 + 5200 * u * u, 0.9);
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    x[i] *= Math.pow(u, 2.2) * (1 - Math.pow(u, 12));
  }
  return x;
};

/* ------------------------------------------------------------------ the music */

// C major, I – V/7 – vi – IV. Voicings in MIDI.
const CHORDS = {
  C: { root: 36, tones: [60, 64, 67, 71], arp: [60, 67, 72, 76, 79, 76, 72, 67] },
  G: { root: 43, tones: [59, 62, 67, 69], arp: [55, 62, 67, 71, 74, 71, 67, 62] },
  Am: { root: 45, tones: [57, 60, 64, 67], arp: [57, 64, 69, 72, 76, 72, 69, 64] },
  F: { root: 41, tones: [57, 60, 64, 65], arp: [53, 60, 65, 69, 72, 69, 65, 60] },
};
const LOOP = ["C", "G", "Am", "F"];

const music = () => {
  const dry = new Buf(N);
  const send = new Buf(N); // to reverb
  const r = mulberry32(0x1a2b);
  const end = CHAPTERS[CHAPTERS.length - 1];

  for (let bar = 0; bar < TOTAL_BARS; bar += 1) {
    const t0 = bar * BAR;
    const chapter = CHAPTERS.find((c) => bar >= c.bar0 && bar < c.bar0 + c.bars);
    const night = chapter.ground === "night";
    const isEnd = chapter === end;
    const endBar = bar - end.bar0;
    // The end card resolves, counted from its last bar: …C, G, F, C.
    const fromEnd = end.bars - 1 - endBar;
    const lastBar = isEnd && fromEnd === 0;
    const chordName = isEnd ? (["C", "F", "G", "C"][fromEnd] ?? "C") : LOOP[bar % 4];
    const chord = CHORDS[chordName];
    const intro = bar === 0;

    // pad — warmer and louder at night
    const padSig = pad(chord.tones.map(midi), BAR * 0.98, night ? 0.25 : 0.4, 0.5);
    const padGain = (night ? 0.2 : 0.11) * (isEnd ? 1.3 : 1);
    dry.add(padSig, t0, padGain * 0.6, -0.15);
    send.add(padSig, t0, padGain, 0.15);

    // bass: 1, the "and" of 2, 3, and a pickup on the "and" of 4
    if (!intro && !lastBar) {
      const f = midi(chord.root);
      const hits = [
        [0, 0.34],
        [1.5, 0.18],
        [2, 0.3],
        [3.5, 0.16],
      ];
      for (const [b, d] of hits) {
        const pf = b === 3.5 ? midi(chord.root + 7) : f;
        dry.add(bass(pf, d), t0 + b * BEAT, night ? 0.26 : 0.3);
      }
    } else if (lastBar) {
      dry.add(bass(midi(36), 1.2), t0, 0.32);
    }

    // arpeggio: marimba on paper, bells at night; 8ths
    for (let k = 0; k < 8; k += 1) {
      if (isEnd && fromEnd <= 1 && k > 0) break;
      const m = chord.arp[k];
      const t = t0 + k * (BEAT / 2);
      const human = (r() - 0.5) * 0.006;
      const vel = (k % 2 === 0 ? 1 : 0.72) * (0.9 + r() * 0.2);
      if (night) {
        if (k % 2 === 1 && r() < 0.5) continue; // sparser
        const s = bell(midi(m + 12), 1.4);
        dry.add(s, t + human, 0.075 * vel, k % 2 ? 0.35 : -0.35);
        send.add(s, t + human, 0.12 * vel, 0);
      } else {
        const s = marimba(midi(m), 0.8);
        dry.add(s, t + human, 0.13 * vel, k % 2 ? 0.3 : -0.3);
        send.add(s, t + human, 0.05 * vel, 0);
      }
    }

    // drums
    if (!lastBar) {
      for (let s = 0; s < 16; s += 1) {
        const t = t0 + s * (BEAT / 4) + (s % 2 === 1 ? BEAT * 0.04 : 0); // a little swing
        const accent = s % 4 === 2 ? 1 : s % 2 === 0 ? 0.6 : 0.35;
        dry.add(shaker(bar * 16 + s, accent), t, night ? 0.1 : 0.14, 0.25);
      }
      if (!intro) {
        dry.add(kick(), t0, 0.5);
        dry.add(kick(0.8), t0 + 2 * BEAT, 0.45);
        if (!night) dry.add(kick(0.5), t0 + 2.5 * BEAT, 0.3);
        const sn = snap();
        dry.add(sn, t0 + BEAT, 0.16, -0.1);
        dry.add(sn, t0 + 3 * BEAT, 0.16, 0.1);
        send.add(sn, t0 + 3 * BEAT, 0.12);
      } else {
        dry.add(kick(0.6), t0 + 3 * BEAT, 0.25);
        dry.add(kick(0.6), t0 + 3.5 * BEAT, 0.3);
      }
    }
  }

  // Every cut: an air swell into it and a soft cymbal on the downbeat.
  for (const c of CHAPTERS) {
    if (c.bar0 === 0) continue;
    const t = c.bar0 * BAR;
    const sw = airSwell(0.42);
    dry.add(sw, t - 0.42, 0.1, -0.4);
    dry.add(sw, t - 0.42, 0.1, 0.4);
    const cy = cymbal(c === end ? 3.2 : 1.4);
    dry.add(cy, t, c === end ? 0.12 : 0.06, 0.2);
    send.add(cy, t, 0.08);
  }

  // The end card: a bell motif over the resolution.
  const motif = [
    [0, 79],
    [0.5, 76],
    [1, 72],
    [2, 74],
    [2.5, 76],
    [3, 79],
    [4, 84],
  ];
  for (const [b, m] of motif) {
    const s = bell(midi(m), 2.4);
    dry.add(s, end.bar0 * BAR + b * BEAT, 0.13, 0);
    send.add(s, end.bar0 * BAR + b * BEAT, 0.2, 0);
  }
  const finale = pad([48, 55, 60, 64, 67].map(midi), BAR * 1.6, 0.05, 1.2);
  dry.add(finale, (end.bar0 + end.bars - 2) * BAR, 0.16);
  send.add(finale, (end.bar0 + end.bars - 2) * BAR, 0.2);

  // Ambience under each chapter.
  for (const c of CHAPTERS) {
    const t0 = c.bar0 * BAR;
    const dur = c.bars * BAR;
    const n = Math.round(dur * SR);
    if (c.ground === "paper") {
      const breeze = biquad(biquad(noise(n, 5 + c.bar0), "lp", 700), "hp", 120);
      for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        breeze[i] *= (0.6 + 0.4 * Math.sin(TAU * 0.35 * t + c.bar0)) * Math.min(1, t / 0.05, (dur - t) / 0.05);
      }
      dry.add(breeze, t0, 0.06, -0.2);
      // A few birds under the first paper chapter.
      if (c === CHAPTERS.find((x) => x.ground === "paper")) {
        const rb = mulberry32(c.bar0 + 9);
        for (let k = 0; k < 5; k += 1) {
          const bt = t0 + 0.3 + rb() * (dur - 0.8);
          const chirp = new Float32Array(Math.round(0.12 * SR));
          const f0 = 2600 + rb() * 1400;
          let ph = 0;
          for (let i = 0; i < chirp.length; i += 1) {
            const u = i / chirp.length;
            ph += (TAU * (f0 + 900 * Math.sin(u * Math.PI) + 300 * Math.sin(u * 40))) / SR;
            chirp[i] = Math.sin(ph) * Math.sin(u * Math.PI) ** 2;
          }
          dry.add(chirp, bt, 0.035, rb() * 1.6 - 0.8);
          dry.add(chirp, bt + 0.14, 0.025, rb() * 1.6 - 0.8);
        }
      }
    } else {
      const hum = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const t = i / SR;
        hum[i] =
          (Math.sin(TAU * 55 * t) * 0.6 + Math.sin(TAU * 110.3 * t) * 0.3 + Math.sin(TAU * 164.9 * t) * 0.12) *
          (0.8 + 0.2 * Math.sin(TAU * 0.25 * t)) *
          Math.min(1, t / 0.05, (dur - t) / 0.05);
      }
      dry.add(hum, t0, 0.05);
      const rt = mulberry32(c.bar0 + 31);
      for (let k = 0; k < 7; k += 1) {
        const s = bell(midi(96 + [0, 2, 4, 7, 9][Math.floor(rt() * 5)]), 0.9);
        send.add(s, t0 + rt() * dur, 0.03, rt() * 2 - 1);
      }
    }
  }

  const [wl, wr] = reverb(send.L, send.R, { room: 0.84, damp: 0.3, wet: 1, tail: 3 });
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    L[i] = dry.L[i] + (wl[i] ?? 0) * 0.55;
    R[i] = dry.R[i] + (wr[i] ?? 0) * 0.55;
  }
  // Fade the last half-bar, trim to the film.
  const len = Math.round(DURATION * SR);
  const fade = Math.round(BAR * 0.6 * SR);
  for (let i = len - fade; i < len; i += 1) {
    const g = Math.pow((len - i) / fade, 1.5);
    L[i] *= g;
    R[i] *= g;
  }
  return [L.subarray(0, len), R.subarray(0, len)];
};

/* ------------------------------------------------------------------ sfx */

const ms = (s) => Math.round(s * SR);

const blip = (f0, f1, dur, decay, shape = "sine") => {
  const n = ms(dur);
  const x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const u = t / dur;
    const f = f0 * Math.pow(f1 / f0, Math.min(1, u * 3));
    ph += (TAU * f) / SR;
    const s = shape === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sin(ph);
    x[i] = s * env(t, 0.002, decay);
  }
  return x;
};

const mixMono = (len, parts) => {
  const x = new Float32Array(ms(len));
  for (const [sig, at, g = 1] of parts) {
    const i0 = ms(at);
    for (let i = 0; i < sig.length && i0 + i < x.length; i += 1) x[i0 + i] += sig[i] * g;
  }
  return x;
};

const tickSig = (seed = 3, f = 3200) => {
  const n = ms(0.03);
  const x = biquad(noise(n, seed), "bp", f, 2.2);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    x[i] = x[i] * env(t, 0.0003, 0.006) * 3 + Math.sin(TAU * 190 * t) * env(t, 0.001, 0.012) * 0.25;
  }
  return x;
};

const SFX = {
  tick: () => tickSig(3, 3400),
  type: () => {
    const r = mulberry32(42);
    const parts = [];
    for (let k = 0; k < 48; k += 1) {
      parts.push([tickSig(100 + k, 2400 + r() * 2200), k / 34 + (r() - 0.5) * 0.006, 0.5 + r() * 0.5]);
    }
    return mixMono(1.6, parts);
  },
  pop: () =>
    mixMono(0.2, [
      [blip(380, 980, 0.12, 0.045), 0],
      [tickSig(9, 2000), 0, 0.25],
    ]),
  "pop-hi": () =>
    mixMono(0.16, [
      [blip(820, 1900, 0.09, 0.03), 0],
      [tickSig(11, 4200), 0, 0.2],
    ]),
  boop: () => blip(700, 620, 0.25, 0.08, "tri"),
  chime: () =>
    mixMono(2.2, [
      [bell(midi(84)), 0, 0.5],
      [bell(midi(88)), 0.05, 0.42],
      [bell(midi(91)), 0.1, 0.38],
      [bell(midi(96)), 0.16, 0.22],
    ]),
  sparkle: () => {
    const r = mulberry32(7);
    const parts = [];
    const scale = [84, 86, 88, 91, 93, 96, 98, 100, 103];
    for (let k = 0; k < 14; k += 1) {
      parts.push([bell(midi(scale[Math.floor(r() * scale.length)]), 0.5), r() * 0.55, 0.12 + r() * 0.14]);
    }
    const shimmer = biquad(noise(ms(0.8), 5), "hp", 7000);
    for (let i = 0; i < shimmer.length; i += 1) shimmer[i] *= env(i / SR, 0.05, 0.22) * 0.12;
    parts.push([shimmer, 0]);
    return mixMono(1.2, parts);
  },
  whoosh: () => {
    const n = ms(0.62);
    const x = sweep(noise(n, 21), (u) => 380 + 2600 * Math.sin(Math.PI * Math.min(1, u * 1.1)) ** 2, 0.8);
    for (let i = 0; i < n; i += 1) {
      const u = i / n;
      x[i] *= Math.sin(Math.PI * Math.pow(u, 0.7)) ** 2 * 1.8;
    }
    return x;
  },
  swish: () => {
    const n = ms(0.26);
    const x = sweep(noise(n, 23), (u) => 900 + 4200 * u, 1.1);
    for (let i = 0; i < n; i += 1) {
      const u = i / n;
      x[i] *= Math.sin(Math.PI * Math.pow(u, 0.5)) ** 2 * 1.6;
    }
    return x;
  },
  paper: () => {
    const n = ms(0.4);
    const r = mulberry32(55);
    const x = biquad(biquad(noise(n, 57), "bp", 2600, 0.7), "hp", 900);
    let g = 0;
    for (let i = 0; i < n; i += 1) {
      if (i % 90 === 0) g = 0.3 + r() * 0.9;
      const u = i / n;
      x[i] *= g * Math.sin(Math.PI * u) * 1.4;
    }
    return x;
  },
  thud: () => {
    const n = ms(0.35);
    const x = new Float32Array(n);
    let ph = 0;
    const nz = biquad(noise(n, 61), "lp", 400);
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      ph += (TAU * (48 + 70 * Math.exp(-t / 0.04))) / SR;
      x[i] = Math.sin(ph) * env(t, 0.002, 0.09) + nz[i] * env(t, 0.001, 0.03) * 0.8;
    }
    return x;
  },
  stamp: () => {
    const clack = biquad(noise(ms(0.08), 63), "bp", 1500, 1.5);
    for (let i = 0; i < clack.length; i += 1) clack[i] *= env(i / SR, 0.0005, 0.018) * 3;
    return mixMono(0.6, [
      [SFX.thud(), 0, 1],
      [clack, 0, 0.8],
      [SFX.paper(), 0.05, 0.35],
    ]);
  },
  click: () =>
    mixMono(0.1, [
      [tickSig(71, 1800), 0, 1],
      [tickSig(72, 2600), 0.035, 0.8],
    ]),
  buzz: () => {
    const n = ms(0.07);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = i / SR;
      x[i] = (Math.sin(TAU * 160 * t) + 0.4 * Math.sin(TAU * 320 * t)) * env(t, 0.002, 0.022);
    }
    return x;
  },
  riser: () => {
    const n = ms(1.6);
    const nz = sweep(noise(n, 81), (u) => 300 + 6000 * u * u, 1.4);
    const x = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i += 1) {
      const u = i / n;
      ph += (TAU * (220 + 660 * u * u)) / SR;
      x[i] = (nz[i] * 0.9 + Math.sin(ph) * 0.25) * Math.pow(u, 2);
    }
    return x;
  },
  notif: () =>
    mixMono(1.4, [
      [bell(midi(88), 1.2), 0, 0.6],
      [bell(midi(95), 1.2), 0.11, 0.55],
    ]),
  coin: () => {
    const r = mulberry32(91);
    const parts = [];
    for (let k = 0; k < 26; k += 1) {
      parts.push([bell(midi(90 + Math.floor(r() * 16)), 0.3), (k / 26) * 0.8 + r() * 0.03, 0.08 + r() * 0.1]);
    }
    const hiss = biquad(noise(ms(0.9), 93), "hp", 5000);
    for (let i = 0; i < hiss.length; i += 1) hiss[i] *= Math.sin((Math.PI * i) / hiss.length) * 0.1;
    parts.push([hiss, 0]);
    return mixMono(1.2, parts);
  },
  heart: () =>
    mixMono(0.25, [
      [blip(600, 1400, 0.1, 0.035), 0],
      [blip(900, 2000, 0.08, 0.025), 0.07, 0.6],
    ]),
};
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];
PENTA.forEach((m, i) => {
  SFX[`note-${i}`] = () => marimba(midi(m), 1.1, 1.1);
});

/* ------------------------------------------------------------------ io */

const normalise = (chs, peakDb) => {
  let peak = 0;
  for (const c of chs) for (const v of c) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? Math.pow(10, peakDb / 20) / peak : 1;
  for (const c of chs) for (let i = 0; i < c.length; i += 1) c[i] *= g;
};

const writeWav = (path, L, R) => {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    buf.writeInt16LE(Math.round(clamp(Math.tanh(L[i] * 1.05), -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(Math.tanh(R[i] * 1.05), -1, 1) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
};

mkdirSync(join(OUT, "sfx"), { recursive: true });

for (const [cut, ids] of Object.entries(CUTS)) {
  layCut(ids);
  const [mL, mR] = music();
  normalise([mL, mR], -3);
  writeWav(join(OUT, `music-${cut}.wav`), mL, mR);
  console.log(
    `music-${cut}.wav  ${DURATION.toFixed(2)}s  ${TOTAL_BARS} bars @ ${BPM} BPM  (${CHAPTERS.map((c) => c.id).join(" · ")})`,
  );
}

for (const [name, make] of Object.entries(SFX)) {
  const dry = make();
  // A little of the same room on every effect, so they sit with the music.
  const [wl, wr] = reverb(dry, dry, { room: 0.7, damp: 0.4, wet: 1, tail: 0.8 });
  const L = new Float32Array(wl.length);
  const R = new Float32Array(wr.length);
  for (let i = 0; i < L.length; i += 1) {
    const d = i < dry.length ? dry[i] : 0;
    L[i] = d + wl[i] * 0.18;
    R[i] = d + wr[i] * 0.18;
  }
  // trim trailing silence
  let end = L.length;
  while (end > dry.length && Math.abs(L[end - 1]) < 1e-4 && Math.abs(R[end - 1]) < 1e-4) end -= 1;
  const l = L.subarray(0, end);
  const r = R.subarray(0, end);
  normalise([l, r], name === "type" || name === "tick" ? -8 : name.startsWith("note") ? -4 : -3);
  writeWav(join(OUT, "sfx", `${name}.wav`), l, r);
}
console.log(`sfx: ${Object.keys(SFX).length} sounds`);
