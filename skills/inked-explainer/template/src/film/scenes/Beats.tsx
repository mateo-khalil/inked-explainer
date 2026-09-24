import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Pencil, Sparkle, Tag } from "../kit/Bits";
import { Stage, type SceneProps } from "../kit/Stage";
import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, keys, lerp, pop, prog, roundRect } from "../motion";
import { HAND, MONO, NIGHT, PAPER, STRIPES } from "../palette";
import { note, type Cue } from "../sfx";
import { BEAT } from "../timeline";

/**
 * 1 · "write the beats" — the film is planned as storyboard cards pinned to a
 * board with a bar ruler across the top. Each card drops onto the board ON A
 * BEAT (every 24 frames), a pin pops into it, and a drawn pencil glides over
 * and taps it; a red playhead sweeps the ruler the whole time. The payoff is
 * the rule the style lives by: the pencil draws a bracket under the cards and
 * the note appears — one chapter = whole bars.
 *
 * No character: an object carries the action. The pencil's pose is a function
 * of the frame (`pencilAt`), so the scene can aim it at a card before it lands.
 *
 * Responsive: one wide board in 16:9, a 2×2 board in 9:16.
 *
 *   0-30     the board slides up, the ruler draws; the pencil slides in
 *   40-112   four cards land on four beats (40, 64, 88, 112), each tapped
 *   130-152  the pencil draws the bracket, the note pops
 *   170-192  lean in
 */

const LAND = [40, 40 + BEAT, 40 + 2 * BEAT, 40 + 3 * BEAT];
const NOTE_AT = 132;

export const cues: Cue[] = [
  { at: 2, sfx: "paper", volume: 0.45 },
  ...LAND.flatMap((at, i) => [
    { at: at - 10, sfx: "swish" as const, volume: 0.25 },
    { at, sfx: note(i + 1), volume: 0.45 },
    { at: at + 4, sfx: "pop-hi" as const, volume: 0.35 },
  ]),
  { at: NOTE_AT, sfx: "tick", volume: 0.4 },
  { at: NOTE_AT + 14, sfx: "sparkle", volume: 0.3 },
];

type CardKind = "paper" | "night" | "sound" | "end";
const CARDS: Array<{ kind: CardKind; label: string }> = [
  { kind: "paper", label: "1 · beats" },
  { kind: "night", label: "2 · code" },
  { kind: "sound", label: "3 · sound" },
  { kind: "end", label: "4 · end" },
];

