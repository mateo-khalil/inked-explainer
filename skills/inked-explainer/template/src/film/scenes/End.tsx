import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BoltArt, Chip, HeartArt, LeafArt, NoteArt, Sparkle, StarArt, Sticker, SunArt } from "../kit/Bits";
import { stagesOf, useCut, type CutInfo } from "../kit/Cut";
import { Stage, type SceneProps } from "../kit/Stage";
import { bob, clamp, easeInOutCubic, easeOutCubic, keys, lerp, pop, prog, rng, roundRect } from "../motion";
import { MONO, NIGHT, PAPER, SANS } from "../palette";
import { note, type Cue } from "../sfx";

/**
 * 4 · the end card. A blueprint window with the name typed across it; a
 * fountain-pen nib inks the underline and then draws a heart that fills in —
 * the whole film's idea (a picture drawn in code) in one gesture. Stickers
 * orbit the window like a little solar system (dimmer and smaller on the far
 * side, passing behind it), then the stages this cut walked through and the
 * one-line promise.
 *
 * Responsive: a wide, flat orbit in 16:9; a tall, round one in 9:16.
 * Cut-aware: the recap lights only the stages the cut showed — its cues are a
 * function of the cut for the same reason.
 *
 *   0-40     the window draws itself on
 *   18-78    the name types in
 *   80-112   the nib inks the underline
 *   112-164  the nib draws a heart; 164 it fills
 *   60-      stickers fade into orbit
 *   104-     the stages light up, one per 8 frames
 *   170      the promise
 *   206      the small print
 *   300-384  hold, a slow pull back
 */

const WORD = "inked explainer";
const TYPE_AT = 18;
const LETTER = 4;
const STAGES_AT = 104;
const INK_FROM = 80;
const INK_TO = 112;
const HEART_TO = 164;
const HEART_FILL = HEART_TO;

/** The classic parametric heart, t in 0..1 → a point, unit ≈ 1/16 of its width. */
const heartPoint = (t: number): [number, number] => {
  const a = t * Math.PI * 2;
  return [
    16 * Math.pow(Math.sin(a), 3),
    -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
  ];
};

/**
 * A fountain-pen nib, drawn with its POINT at (0,0), pointing down-left —
 * gold, with the slit and breather hole. `lift` raises it off the page.
 */
const Nib: React.FC<{ x: number; y: number; lift: number; k: number }> = ({ x, y, lift, k }) => (
  <g transform={`translate(${x} ${y - lift * 20}) rotate(${-40 - lift * 8}) scale(${k})`}>
    <path
      d="M 0 0 C 30 -14 58 -22 96 -22 L 126 -22 L 126 22 L 96 22 C 58 22 30 14 0 0 Z"
      fill="#f2c45a"
      stroke={PAPER.ink}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M 0 0 L 70 0" stroke={PAPER.ink} strokeWidth={2.4} strokeLinecap="round" />
    <circle cx={74} cy={0} r={6} fill={NIGHT.deep} stroke={PAPER.ink} strokeWidth={2.4} />
    <path
      d="M 22 -8 C 44 -14 70 -16 96 -16"
      stroke="#fff"
      strokeOpacity={0.6}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M 126 -26 L 190 -26 L 190 26 L 126 26 Z"
      fill={NIGHT.chip}
      stroke={PAPER.ink}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M 136 -26 V 26" stroke={NIGHT.line} strokeOpacity={0.5} strokeWidth={2} />
  </g>
);

export const cues = ({ chapters }: CutInfo): Cue[] => [
  { at: 0, sfx: "whoosh", volume: 0.4 },
  ...WORD.split("").flatMap((ch, i) =>
    ch === " " ? [] : [{ at: TYPE_AT + i * LETTER, sfx: "tick" as const, volume: 0.32 }],
  ),
  { at: 80, sfx: "swish", volume: 0.3 },
  { at: 112, sfx: "paper", volume: 0.3 },
  { at: HEART_FILL, sfx: "pop", volume: 0.5 },
  { at: HEART_FILL + 3, sfx: "sparkle", volume: 0.35 },
  ...stagesOf(chapters).map((_, i) => ({ at: STAGES_AT + i * 8, sfx: note(i + 1), volume: 0.38 })),
  { at: 170, sfx: "pop-hi", volume: 0.4 },
  { at: 206, sfx: "pop-hi", volume: 0.3 },
  { at: 240, sfx: "chime", volume: 0.35 },
];

