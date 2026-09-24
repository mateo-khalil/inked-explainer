/**
 * Paper, blueprint and grain textures — `public/tex/*.png`.
 *
 *   node scripts/textures.mjs
 *
 * The film is drawn in code; these are the only bitmaps it uses, and they are
 * generated here from seeded noise so they are regenerable, identical run to
 * run, and need nothing installed. Zero dependencies: value noise, a few
 * hand-drawn fibres, and a twenty-line PNG encoder over `node:zlib`.
 *
 *   paper.png / paper-tall.png   greyscale ~0.78..1.0 — multiplied over every
 *                                paper chapter: cloudy mottling, fibres, specks,
 *                                tooth and a faint edge vignette
 *   night.png / night-tall.png   the blueprint's own mottling + dust motes,
 *                                screened over the navy so it is not a flat fill
 *   grain.png                    a 1024² mid-grey tile, overlaid at low opacity
 *                                and shifted every other frame — film grain
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "tex");
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ png */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** An 8-bit greyscale PNG from 0..1 floats. */
const writeGreyPng = (path, w, h, values) => {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w + 1)] = 0; // filter: none
    for (let x = 0; x < w; x += 1) {
      const v = values[y * w + x];
      raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
};

/* ------------------------------------------------------------------ noise */

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rnd = mulberry32(0x5c47);

const smooth = (t) => t * t * (3 - 2 * t);

/** Smooth value noise with features about `cell` px across, 0..1. */
const valueNoise = (w, h, cell) => {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rnd();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const gy = y / cell;
    const iy = Math.floor(gy);
    const ty = smooth(gy - iy);
    for (let x = 0; x < w; x += 1) {
      const gx = x / cell;
      const ix = Math.floor(gx);
      const tx = smooth(gx - ix);
      const a = grid[iy * gw + ix];
      const b = grid[iy * gw + ix + 1];
      const c = grid[(iy + 1) * gw + ix];
      const d = grid[(iy + 1) * gw + ix + 1];
      out[y * w + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
};

const normalise = (a) => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of a) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const span = Math.max(hi - lo, 1e-6);
  for (let i = 0; i < a.length; i += 1) a[i] = (a[i] - lo) / span;
  return a;
};

const octaves = (w, h, cells, weights) => {
  const acc = new Float32Array(w * h);
  cells.forEach((cell, k) => {
    const n = valueNoise(w, h, cell);
    for (let i = 0; i < acc.length; i += 1) acc[i] += n[i] * weights[k];
  });
  return normalise(acc);
};

/** One pass of a 3×3 [1 2 1] blur. */
const blur3 = (a, w, h) => {
  const out = new Float32Array(a.length);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      let wsum = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const k = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
          acc += a[yy * w + xx] * k;
          wsum += k;
        }
      }
      out[y * w + x] = acc / wsum;
    }
  }
  return out;
};

/* ------------------------------------------------------------------ grounds */

const groundTextures = (W, H, suffix) => {
  // Paper: cloudy mottling …
  const mottle = octaves(W, H, [180, 70, 24, 6], [0.45, 0.3, 0.17, 0.08]);
  const paper = new Float32Array(W * H);
  for (let i = 0; i < paper.length; i += 1) paper[i] = 1 - 0.075 * mottle[i];

  // … short faint fibres in every direction …
  let fib = new Float32Array(W * H);
  for (let n = 0; n < 5200; n += 1) {
    const x0 = rnd() * W;
    const y0 = rnd() * H;
    const ang = rnd() * Math.PI;
    const len = 6 + rnd() * 26;
    const val = (40 + rnd() * 90) / 255;
    for (let s = 0; s <= len; s += 0.5) {
      const x = Math.round(x0 + Math.cos(ang) * s);
      const y = Math.round(y0 + Math.sin(ang) * s);
      if (x >= 0 && x < W && y >= 0 && y < H) fib[y * W + x] = Math.max(fib[y * W + x], val);
    }
  }
  fib = blur3(fib, W, H);
  for (let i = 0; i < paper.length; i += 1) paper[i] -= fib[i] * 0.05;

  // … specks …
  for (let n = 0; n < 900; n += 1) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    const r = rnd() < 0.85 ? 1 : 2;
    const dark = 0.05 + rnd() * 0.08;
    for (let yy = Math.max(0, y - r); yy < Math.min(H, y + r); yy += 1) {
      for (let xx = Math.max(0, x - r); xx < Math.min(W, x + r); xx += 1) paper[yy * W + xx] -= dark;
    }
  }

  // … fine tooth, and a soft edge vignette baked in.
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const vx = (x - W / 2) / (W / 2);
      const vy = (y - H / 2) / (H / 2);
      paper[i] -= (rnd() - 0.5) * 0.035;
      paper[i] -= Math.max(0, vx * vx + vy * vy - 0.35) * 0.06;
      paper[i] = Math.min(1, Math.max(0.78, paper[i]));
    }
  }
  writeGreyPng(join(OUT, `paper${suffix}.png`), W, H, paper);

  // Night: broad mottling, lifted, plus the odd mote of dust.
  const m = octaves(W, H, [220, 90, 30], [0.55, 0.3, 0.15]);
  const night = new Float32Array(W * H);
  for (let i = 0; i < night.length; i += 1) {
    let v = Math.min(1, Math.max(0, (m[i] - 0.35) * 1.4)) * 0.55;
    v += Math.max(0, rnd() - 0.9965) * 180;
    night[i] = Math.min(1, v);
  }
  writeGreyPng(join(OUT, `night${suffix}.png`), W, H, night);
};

/* ------------------------------------------------------------------ grain */

const G = 1024;
let grain = new Float32Array(G * G);
for (let i = 0; i < grain.length; i += 1) {
  // Box–Muller: a normal around mid-grey.
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  grain[i] = Math.min(1, Math.max(0, 0.5 + 0.16 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}
grain = blur3(grain, G, G);
let mean = 0;
for (const v of grain) mean += v;
mean /= grain.length;
for (let i = 0; i < grain.length; i += 1) grain[i] = (grain[i] - mean) * 1.9 + 0.5;
writeGreyPng(join(OUT, "grain.png"), G, G, grain);

// Landscape for 16:9, portrait for 9:16.
groundTextures(1920, 1080, "");
groundTextures(1080, 1920, "-tall");

console.log("textures → public/tex/ (paper, paper-tall, night, night-tall, grain)");