/** A tiny thumbnail of each chapter, drawn inside a w×h card window at 0,0. */
const Thumb: React.FC<{ kind: CardKind; w: number; h: number; f: number }> = ({ kind, w, h, f }) => {
  const clip = `thumb-${kind}`;
  const night = kind === "night" || kind === "end";
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect width={w} height={h} rx={10} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={w} height={h} fill={night ? NIGHT.mid : PAPER.cream} />
        {night
          ? Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                d={`M ${(i * w) / 7} 0 V ${h} M 0 ${(i * h) / 7} H ${w}`}
                stroke={NIGHT.line}
                strokeOpacity={0.14}
              />
            ))
          : Array.from({ length: 10 }, (_, i) => (
              <path
                key={i}
                d={`M ${i * 34 - h} ${h} L ${i * 34} 0`}
                stroke={kind === "sound" ? STRIPES.butter : STRIPES.blue}
                strokeWidth={14}
              />
            ))}
        {kind === "paper" ? (
          <>
            <path
              d={`M 0 ${h * 0.8} Q ${w / 2} ${h * 0.7} ${w} ${h * 0.82} V ${h} H 0 Z`}
              fill="#d7e6bf"
              stroke={PAPER.ink}
              strokeWidth={2}
            />
            <circle cx={w * 0.4} cy={h * 0.55} r={h * 0.14} fill="#ffc863" stroke={PAPER.ink} strokeWidth={2.4} />
            <circle cx={w * 0.37} cy={h * 0.53} r={2} fill={PAPER.ink} />
            <circle cx={w * 0.44} cy={h * 0.53} r={2} fill={PAPER.ink} />
          </>
        ) : null}
        {kind === "night" ? (
          <path
            d={`M ${w * 0.5} ${h * 0.82} C ${w * 0.1} ${h * 0.6} ${w * 0.1} ${h * 0.2} ${w * 0.3} ${h * 0.22} C ${w * 0.42} ${h * 0.22} ${w * 0.5} ${h * 0.34} ${w * 0.5} ${h * 0.4} C ${w * 0.5} ${h * 0.34} ${w * 0.58} ${h * 0.22} ${w * 0.7} ${h * 0.22} C ${w * 0.9} ${h * 0.2} ${w * 0.9} ${h * 0.6} ${w * 0.5} ${h * 0.82} Z`}
            fill="none"
            stroke={NIGHT.cyan}
            strokeWidth={2.4}
            filter="url(#glow)"
          />
        ) : null}
        {kind === "sound"
          ? Array.from({ length: 14 }, (_, i) => {
              const bh = (0.18 + 0.5 * Math.abs(Math.sin(i * 1.7 + f / 12))) * h * 0.6;
              return (
                <rect
                  key={i}
                  x={w * 0.08 + (i * (w * 0.84)) / 14}
                  y={h / 2 - bh / 2}
                  width={(w * 0.84) / 14 - 3}
                  height={bh}
                  rx={2}
                  fill={PAPER.ink}
                  fillOpacity={0.75}
                />
              );
            })
          : null}
        {kind === "end" ? (
          <>
            <rect
              x={w * 0.15}
              y={h * 0.3}
              width={w * 0.7}
              height={h * 0.4}
              rx={6}
              fill="none"
              stroke={NIGHT.line}
              strokeWidth={2}
            />
            <path
              d={`M ${w * 0.25} ${h * 0.5} H ${w * 0.75}`}
              stroke={NIGHT.text}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Sparkle x={w * 0.82} y={h * 0.22} r={9} glow />
          </>
        ) : null}
      </g>
      <rect width={w} height={h} rx={10} fill="none" stroke={PAPER.ink} strokeWidth={2.6} />
    </g>
  );
};

