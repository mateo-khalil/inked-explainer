import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { NoteArt, Pencil, Sparkle, Sticker, Tag } from "../kit/Bits";
import { Stage, type SceneProps } from "../kit/Stage";
import { clamp, easeOutCubic, lerp, noise, pop, prog, roundRect } from "../motion";
import { HAND, MONO, PAPER } from "../palette";
import type { Cue, SfxName } from "../sfx";
import { BEAT } from "../timeline";

/**
 * 3 · "give it a sound" — a strip of tape with a waveform drawing under a
 * playhead; every sound effect is a paper tag that pops up on the tape at the
 * exact frame its sound plays; the speaker thumps and a metronome swings on
 * every beat. The tags ARE the cue list below: what you see is what you hear.
 *
 * Responsive: a long tape under a speaker + metronome in 16:9, a shorter tape
 * under a stacked speaker + metronome in 9:16 (tags alternate above and below).
 *
 *   0-24     tape rolls out, the speaker and the metronome pop in
 *   24-180   the playhead runs; tags pop on their cues
 *   180-192  hold
 */

const HITS: Array<{ at: number; sfx: SfxName; label: string }> = [
  { at: 36, sfx: "pop", label: "pop" },
  { at: 60, sfx: "chime", label: "chime" },
  { at: 84, sfx: "whoosh", label: "whoosh" },
  { at: 108, sfx: "sparkle", label: "sparkle" },
  { at: 132, sfx: "stamp", label: "stamp" },
  { at: 156, sfx: "note-5", label: "note-5" },
];
const PLAY_FROM = 24;
const PLAY_TO = 180;

export const cues: Cue[] = [
  { at: 2, sfx: "paper", volume: 0.4 },
  ...HITS.map((h) => ({ at: h.at, sfx: h.sfx, volume: h.sfx === "whoosh" ? 0.45 : 0.5 })),
];

/** A little bookshelf speaker, drawn at 0,0, `k` = scale, `thump` = 0..1 cone push. */
const Speaker: React.FC<{ k: number; thump: number }> = ({ k, thump }) => (
  <g transform={`scale(${k})`}>
    <path
      d={roundRect(-70, -110, 140, 220, 18)}
      fill={PAPER.wood}
      stroke={PAPER.ink}
      strokeWidth={3.6}
      filter="url(#paper-shadow)"
    />
    <path d={roundRect(-58, -98, 116, 196, 12)} fill="none" stroke={PAPER.ink} strokeOpacity={0.3} strokeWidth={2} />
    <circle cx={0} cy={-52} r={24} fill={PAPER.creamDeep} stroke={PAPER.ink} strokeWidth={3} />
    <circle cx={0} cy={-52} r={8} fill={PAPER.ink} fillOpacity={0.7} />
    <circle cx={0} cy={34} r={46 + thump * 4} fill={PAPER.creamDeep} stroke={PAPER.ink} strokeWidth={3.4} />
    <circle cx={0} cy={34} r={30 + thump * 3} fill="none" stroke={PAPER.ink} strokeOpacity={0.4} strokeWidth={2} />
    <circle cx={0} cy={34} r={13 + thump * 2} fill={PAPER.ink} fillOpacity={0.75} />
  </g>
);

/**
 * A wooden metronome, drawn at 0,0 (the base's centre), `k` = scale. The
 * pendulum swings to one side per beat — `swing` is -1..1 — and the weight
 * catches the light at each end of its travel.
 */
const Metronome: React.FC<{ k: number; swing: number; flash: number }> = ({ k, swing, flash }) => (
  <g transform={`scale(${k})`}>
    <ellipse cx={4} cy={6} rx={96} ry={12} fill="#3b2a1f" fillOpacity={0.16} />
    {/* the body: a tall trapezoid of wood with a scale plate */}
    <path
      d="M -84 0 L -34 -236 L 34 -236 L 84 0 Z"
      fill={PAPER.wood}
      stroke={PAPER.ink}
      strokeWidth={3.6}
      strokeLinejoin="round"
    />
    <path
      d="M -54 -20 L -24 -206 L 24 -206 L 54 -20 Z"
      fill={PAPER.creamDeep}
      stroke={PAPER.ink}
      strokeWidth={2.6}
      strokeLinejoin="round"
    />
    {Array.from({ length: 9 }, (_, i) => {
      const y = -40 - i * 18;
      const half = 44 - i * 3.2;
      return (
        <path
          key={i}
          d={`M ${-half * 0.45} ${y} H ${half * 0.45}`}
          stroke={PAPER.ink}
          strokeOpacity={0.35}
          strokeWidth={1.6}
        />
      );
    })}
    <path d="M -84 0 H 84" stroke={PAPER.ink} strokeWidth={3.6} strokeLinecap="round" />
    <rect x={-92} y={-4} width={184} height={16} rx={6} fill={PAPER.woodDark} stroke={PAPER.ink} strokeWidth={3} />
    {/* the pendulum, pivoting near the base */}
    <g transform={`translate(0 -34) rotate(${swing * 26})`}>
      <path d="M 0 0 L 0 -210" stroke={PAPER.ink} strokeWidth={4.4} strokeLinecap="round" />
      <path
        d={roundRect(-15, -150, 30, 34, 6)}
        fill={flash > 0.05 ? PAPER.yellow : "#c9c3b6"}
        stroke={PAPER.ink}
        strokeWidth={2.8}
      />
      <circle cx={0} cy={0} r={7} fill={PAPER.ink} />
    </g>
    <circle cx={0} cy={-34} r={4} fill={PAPER.white} />
  </g>
);

