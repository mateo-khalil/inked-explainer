import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CutContext, type CutInfo } from "./kit/Cut";
import { GlobalDefs } from "./kit/Defs";
import { FilmOverlay } from "./kit/Ground";
import { Hud } from "./kit/Hud";
import type { SceneProps } from "./kit/Stage";
import { SCENES } from "./scenes";
import type { Cue } from "./sfx";
import { chaptersOf, CUTS, totalOf, type Chapter, type Cut } from "./timeline";

/** A scene's cues — or, for one whose sound depends on the cut (an end card's recap), a function of it. */
export type CueSource = Cue[] | ((cut: CutInfo) => Cue[]);

export type Registry = Record<string, { Scene: React.FC<SceneProps>; cues: CueSource }>;

export type FilmProps = {
  mute?: boolean;
  /** Which chapters, end to end — see `CUTS` in timeline.ts. */
  cut?: Cut;
};

/**
 * The film: chapters hard-cutting on bar lines, the HUD above them, grain over
 * everything, and a soundtrack that is entirely synthesised
 * (`scripts/make-audio.mjs`). One component for every cut and both
 * orientations — the composition decides the frame size, and every scene and
 * the kit read it with `useVideoConfig`.
 */
export const Film: React.FC<FilmProps> = ({ mute = false, cut = "full" }) => {
  const frame = useCurrentFrame();
  const chapters = chaptersOf(CUTS[cut]);
  const total = totalOf(chapters);
  const current = chapters.find((c) => frame >= c.from && frame < c.from + c.duration) ?? chapters[chapters.length - 1];
  return (
    <CutContext.Provider value={{ cut, chapters, total }}>
      <AbsoluteFill style={{ backgroundColor: "#000" }}>
        <GlobalDefs frame={frame} />
        {chapters.map((c) => {
          const { Scene } = SCENES[c.id];
          return (
            <Sequence key={c.id} name={`${c.index + 1} · ${c.id}`} from={c.from} durationInFrames={c.duration}>
              <Scene chapter={c} />
            </Sequence>
          );
        })}
        <Hud frame={frame} />
        <FilmOverlay frame={frame} ground={current.ground} />
        {mute ? null : <Soundtrack chapters={chapters} total={total} cut={cut} />}
      </AbsoluteFill>
    </CutContext.Provider>
  );
};

/**
 * Mix levels. Effects sit ~3 dB under what the scenes ask for, so a busy
 * chapter does not bury the music. Re-measure after changing any of these:
 *   npx remotion render InkedFilm out/mix.mp3 --codec=mp3
 *   ffmpeg -i out/mix.mp3 -af ebur128=peak=true -f null -
 */
const MUSIC_GAIN = 0.85;
const SFX_GAIN = 0.72;
const TYPE_GAIN = 0.24;

const Soundtrack: React.FC<{ chapters: Chapter[]; total: number; cut: Cut }> = ({ chapters, total, cut }) => (
  <>
    <Sequence name="music" durationInFrames={total}>
      {/* One bed per cut — each is arranged to its own chapters' grounds and bar lines. */}
      <Audio src={staticFile(`music-${cut}.wav`)} volume={MUSIC_GAIN} />
    </Sequence>
    {chapters.map((c) => {
      // The title types at 34 characters a second; the burst is cut to its length.
      const typeFrames = Math.ceil((c.title.length / 34) * 60) + 2;
      return c.id === "end" ? null : (
        <Sequence key={`type-${c.id}`} name={`type · ${c.id}`} from={c.from + 3} durationInFrames={typeFrames}>
          <Audio src={staticFile("sfx/type.wav")} volume={TYPE_GAIN} />
        </Sequence>
      );
    })}
    {chapters.flatMap((c) => {
      const source = SCENES[c.id].cues;
      const list = typeof source === "function" ? source({ cut, chapters, total }) : source;
      return list.map((cue, i) => (
        <Sequence
          key={`${c.id}-${i}`}
          name={`sfx · ${c.id} · ${cue.sfx}`}
          from={c.from + cue.at}
          durationInFrames={cue.length}
        >
          <Audio src={staticFile(`sfx/${cue.sfx}.wav`)} volume={(cue.volume ?? 0.6) * SFX_GAIN} />
        </Sequence>
      ));
    })}
  </>
);