export const Beats: React.FC<SceneProps> = ({ chapter }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const tall = H > W;

  // ---- layout, derived from the frame
  const board = tall ? { x: 110, y: 420, w: 860, h: 1080 } : { x: 170, y: 270, w: 1580, h: 620 };
  const cardW = tall ? 330 : 280;
  const cardH = tall ? 330 : 310;
  const rulerY = board.y + 62;
  const slots = CARDS.map((_, i) => {
    if (tall) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return [board.x + 215 + col * 430, board.y + 340 + row * 430] as const;
    }
    return [board.x + 230 + i * 374, board.y + 350] as const;
  });
  const bracketY = board.y + board.h - 110;
  const bracketX0 = tall ? board.x + 60 : slots[0][0] - cardW / 2;
  const bracketX1 = tall ? board.x + board.w - 60 : slots[3][0] + cardW / 2;

  const boardIn = prog(f, 0, 26, easeOutCubic);
  const ruler = prog(f, 8, 30, easeOutCubic);

  // The playhead sweeps the ruler across the chapter.
  const rulerX0 = board.x + 50;
  const rulerX1 = board.x + board.w - 50;
  const playX = lerp(
    rulerX0,
    rulerX1,
    prog(f, 24, 160, (t) => t),
  );

  // The pencil: where its TIP is and how far it is lifted, as a function of
  // the frame — it glides to each card in the 14 frames before that card
  // lands, taps on the landing beat, and after the last card draws the
  // bracket from left to right.
  const tapPoint = (i: number): [number, number] => [slots[i][0] + cardW * 0.28, slots[i][1] - cardH * 0.18];
  const pencilAt = (fr: number): { x: number; y: number; lift: number } => {
    // Resting spot: low on the right, clear of the dial and inside the frame.
    const rest: [number, number] = tall ? [640, board.y + board.h + 90] : [W - 290, board.y + board.h - 200];
    if (fr < 26) {
      const t = prog(fr, 6, 20, easeOutCubic);
      return { x: lerp(W + 260, rest[0], t), y: rest[1], lift: 1 };
    }
    if (fr < NOTE_AT - 6) {
      // travelling to (or sitting on) the next card
      let from: [number, number] = rest;
      for (let i = 0; i < LAND.length; i += 1) {
        const at = LAND[i];
        const to = tapPoint(i);
        if (fr < at) {
          const t = prog(fr, at - 14, 14, easeInOutCubic);
          return { x: lerp(from[0], to[0], t), y: lerp(from[1], to[1], t) - 40 * (1 - t), lift: 1 - t };
        }
        if (fr < at + 10) return { x: to[0], y: to[1], lift: clamp((fr - at - 2) / 8) * 0.6 };
        from = to;
      }
      const t = prog(fr, LAND[3] + 10, NOTE_AT - 6 - LAND[3] - 10, easeInOutCubic);
      return { x: lerp(from[0], bracketX0, t), y: lerp(from[1] - 20, bracketY + 16, t), lift: 0.6 * (1 - t) };
    }
    if (fr < NOTE_AT + 22) {
      const t = prog(fr, NOTE_AT, 20, (u) => u);
      return { x: lerp(bracketX0, bracketX1, t), y: bracketY + 16, lift: 0 };
    }
    const t = prog(fr, NOTE_AT + 22, 20, easeOutCubic);
    return { x: lerp(bracketX1, bracketX1 + 40, t), y: bracketY + 16 - 70 * t, lift: t };
  };
  const pencil = pencilAt(f);
  const landed = LAND.filter((at) => f >= at).length;

  const noteIn = pop(f, NOTE_AT, 20);

  const camera = (fr: number) => ({
    zoom: keys(fr, [
      [0, 1.0],
      [168, 1.02],
      [192, 1.08],
    ]),
    focus: [
      keys(fr, [
        [0, W / 2],
        [168, W / 2],
        [192, board.x + board.w / 2],
      ]),
      keys(fr, [
        [0, H / 2],
        [168, H / 2],
        [192, board.y + board.h / 2],
      ]),
    ] as [number, number],
  });

  return (
    <Stage
      chapter={chapter}
      camera={camera}
      under={
        <Pencil
          cx={tall ? board.x + board.w - 120 : board.x + board.w - 140}
          cy={tall ? board.y + board.h - 140 : board.y + 110}
          r={tall ? 170 : 190}
          baseline={tall ? 1720 : 960}
          from={tall ? 110 : 160}
          to={tall ? 970 : 1760}
        />
      }
      crisp={
        <>
          {/* ruler labels */}
          <g opacity={ruler}>
            {[0, 1, 2, 3].map((b) => (
              <text
                key={b}
                x={rulerX0 + ((rulerX1 - rulerX0) * b) / 4 + 10}
                y={rulerY - 14}
                fontFamily={MONO}
                fontSize={tall ? 24 : 20}
                fill={PAPER.inkSoft}
              >
                {`bar ${b + 1}`}
              </text>
            ))}
          </g>
          {/* card captions */}
          {CARDS.map((c, i) => {
            const land = pop(f, LAND[i], 18);
            return (
              <text
                key={c.label}
                x={slots[i][0]}
                y={slots[i][1] + cardH / 2 - 26}
                textAnchor="middle"
                fontFamily={MONO}
                fontWeight={500}
                fontSize={tall ? 30 : 24}
                fill={PAPER.ink}
                opacity={land > 0.5 ? 1 : 0}
              >
                {c.label}
              </text>
            );
          })}
          <g
            transform={`translate(${board.x + board.w / 2} ${board.y + board.h - 60}) rotate(-2) scale(${noteIn})`}
            opacity={noteIn > 0 ? 1 : 0}
          >
            <text textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={tall ? 50 : 44} fill={PAPER.ink}>
              one chapter = whole bars
            </text>
          </g>
          <Tag
            x={tall ? 540 : board.x + 230}
            y={tall ? board.y - 40 : board.y - 40}
            text="150 bpm · 96 frames a bar"
            size={tall ? 28 : 22}
            mono
            scale={pop(f, 20, 18)}
            rotate={-2}
          />
        </>
      }
    >
      {/* ---- the board */}
      <g opacity={boardIn} transform={`translate(0 ${(1 - boardIn) * 60})`}>
        <path
          d={roundRect(board.x, board.y, board.w, board.h, 22)}
          fill={PAPER.kraft}
          stroke={PAPER.ink}
          strokeWidth={3.6}
          filter="url(#paper-shadow)"
        />
        <path
          d={roundRect(board.x + 14, board.y + 14, board.w - 28, board.h - 28, 14)}
          fill="none"
          stroke={PAPER.ink}
          strokeOpacity={0.25}
          strokeWidth={2}
          strokeDasharray="10 8"
        />
        {/* the ruler: four bars, four beats each */}
        <g>
          <line
            x1={rulerX0}
            x2={lerp(rulerX0, rulerX1, ruler)}
            y1={rulerY}
            y2={rulerY}
            stroke={PAPER.ink}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {Array.from({ length: 17 }, (_, k) => {
            const x = rulerX0 + ((rulerX1 - rulerX0) * k) / 16;
            const bar = k % 4 === 0;
            return x <= lerp(rulerX0, rulerX1, ruler) + 1 ? (
              <line
                key={k}
                x1={x}
                x2={x}
                y1={rulerY}
                y2={rulerY + (bar ? 22 : 11)}
                stroke={PAPER.ink}
                strokeWidth={bar ? 3 : 2}
              />
            ) : null;
          })}
        </g>
        {/* empty slots, dashed in pencil */}
        {slots.map(([sx, sy], i) => (
          <path
            key={i}
            d={roundRect(sx - cardW / 2, sy - cardH / 2, cardW, cardH, 14)}
            fill="none"
            stroke={PAPER.ink}
            strokeOpacity={0.28}
            strokeWidth={2.4}
            strokeDasharray="8 8"
          />
        ))}
      </g>

      {/* ---- the cards, each landing on its beat */}
      {CARDS.map((c, i) => {
        const at = LAND[i];
        if (f < at - 14) return null;
        const drop = prog(f, at - 14, 14, (t) => t * t);
        const settle = prog(f, at, 16, (t) => easeOutBack(t, 2.4));
        const [sx, sy] = slots[i];
        const y = f < at ? lerp(sy - 420, sy, drop) : sy;
        const squash = f < at ? 1 : 1 - 0.12 * Math.sin(settle * Math.PI) * (1 - settle);
        const rot = f < at ? lerp(-18 + i * 9, 0, drop) : (i % 2 ? 2.5 : -2.5) * settle;
        const tw = cardW - 36;
        const th = cardH - 100;
        return (
          <g key={c.label} transform={`translate(${sx} ${y}) rotate(${rot}) scale(${1 / squash} ${squash})`}>
            <path
              d={roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14)}
              fill={PAPER.white}
              stroke={PAPER.ink}
              strokeWidth={3.2}
              filter="url(#paper-shadow)"
            />
            <g transform={`translate(${-tw / 2} ${-cardH / 2 + 22})`}>
              <Thumb kind={c.kind} w={tw} h={th} f={f} />
            </g>
            {/* the pin */}
            <g transform={`translate(0 ${-cardH / 2 + 4}) scale(${pop(f, at + 2, 14, 3)})`}>
              <ellipse cx={3} cy={9} rx={10} ry={4} fill="#3b2a1f" fillOpacity={0.2} />
              <circle r={13} fill={PAPER.red} stroke={PAPER.ink} strokeWidth={3} />
              <circle cx={-4} cy={-4} r={4} fill="#fff" fillOpacity={0.7} />
            </g>
          </g>
        );
      })}

      {/* a sparkle on each landing */}
      {LAND.flatMap((at, i) =>
        Array.from({ length: 5 }, (_, k) => {
          const life = clamp((f - at) / 22);
          if (f < at || life >= 1) return null;
          const a = (k / 5) * Math.PI * 2 + i;
          const d = cardW * 0.55 + easeOutCubic(life) * 50;
          return (
            <Sparkle
              key={`${i}-${k}`}
              x={slots[i][0] + Math.cos(a) * d}
              y={slots[i][1] + Math.sin(a) * d * 1.1}
              r={(k % 2 ? 9 : 14) * (1 - life)}
              rotate={k * 30}
              fill={k % 2 ? PAPER.white : PAPER.yellow}
              stroke={PAPER.ink}
            />
          );
        }),
      )}

      {/* the pencil bracket under the cards */}
      {f >= NOTE_AT ? (
        <path
          d={`M ${bracketX0} ${bracketY} q 0 16 16 16 H ${bracketX1 - 16} q 16 0 16 -16`}
          fill="none"
          stroke={PAPER.red}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${(bracketX1 - bracketX0 + 40) * prog(f, NOTE_AT, 20, (u) => u)} 4000`}
        />
      ) : null}

      {/* the playhead */}
      {f > 24 ? (
        <g>
          <line
            x1={playX}
            x2={playX}
            y1={rulerY - 26}
            y2={board.y + board.h - 26}
            stroke={PAPER.red}
            strokeWidth={3}
            strokeOpacity={0.85}
          />
          <path
            d={`M ${playX - 11} ${rulerY - 36} h 22 l -11 14 Z`}
            fill={PAPER.red}
            stroke={PAPER.ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
        </g>
      ) : null}

      {/* ---- the pencil, tapping each card as it lands */}
      <DrawingPencil x={pencil.x} y={pencil.y} lift={pencil.lift} k={tall ? 1.25 : 1.1} />
      {landed > 0 && f - LAND[landed - 1] < 16 ? (
        <circle
          cx={tapPoint(landed - 1)[0]}
          cy={tapPoint(landed - 1)[1]}
          r={10 + (f - LAND[landed - 1]) * 3}
          fill="none"
          stroke={PAPER.ink}
          strokeWidth={2.4}
          opacity={1 - (f - LAND[landed - 1]) / 16}
        />
      ) : null}
    </Stage>
  );
};

/**
 * A yellow pencil, drawn with its TIP at (x, y), leaning up and to the right.
 * `lift` raises it off the paper (the tip rises and the shadow drifts away),
 * which is what makes a tap read as a tap.
 */
const DrawingPencil: React.FC<{ x: number; y: number; lift: number; k?: number }> = ({ x, y, lift, k = 1 }) => {
  const up = lift * 26;
  return (
    <g>
      {/* its shadow on the paper, falling away as it lifts */}
      <g transform={`translate(${x + 10 + up * 0.8} ${y + 8 + up * 0.5}) rotate(-38) scale(${k})`} opacity={0.16}>
        <path d="M 0 0 L 34 -13 L 262 -13 L 262 13 L 34 13 Z" fill="#3b2a1f" />
      </g>
      <g transform={`translate(${x} ${y - up}) rotate(${-38 - lift * 6}) scale(${k})`}>
        {/* body: three facets */}
        <path
          d="M 34 -13 L 220 -13 L 220 13 L 34 13 Z"
          fill={PAPER.yellow}
          stroke={PAPER.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M 34 -4 L 220 -4" stroke={PAPER.ink} strokeOpacity={0.35} strokeWidth={2} />
        <path d="M 34 5 L 220 5" stroke={PAPER.ink} strokeOpacity={0.2} strokeWidth={2} />
        <path d="M 40 -10 L 214 -10" stroke="#fff" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
        {/* ferrule and eraser */}
        <path
          d="M 220 -14 L 244 -14 L 244 14 L 220 14 Z"
          fill="#c9c3b6"
          stroke={PAPER.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M 228 -14 V 14 M 236 -14 V 14" stroke={PAPER.ink} strokeOpacity={0.4} strokeWidth={1.6} />
        <path
          d="M 244 -13 L 262 -13 Q 270 -13 270 -5 L 270 5 Q 270 13 262 13 L 244 13 Z"
          fill={PAPER.pink}
          stroke={PAPER.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        {/* the sharpened wood and the graphite tip */}
        <path d="M 0 0 L 34 -13 L 34 13 Z" fill="#f2d2a9" stroke={PAPER.ink} strokeWidth={3} strokeLinejoin="round" />
        <path d="M 0 0 L 11 -4.3 L 11 4.3 Z" fill={PAPER.ink} />
      </g>
    </g>
  );
};