export const Sound: React.FC<SceneProps> = ({ chapter }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const tall = H > W;

  // ---- layout
  const tape = tall ? { x: 120, y: 1160, w: 840, h: 170 } : { x: 190, y: 700, w: 1540, h: 170 };
  const speaker = tall ? { x: 300, y: 680, k: 1.35 } : { x: 380, y: 430, k: 1.25 };
  const metro = tall ? { x: 760, y: 860, k: 1.2 } : { x: 1500, y: 610, k: 1.15 };

  const tapeIn = prog(f, 0, 24, easeOutCubic);
  const play = prog(f, PLAY_FROM, PLAY_TO - PLAY_FROM, (t) => t);
  const px = lerp(tape.x + 30, tape.x + tape.w - 30, play);
  const timeAt = (frame: number) =>
    lerp(tape.x + 30, tape.x + tape.w - 30, clamp((frame - PLAY_FROM) / (PLAY_TO - PLAY_FROM)));

  // Beat pulse: the speaker thumps and the metronome ticks on every beat.
  const beatPhase = (f % BEAT) / BEAT;
  const beat = f > 12 ? Math.exp(-beatPhase * 7) : 0;
  // The pendulum reaches an end of its travel ON each beat (one beat per side).
  const swing = f > 12 ? Math.sin((f / BEAT) * Math.PI - Math.PI / 2) : 0;

  // Waveform: bars up to the playhead, louder where a hit lands.
  const bars = tall ? 56 : 96;
  const barW = (tape.w - 60) / bars;
  const wave = Array.from({ length: bars }, (_, i) => {
    const x = tape.x + 30 + i * barW;
    if (x > px) return null;
    const frameAtX = PLAY_FROM + ((x - tape.x - 30) / (tape.w - 60)) * (PLAY_TO - PLAY_FROM);
    const hit = HITS.reduce((acc, h) => acc + Math.exp(-Math.abs(frameAtX - h.at - 4) / 6), 0);
    const amp = clamp(0.18 + 0.2 * Math.abs(noise(i * 0.9, 3)) + 0.6 * hit) * (tape.h * 0.34);
    return (
      <rect
        key={i}
        x={x}
        y={tape.y + tape.h / 2 - amp}
        width={barW * 0.62}
        height={amp * 2}
        rx={barW * 0.3}
        fill={PAPER.ink}
        fillOpacity={0.8}
      />
    );
  });

  return (
    <Stage
      chapter={chapter}
      camera={{ from: 1.0, to: 1.035, focus: [W / 2, H / 2] }}
      under={
        <Pencil
          cx={speaker.x}
          cy={speaker.y}
          r={tall ? 190 : 200}
          baseline={tape.y + tape.h + 70}
          from={tall ? 110 : 160}
          to={tall ? 970 : 1760}
        />
      }
      crisp={
        <>
          {/* time marks under the tape */}
          <g opacity={tapeIn}>
            {[0, 1, 2, 3, 4].map((k) => {
              const x = lerp(tape.x + 30, tape.x + tape.w - 30, k / 4);
              return (
                <text
                  key={k}
                  x={x}
                  y={tape.y + tape.h + 42}
                  textAnchor="middle"
                  fontFamily={MONO}
                  fontSize={tall ? 24 : 20}
                  fill={PAPER.inkSoft}
                >
                  {`${((k / 4) * ((PLAY_TO - PLAY_FROM) / 60)).toFixed(1)}s`}
                </text>
              );
            })}
          </g>
          {/* one tag per sound, popped on its frame */}
          {HITS.map((h, i) => {
            const s = pop(f, h.at, 16, 2.6);
            const above = tall ? i % 2 === 0 : true;
            const y = above ? tape.y - 58 - (tall ? 0 : (i % 2) * 58) : tape.y + tape.h + 100;
            return (
              <Tag
                key={h.label}
                x={timeAt(h.at)}
                y={y}
                text={h.label}
                size={tall ? 30 : 26}
                mono
                scale={s}
                rotate={i % 2 ? 3 : -3}
                fill={i === 4 ? "#ffe3dd" : PAPER.white}
              />
            );
          })}
          <g
            opacity={pop(f, 150, 18) > 0 ? 1 : 0}
            transform={`translate(${tall ? 540 : W / 2} ${tall ? 1560 : 990}) rotate(-2) scale(${pop(f, 150, 18)})`}
          >
            <text textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={tall ? 46 : 42} fill={PAPER.ink}>
              every sound is synthesised — no samples
            </text>
          </g>
        </>
      }
    >
      {/* ---- the tape */}
      <g opacity={tapeIn}>
        <path
          d={roundRect(tape.x, tape.y, lerp(60, tape.w, tapeIn), tape.h, 16)}
          fill={PAPER.white}
          stroke={PAPER.ink}
          strokeWidth={3.4}
          filter="url(#paper-shadow)"
        />
        <line
          x1={tape.x + 20}
          x2={tape.x + tape.w - 20}
          y1={tape.y + tape.h / 2}
          y2={tape.y + tape.h / 2}
          stroke={PAPER.ink}
          strokeOpacity={0.15}
          strokeWidth={2}
        />
        {/* a tick at every beat of the run */}
        {Array.from({ length: Math.floor((PLAY_TO - PLAY_FROM) / BEAT) + 1 }, (_, k) => {
          const x = timeAt(PLAY_FROM + k * BEAT);
          return (
            <line
              key={k}
              x1={x}
              x2={x}
              y1={tape.y + tape.h - 16}
              y2={tape.y + tape.h - 4}
              stroke={PAPER.ink}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
          );
        })}
      </g>
      {wave}
      {/* markers where each hit sits on the tape */}
      {HITS.map((h) =>
        f >= h.at ? (
          <circle
            key={h.label}
            cx={timeAt(h.at)}
            cy={tape.y + 16}
            r={6}
            fill={PAPER.red}
            stroke={PAPER.ink}
            strokeWidth={2}
          />
        ) : null,
      )}
      {/* the playhead */}
      {f >= PLAY_FROM ? (
        <g>
          <line x1={px} x2={px} y1={tape.y - 20} y2={tape.y + tape.h + 20} stroke={PAPER.red} strokeWidth={3.4} />
          <path
            d={`M ${px - 12} ${tape.y - 32} h 24 l -12 15 Z`}
            fill={PAPER.red}
            stroke={PAPER.ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
        </g>
      ) : null}

      {/* ---- the speaker, with sound rings on every hit */}
      <g transform={`translate(${speaker.x} ${speaker.y}) scale(${pop(f, 4, 20)})`}>
        <Speaker k={speaker.k} thump={beat} />
      </g>
      {HITS.map((h, i) => {
        const life = clamp((f - h.at) / 30);
        if (f < h.at || life >= 1) return null;
        return [0, 1, 2].map((r) => (
          <path
            key={`${i}-${r}`}
            d={`M ${speaker.x + 110 * speaker.k + r * 26} ${speaker.y - 40} q 26 ${40 + r * 12} 0 ${80 + r * 24}`}
            transform={`translate(${easeOutCubic(life) * 30} ${-r * 12})`}
            fill="none"
            stroke={PAPER.ink}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={(1 - life) * (1 - r * 0.25)}
          />
        ));
      })}

      {/* notes floating up from the speaker on every other beat */}
      {Array.from({ length: 7 }, (_, i) => {
        const at = 12 + i * BEAT * 2;
        const life = clamp((f - at) / 70);
        if (f < at || life >= 1) return null;
        return (
          <Sticker
            key={i}
            x={speaker.x + (i % 2 ? -1 : 1) * (30 + life * 60) + Math.sin(life * 6 + i) * 16}
            y={speaker.y - 130 * speaker.k - life * 130}
            size={tall ? 74 : 64}
            rotate={Math.sin(life * 4 + i) * 14}
            opacity={1 - life}
          >
            <NoteArt fill={i % 3 === 0 ? "#8fd0ff" : i % 3 === 1 ? "#ff9ec0" : "#ffd24a"} />
          </Sticker>
        );
      })}

      {/* ---- the metronome, one side per beat */}
      <g transform={`translate(${metro.x} ${metro.y}) scale(${pop(f, 8, 20)})`}>
        <Metronome k={metro.k} swing={swing} flash={beat} />
      </g>
      {HITS.map((h, i) => {
        const life = clamp((f - h.at) / 20);
        if (f < h.at || life >= 1) return null;
        return (
          <Sparkle
            key={`s${i}`}
            x={timeAt(h.at) + (i % 2 ? 40 : -40)}
            y={tape.y - 20 - life * 30}
            r={14 * (1 - life)}
            rotate={i * 30}
            fill={PAPER.yellow}
            stroke={PAPER.ink}
          />
        );
      })}
    </Stage>
  );
};
