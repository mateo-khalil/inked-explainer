/**
 * The film's sound vocabulary. Every name is a WAV that
 * `scripts/make-audio.mjs` synthesises into `public/sfx/` — no
 * samples, nothing licensed. A scene says what it wants heard by exporting
 * `cues` in its own local frames; `Film.tsx` offsets them by the chapter's start.
 */

export const SFX_NAMES = [
  "tick", // a single UI tick
  "type", // a burst of typewriter ticks — the title typing in (trimmed to length)
  "pop", // something appears
  "pop-hi", // something small appears
  "boop", // soft round blip
  "chime", // success, a bell
  "sparkle", // glitter shimmer
  "whoosh", // a big move / a cut
  "swish", // a quick swing or slide
  "paper", // paper sliding / rustling
  "thud", // soft landing
  "stamp", // a stamp coming down
  "click", // a button or pen click
  "buzz", // one haptic pulse
  "riser", // a one-bar build
  "notif", // a push notification's two-tone
  "coin", // dust / glitter pouring
  "heart", // a like, a bubbly up-pop
  "note-0", // pentatonic marimba notes, low → high, for things landing in sequence
  "note-1",
  "note-2",
  "note-3",
  "note-4",
  "note-5",
  "note-6",
  "note-7",
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

export type Cue = {
  /** Frame, local to the chapter. */
  at: number;
  sfx: SfxName;
  volume?: number;
  /** Cut the sound off after this many frames. */
  length?: number;
};

/** Marimba note `i` (clamped to 0..7). */
export const note = (i: number): SfxName => `note-${Math.max(0, Math.min(7, Math.round(i)))}` as SfxName;