const ORBIT: Array<React.FC> = [
  () => <StarArt />,
  () => <HeartArt />,
  () => <BoltArt />,
  () => <NoteArt />,
  () => <SunArt />,
  () => <LeafArt />,
  () => <StarArt fill="#8fd0ff" />,
  () => <HeartArt fill="#b99bff" />,
];

export const End: React.FC<SceneProps> = ({ chapter }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const tall = H > W;
  const { chapters } = useCut();
  const stages = stagesOf(chapters);

  // ---- layout
  const win = tall ? { x: 150, y: 470, w: 780, h: 420 } : { x: 570, y: 190, w: 780, h: 410 };
  const orb = tall
    ? { cx: 540, cy: 690, rx: 385, ry: 355, tiltY: -60 }
    : { cx: 960, cy: 395, rx: 780, ry: 262, tiltY: -50 };
  const fontSize = tall ? 70 : 74;
  const recapY = tall ? 1220 : 790;
  const promiseY = tall ? 1400 : 872;
  const smallY = tall ? 1500 : 934;
  const cx = W / 2;

  const draw = prog(f, 0, 40, easeOutCubic);
  const perimeter = 2 * (win.w + win.h);
  const typedN = clamp(Math.floor((f - TYPE_AT) / LETTER) + 1, 0, WORD.length);

  // The ink: an underline under the name, then a heart below it.
  const lineY = win.y + 200;
  const lineX0 = cx - (tall ? 250 : 270);
  const lineX1 = cx + (tall ? 250 : 270);
  const inkLine = prog(f, INK_FROM, INK_TO - INK_FROM, easeInOutCubic);
  const heartC: [number, number] = [cx, win.y + (tall ? 318 : 312)];
  const heartK = tall ? 5.2 : 4.8;
  const heartT = prog(f, INK_TO, HEART_TO - INK_TO, (u) => u);
  const heartN = Math.max(2, Math.round(heartT * 90) + 1);
  const heartPts: Array<[number, number]> = Array.from({ length: heartN }, (_, i) => {
    const [hx, hy] = heartPoint((i / (heartN - 1)) * heartT);
    return [heartC[0] + hx * heartK, heartC[1] + hy * heartK];
  });
  const heartD = heartPts.map(([hx, hy], i) => `${i ? "L" : "M"} ${hx.toFixed(1)} ${hy.toFixed(1)}`).join(" ");
  const filled = pop(f, HEART_FILL, 22, 2.4);
  // Where the nib's point is: along the underline, around the heart, then off to rest.
  const nib = (() => {
    if (f < INK_FROM) {
      const t = prog(f, 40, INK_FROM - 40, easeOutCubic);
      return { x: lerp(lineX1 + 260, lineX0, t), y: lerp(lineY - 140, lineY, t), lift: 1 - t };
    }
    if (f < INK_TO) return { x: lerp(lineX0, lineX1, inkLine), y: lineY + Math.sin(inkLine * 9) * 2, lift: 0 };
    if (f < INK_TO + 1) return { x: lineX1, y: lineY, lift: 0 };
    if (f < HEART_TO) {
      const [px, py] = heartPts[heartPts.length - 1];
      const hop = prog(f, INK_TO, 8, easeOutCubic);
      return { x: lerp(lineX1, px, hop), y: lerp(lineY, py, hop), lift: 0.6 * (1 - hop) };
    }
    const t = prog(f, HEART_TO, 26, easeOutCubic);
    return {
      x: lerp(heartC[0], heartC[0] + (tall ? 250 : 300), t),
      y: lerp(heartC[1] - 13 * heartK, heartC[1] + 20, t),
      lift: t,
    };
  })();

  const camera = (fr: number) => ({
    zoom: keys(
      fr,
      [
        [0, 1.06],
        [60, 1.0],
        [300, 1.0],
        [384, 0.96],
      ],
      easeInOutCubic,
    ),
    focus: [W / 2, H / 2 + (tall ? 0 : 20)] as [number, number],
  });

  // Stickers in orbit: behind the window on the far side, in front on the near.
  const orbit = ORBIT.map((Art, i) => {
    const a = (i / ORBIT.length) * Math.PI * 2 + f * 0.0105;
    const depth = tall ? Math.cos(a) : Math.sin(a); // +1 near, -1 far
    const across = tall ? Math.sin(a) : Math.cos(a);
    const x = orb.cx + across * orb.rx;
    const y = orb.cy + depth * orb.ry + across * orb.tiltY;
    const s = 0.7 + (0.3 * (depth + 1)) / 2;
    const fade = prog(f, 60 + i * 6, 30, easeOutCubic);
    return { Art, x, y, s, depth, fade, i };
  });
  const drawOrbit = (list: typeof orbit) =>
    list.map((o) => (
      <Sticker
        key={o.i}
        x={o.x}
        y={o.y + bob(f, 6, 80, o.i * 11)}
        size={tall ? 150 : 130}
        scale={o.s * o.fade}
        opacity={o.fade * (o.depth < 0 ? 0.55 + 0.45 * (1 + o.depth) : 1)}
        rotate={Math.sin(f / 40 + o.i) * 10}
        night
      >
        <o.Art />
      </Sticker>
    ));

  const r = rng(12);
  const stars = Array.from({ length: 38 }, (_, i) => {
    const x = 90 + r() * (W - 180);
    let y = 150 + r() * (H - 300);
    // Keep the twinkles off the text block.
    if (y > recapY - 60 && y < smallY + 40) y = 150 + ((y - recapY) / (smallY - recapY + 100)) * 120;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / (18 + (i % 7) * 5) + i));
    return (
      <Sparkle
        key={i}
        x={x}
        y={y}
        r={(3.5 + (i % 4) * 2.4) * tw}
        rotate={i * 17}
        opacity={0.35 + 0.5 * tw * prog(f, 10 + i, 20)}
        glow={i % 5 === 0}
      />
    );
  });

  const promise = pop(f, 170, 20);
  const small = prog(f, 206, 30, easeOutCubic);
  const perRow = tall && stages.length > 4 ? 3 : stages.length;
  const chipGap = tall ? 250 : 230;

  return (
    <Stage
      chapter={chapter}
      camera={camera}
      nightCentre={tall ? [50, 38] : [50, 42]}
      under={
        <>
          {stars}
          <ellipse
            cx={orb.cx}
            cy={orb.cy}
            rx={orb.rx}
            ry={orb.ry}
            fill="none"
            stroke={NIGHT.lineFaint}
            strokeWidth={1.4}
            strokeDasharray="2 12"
            opacity={prog(f, 50, 40)}
          />
          {drawOrbit(orbit.filter((o) => o.depth < 0))}
        </>
      }
      crisp={
        <>
          <text
            x={cx}
            y={win.y + 170}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={500}
            fontSize={fontSize}
            letterSpacing={tall ? 2 : 4}
            fill={NIGHT.text}
            style={{ filter: "drop-shadow(0 0 16px rgba(170,190,255,0.55))" }}
          >
            {WORD.slice(0, typedN)}
            <tspan opacity={typedN < WORD.length || Math.floor(f / 18) % 2 === 0 ? 0.85 : 0} fontWeight={300}>
              |
            </tspan>
          </text>

          {stages.map((s, i) => {
            const on = f >= STAGES_AT + i * 8;
            const row = Math.floor(i / perRow);
            const inRow = Math.min(perRow, stages.length - row * perRow);
            const col = i % perRow;
            return (
              <g key={s} opacity={prog(f, STAGES_AT - 16 + i * 4, 16)}>
                <Chip
                  x={cx + (col - (inRow - 1) / 2) * chipGap}
                  y={recapY + row * 64}
                  text={`${i + 1} · ${s}`}
                  size={tall ? 28 : 24}
                  bright={on}
                  tab={on ? NIGHT.green : undefined}
                  scale={on ? 1 + 0.12 * Math.max(0, 1 - (f - STAGES_AT - i * 8) / 10) : 0.94}
                />
              </g>
            );
          })}

          <g transform={`translate(${cx} ${promiseY}) scale(${promise})`} opacity={promise > 0 ? 1 : 0}>
            <text textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={tall ? 52 : 42} fill={NIGHT.text}>
              made entirely in code
            </text>
          </g>
          <g opacity={small}>
            <text
              x={cx}
              y={smallY}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={tall ? 26 : 22}
              fill={NIGHT.cyan}
              letterSpacing={0.5}
            >
              remotion · svg · synthesised sound
            </text>
          </g>
        </>
      }
    >
      {/* ---- the window */}
      <path
        d={roundRect(win.x, win.y, win.w, win.h, 24)}
        fill={NIGHT.deep}
        fillOpacity={0.72 * draw}
        stroke={NIGHT.line}
        strokeWidth={2.6}
        strokeDasharray={`${perimeter * draw} ${perimeter}`}
      />
      <g opacity={prog(f, 16, 20)}>
        <path
          d={roundRect(win.x + 10, win.y + 10, win.w - 20, win.h - 20, 16)}
          fill="none"
          stroke={NIGHT.line}
          strokeOpacity={0.25}
          strokeWidth={1.2}
        />
        <line
          x1={win.x}
          x2={win.x + win.w}
          y1={win.y + 60}
          y2={win.y + 60}
          stroke={NIGHT.line}
          strokeOpacity={0.55}
          strokeWidth={1.6}
        />
        {[0, 1, 2].map((k) => (
          <circle
            key={k}
            cx={win.x + 36 + k * 26}
            cy={win.y + 31}
            r={7.5}
            fill="none"
            stroke={NIGHT.line}
            strokeOpacity={0.8}
            strokeWidth={1.6}
          />
        ))}
        <rect
          x={win.x + 140}
          y={win.y + 16}
          width={300}
          height={30}
          rx={15}
          fill={NIGHT.chip}
          stroke={NIGHT.line}
          strokeOpacity={0.5}
        />
      </g>
      <g stroke={NIGHT.lineDim} strokeWidth={1.2} opacity={prog(f, 24, 30)} fill="none">
        <path
          d={`M ${win.x} ${win.y + win.h + 26} H ${win.x + win.w} M ${win.x} ${win.y + win.h + 18} v 16 M ${win.x + win.w} ${win.y + win.h + 18} v 16`}
        />
      </g>

      {/* ---- the ink: the underline, then the heart, then its fill */}
      {f >= INK_FROM ? (
        <path
          d={`M ${lineX0} ${lineY} C ${lineX0 + 160} ${lineY + 8} ${lineX1 - 160} ${lineY - 6} ${lineX1} ${lineY}`}
          fill="none"
          stroke={NIGHT.cyan}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${(lineX1 - lineX0 + 20) * inkLine} 2000`}
          filter="url(#glow)"
        />
      ) : null}
      {f >= INK_TO ? (
        <path
          d={heartD}
          fill={filled > 0 ? "#ff7fa6" : "none"}
          fillOpacity={Math.min(1, filled)}
          stroke={f >= HEART_FILL ? PAPER.ink : NIGHT.cyan}
          strokeWidth={f >= HEART_FILL ? 5 : 4.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={f >= HEART_FILL ? "url(#sticker-night)" : "url(#glow)"}
          transform={
            f >= HEART_FILL
              ? `translate(${heartC[0]} ${heartC[1]}) scale(${0.85 + 0.15 * filled}) translate(${-heartC[0]} ${-heartC[1]})`
              : undefined
          }
        />
      ) : null}
      {f >= 40 ? <Nib x={nib.x} y={nib.y} lift={nib.lift} k={tall ? 0.85 : 0.8} /> : null}

      {drawOrbit(orbit.filter((o) => o.depth >= 0))}

      {Array.from({ length: 8 }, (_, i) => {
        const life = clamp((f - HEART_FILL) / 30);
        const a = (i / 8) * Math.PI * 2;
        return (
          <Sparkle
            key={i}
            x={heartC[0] + Math.cos(a) * (90 + easeOutCubic(life) * 90)}
            y={heartC[1] + Math.sin(a) * (70 + easeOutCubic(life) * 60)}
            r={(i % 2 ? 8 : 13) * (1 - life) * (f > HEART_FILL ? 1 : 0)}
            rotate={i * 20}
            glow
          />
        );
      })}
    </Stage>
  );
};
