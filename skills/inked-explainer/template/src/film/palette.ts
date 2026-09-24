import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadKalam } from "@remotion/google-fonts/Kalam";

/**
 * Colours and type.
 *
 * Two grounds: warm printed paper with pastel diagonal stripes and a
 * near-black ink, and a navy blueprint with thin pale lines and glowing
 * nodes. Your brand's colours belong on the accents (stickers, chips, the
 * props that carry the story) — the grounds stay these, because the contrast
 * between them *is* the style.
 */

const inter = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const kalam = loadKalam("normal", { weights: ["400", "700"], subsets: ["latin"] });

/** Titles, labels. */
export const SANS = inter.fontFamily;
/** Chips, numbers, anything that is data. */
export const MONO = mono.fontFamily;
/** Pencil notes on the paper — used sparingly. */
export const HAND = kalam.fontFamily;

export const PAPER = {
  cream: "#f4ead3",
  creamDeep: "#ebdfc3",
  kraft: "#e8d3a6",
  ink: "#2b2430",
  inkSoft: "rgba(43,36,48,0.55)",
  pencil: "rgba(43,36,48,0.16)",
  shadow: "rgba(60,40,30,0.18)",
  white: "#fffaf0",
  red: "#e8604c",
  redDark: "#b8412f",
  orange: "#f0a14a",
  yellow: "#f4cf5a",
  green: "#7fbf7a",
  greenDark: "#4f8f55",
  blue: "#6aa6d8",
  teal: "#5fb8b0",
  pink: "#ef8fb0",
  wood: "#c9884a",
  woodDark: "#9a5f2c",
  grey: "#a9a6a0",
} as const;

/** The paper chapters' stripe colours — one per chapter, pastel. */
export const STRIPES = {
  blue: "#c9dadd",
  mint: "#d5e5cf",
  butter: "#f0dea8",
  peach: "#f1d3c4",
  lilac: "#dcd4ea",
} as const;

export const NIGHT = {
  deep: "#0a0d27",
  mid: "#141a45",
  lift: "#1d2560",
  grid: "rgba(150,170,255,0.055)",
  gridMajor: "rgba(150,170,255,0.10)",
  line: "#b8c5ff",
  lineDim: "rgba(184,197,255,0.35)",
  lineFaint: "rgba(184,197,255,0.14)",
  text: "#eef1ff",
  textDim: "rgba(220,226,255,0.62)",
  chip: "#1a2150",
  glow: "#ffffff",
  pink: "#ff5d8f",
  coral: "#ff8a7a",
  cyan: "#7fe6ec",
  violet: "#a98bff",
  gold: "#f6c75a",
  green: "#79e0a0",
} as const;
