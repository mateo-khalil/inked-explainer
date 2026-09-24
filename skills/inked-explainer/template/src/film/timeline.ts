/**
 * The film's clock. Everything that has a time lives here.
 *
 * 60 fps on a 150 BPM grid: a beat is 24 frames, a bar is 96 frames (1.6s),
 * and every chapter is a whole number of bars — so every cut lands on a bar
 * line of the music `scripts/make-audio.mjs` writes from this same file.
 * Retime a chapter here and re-run `npm run assets`; nothing else holds a time.
 *
 * `make-audio.mjs` reads CHAPTER_SPECS and CUTS with regular expressions:
 * keep each chapter an object literal with `id`, `ground` and `bars` fields,
 * and each cut a plain array of quoted ids.
 */

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BPM = 150;
/** Frames per beat. */
export const BEAT = (FPS * 60) / BPM; // 24
/** Frames per bar (4/4). */
export const BAR = BEAT * 4; // 96

export type Ground = "paper" | "night";

export type ChapterSpec = {
  id: string;
  /** Typed top-left, lowercase — the style's voice. */
  title: string;
  /** The dial's caption, top-right: "<n> · <stage>". */
  stage: string;
  ground: Ground;
  /** Paper chapters: the colour of the diagonal stripe. */
  stripe?: string;
  bars: number;
};

export const CHAPTER_SPECS: ChapterSpec[] = [
  {
    id: "beats",
    title: "write the beats",
    stage: "1 · plan",
    ground: "paper",
    stripe: "#c9dadd",
    bars: 2,
  },
  {
    id: "code",
    title: "draw it in code",
    stage: "2 · draw",
    ground: "night",
    bars: 3,
  },
  {
    id: "sound",
    title: "give it a sound",
    stage: "3 · sound",
    ground: "paper",
    stripe: "#f0dea8",
    bars: 2,
  },
  {
    id: "end",
    title: "inked explainer",
    stage: "all stages",
    ground: "night",
    bars: 4,
  },
];

export type Chapter = ChapterSpec & {
  index: number;
  from: number;
  duration: number;
};

/** Lay a list of chapter ids end to end. */
export const chaptersOf = (ids: readonly string[]): Chapter[] => {
  let from = 0;
  return ids.map((id, index) => {
    const spec = CHAPTER_SPECS.find((c) => c.id === id);
    if (!spec) throw new Error(`no chapter ${id}`);
    const duration = spec.bars * BAR;
    const chapter = { ...spec, index, from, duration };
    from += duration;
    return chapter;
  });
};

/**
 * The cuts: which chapters, in which order. Add a cut (a 30-second store
 * preview, a 15-second teaser) by listing ids; `make-audio.mjs` writes one
 * music bed per cut, so a cut's music changes where its own picture does.
 */
export const CUTS = {
  full: ["beats", "code", "sound", "end"],
} as const;

export type Cut = keyof typeof CUTS;

export const CHAPTERS: Chapter[] = chaptersOf(CUTS.full);

export const TOTAL_FRAMES = CHAPTERS.reduce((sum, c) => sum + c.duration, 0);

export const totalOf = (chapters: Chapter[]) => chapters.reduce((sum, c) => sum + c.duration, 0);
