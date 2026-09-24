import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Chip, HeartArt, Sparkle, Sticker } from "../kit/Bits";
import { Stage, type SceneProps } from "../kit/Stage";
import { clamp, easeInOutCubic, easeOutBack, easeOutCubic, pop, prog, roundRect, typed } from "../motion";
import { MONO, NIGHT, SANS } from "../palette";
import { note, type Cue } from "../sfx";

/**
 * 2 · "draw it in code" — a blueprint of one SVG path drawing itself. Each
 * cubic segment appears with its control handles, a glowing pen tip runs along
 * it, and the matching line of `<path d>` types into the code panel beside it
 * at the same moment. A frame counter ticks the whole time: every picture in
 * the film is a function of that number. The payoff: the outline fills and
 * pops off the blueprint as a sticker.
 *
 * Responsive: drawing left + code right in 16:9, drawing over code in 9:16.
 *
 *   0-30     the drawing area and code panel frame up
 *   40-184   four segments, 36 frames each, handles + code line in step
 *   200      the outline fills
 *   214      it pops off as a sticker
 *   230-288  hold; the counter keeps counting
 */

/** The heart, in a 100-unit box: an anchor and four cubic segments. */
const START: [number, number] = [50, 90];
const SEGMENTS: Array<{ c1: [number, number]; c2: [number, number]; to: [number, number]; code: string }> = [
  { c1: [10, 62], c2: [2, 38], to: [20, 20], code: "  C 10 62, 2 38, 20 20" },
  { c1: [34, 7], c2: [48, 16], to: [50, 30], code: "  C 34 7, 48 16, 50 30" },
  { c1: [52, 16], c2: [66, 7], to: [80, 20], code: "  C 52 16, 66 7, 80 20" },
  { c1: [98, 38], c2: [90, 62], to: [50, 90], code: '  C 98 38, 90 62, 50 90 Z" />' },
];
const SEG_AT = (i: number) => 40 + i * 36;
const SEG_LEN = 36;
const FILL = 200;
const POP = 214;

export const cues: Cue[] = [
  { at: 4, sfx: "whoosh", volume: 0.3 },
  { at: 22, sfx: "tick", volume: 0.35 },
  ...SEGMENTS.flatMap((_, i) => [
    { at: SEG_AT(i), sfx: "click" as const, volume: 0.35 },
    { at: SEG_AT(i) + 2, sfx: note(i + 2), volume: 0.3 },
  ]),
  { at: FILL, sfx: "boop", volume: 0.45 },
  { at: POP, sfx: "pop", volume: 0.55 },
  { at: POP + 2, sfx: "chime", volume: 0.45 },
  { at: POP + 6, sfx: "sparkle", volume: 0.35 },
];

const cubicAt = (
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): [number, number] => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

export const Code: React.FC<SceneProps> = ({ chapter }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const tall = H > W;

  // ---- layout
  const art = tall ? { cx: 540, cy: 690, size: 560 } : { cx: 640, cy: 580, size: 560 };
  const panel = tall ? { x: 130, y: 1070, w: 820, h: 390 } : { x: 1080, y: 300, w: 700, h: 470 };
  const k = art.size / 100;
  const P = ([u, v]: [number, number]): [number, number] => [art.cx + (u - 50) * k, art.cy + (v - 50) * k];

  const frameIn = prog(f, 0, 26, easeOutCubic);
  const filled = prog(f, FILL, 16, easeInOutCubic);
  const stickerPop = pop(f, POP, 20, 2.4);

  // Segment geometry in world px, and each one's progress.
  let from = START;
  const segs = SEGMENTS.map((s, i) => {
    const p0 = P(from);
    const seg = {
      p0,
      c1: P(s.c1),
      c2: P(s.c2),
      p3: P(s.to),
      t: prog(f, SEG_AT(i), SEG_LEN, easeInOutCubic),
      at: SEG_AT(i),
    };
    from = s.to;
    return seg;
  });
  const partial = (s: (typeof segs)[number]) => {
    // de Casteljau split at t: the drawn part of a cubic is itself a cubic.
    const t = s.t;
    const lerp2 = (a: [number, number], b: [number, number]): [number, number] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    const a = lerp2(s.p0, s.c1);
    const b = lerp2(s.c1, s.c2);
    const c = lerp2(s.c2, s.p3);
    const d = lerp2(a, b);
    const e = lerp2(b, c);
    const g = lerp2(d, e);
    return `M ${s.p0[0]} ${s.p0[1]} C ${a[0]} ${a[1]} ${d[0]} ${d[1]} ${g[0]} ${g[1]}`;
  };
  const fullD = `M ${segs[0].p0[0]} ${segs[0].p0[1]} ${segs
    .map((s) => `C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.p3[0]} ${s.p3[1]}`)
    .join(" ")} Z`;
  const drawing = segs.find((s) => s.t > 0 && s.t < 1);
  const tip = drawing ? cubicAt(drawing.t, drawing.p0, drawing.c1, drawing.c2, drawing.p3) : null;

  // ---- code panel lines, each typed as its segment starts
  const lines = [
    { text: '<path d="M 50 90', at: 22 },
    ...SEGMENTS.map((s, i) => ({ text: s.code, at: SEG_AT(i) })),
    { text: "<Sticker><HeartArt /></Sticker>", at: POP },
  ];
  const lineSize = tall ? 30 : 26;
  const lineGap = tall ? 44 : 44;
  const current = lines.reduce((acc, l, i) => (f >= l.at ? i : acc), -1);

  return (
    <Stage
      chapter={chapter}
      camera={{ from: 1.0, to: 1.04, focus: [W / 2, H / 2], focusTo: [W / 2, H / 2 + (tall ? 20 : 0)] }}
      nightCentre={tall ? [50, 36] : [34, 52]}
      crisp={
        <>
          {/* code panel text */}
          <g opacity={frameIn}>
            <text x={panel.x + 28} y={panel.y + 40} fontFamily={MONO} fontSize={tall ? 24 : 20} fill={NIGHT.textDim}>
              heart.svg
            </text>
            {lines.map((l, i) =>
              f >= l.at ? (
                <g key={i}>
                  {i === current ? (
                    <rect
                      x={panel.x + 18}
                      y={panel.y + 72 + i * lineGap - lineSize}
                      width={5}
                      height={lineSize + 8}
                      rx={2.5}
                      fill={NIGHT.cyan}
                    />
                  ) : null}
                  <text
                    x={panel.x + 34}
                    y={panel.y + 72 + i * lineGap}
                    fontFamily={MONO}
                    fontSize={lineSize}
                    fill={i === lines.length - 1 ? NIGHT.gold : i === current ? "#ffffff" : NIGHT.text}
                    opacity={i === current ? 1 : 0.78}
                  >
                    {typed(l.text, f, l.at, 44)}
                  </text>
                </g>
              ) : null,
            )}
          </g>
          {/* anchor labels */}
          {segs.map((s, i) =>
            s.t > 0 ? (
              <text
                key={i}
                x={s.p3[0] + (i === 3 ? 26 : i < 2 ? -24 : 24)}
                y={s.p3[1] + (i === 3 ? 44 : -22)}
                textAnchor={i < 2 ? "end" : "start"}
                fontFamily={MONO}
                fontSize={tall ? 24 : 20}
                fill={NIGHT.textDim}
                opacity={clamp(s.t * 3) * (1 - stickerPop)}
              >
                {`${SEGMENTS[i].to[0]}, ${SEGMENTS[i].to[1]}`}
              </text>
            ) : null,
          )}
          <Chip
            x={tall ? 540 : panel.x + panel.w / 2}
            y={tall ? panel.y + panel.h + 70 : panel.y + panel.h + 70}
            text={`frame ${String(f).padStart(3, "0")} / ${chapter.duration - 1}`}
            tab={NIGHT.cyan}
            size={tall ? 30 : 26}
            scale={pop(f, 10, 16)}
          />
          <Chip
            x={tall ? 540 : panel.x + panel.w / 2}
            y={tall ? panel.y + panel.h + 140 : panel.y + panel.h + 140}
            text="a picture is a function of the frame"
            size={tall ? 24 : 21}
            scale={pop(f, 60, 16)}
          />
        </>
      }
    >
      {/* ---- drawing area: a square frame with dimension marks */}
      <g opacity={frameIn * (1 - stickerPop * 0.85)} fill="none" stroke={NIGHT.lineDim} strokeWidth={1.4}>
        <rect
          x={art.cx - art.size / 2 - 30}
          y={art.cy - art.size / 2 - 30}
          width={art.size + 60}
          height={art.size + 60}
          strokeDasharray="4 10"
        />
        <path
          d={`M ${art.cx - art.size / 2} ${art.cy + art.size / 2 + 60} H ${art.cx + art.size / 2} M ${art.cx - art.size / 2} ${art.cy + art.size / 2 + 50} v 20 M ${art.cx + art.size / 2} ${art.cy + art.size / 2 + 50} v 20`}
        />
        <path
          d={`M ${art.cx - art.size / 2 - 60} ${art.cy - art.size / 2} V ${art.cy + art.size / 2} M ${art.cx - art.size / 2 - 70} ${art.cy - art.size / 2} h 20 M ${art.cx - art.size / 2 - 70} ${art.cy + art.size / 2} h 20`}
        />
      </g>
      <g opacity={frameIn * (1 - stickerPop)}>
        <text
          x={art.cx}
          y={art.cy + art.size / 2 + 92}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={20}
          fill={NIGHT.textDim}
        >
          100
        </text>
      </g>

      {/* ---- code panel frame */}
      <g opacity={frameIn} transform={`translate(0 ${(1 - frameIn) * 30})`}>
        <path
          d={roundRect(panel.x, panel.y, panel.w, panel.h, 18)}
          fill={NIGHT.deep}
          fillOpacity={0.7}
          stroke={NIGHT.line}
          strokeWidth={2}
        />
        <line
          x1={panel.x}
          x2={panel.x + panel.w}
          y1={panel.y + 56}
          y2={panel.y + 56}
          stroke={NIGHT.line}
          strokeOpacity={0.4}
        />
        {[0, 1, 2].map((d) => (
          <circle
            key={d}
            cx={panel.x + panel.w - 34 - d * 22}
            cy={panel.y + 30}
            r={6}
            fill="none"
            stroke={NIGHT.line}
            strokeOpacity={0.7}
            strokeWidth={1.4}
          />
        ))}
      </g>

      {/* ---- handles: dim lines from each anchor to its control points */}
      {segs.map((s, i) => {
        const on = pop(f, s.at - 4, 14);
        const fade = 1 - filled;
        if (on <= 0) return null;
        return (
          <g key={`h${i}`} opacity={fade}>
            <line
              x1={s.p0[0]}
              y1={s.p0[1]}
              x2={s.c1[0]}
              y2={s.c1[1]}
              stroke={NIGHT.violet}
              strokeWidth={1.6}
              strokeDasharray="5 6"
            />
            <line
              x1={s.p3[0]}
              y1={s.p3[1]}
              x2={s.c2[0]}
              y2={s.c2[1]}
              stroke={NIGHT.violet}
              strokeWidth={1.6}
              strokeDasharray="5 6"
            />
            {[s.c1, s.c2].map(([cx, cy], j) => (
              <rect
                key={j}
                x={cx - 8 * on}
                y={cy - 8 * on}
                width={16 * on}
                height={16 * on}
                fill={NIGHT.deep}
                stroke={NIGHT.violet}
                strokeWidth={2}
                transform={`rotate(45 ${cx} ${cy})`}
              />
            ))}
          </g>
        );
      })}

      {/* ---- the path itself: finished segments whole, the current one split at t */}
      {filled > 0 ? <path d={fullD} fill={NIGHT.cyan} fillOpacity={0.22 * filled * (1 - stickerPop * 0.8)} /> : null}
      {segs.map((s, i) =>
        s.t > 0 ? (
          <path
            key={`s${i}`}
            d={
              s.t >= 1
                ? `M ${s.p0[0]} ${s.p0[1]} C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.p3[0]} ${s.p3[1]}`
                : partial(s)
            }
            fill="none"
            stroke={NIGHT.cyan}
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#glow)"
            opacity={1 - stickerPop * 0.6}
          />
        ) : null,
      )}

      {/* anchors */}
      {[segs[0].p0, ...segs.map((s) => s.p3)].map(([ax, ay], i) => {
        const on = i === 0 ? pop(f, 30, 14) : pop(f, SEG_AT(i - 1) + SEG_LEN - 4, 14);
        return on > 0 ? (
          <circle key={`a${i}`} cx={ax} cy={ay} r={9 * on} fill="#fff" filter="url(#glow)" opacity={1 - filled * 0.7} />
        ) : null;
      })}

      {/* the pen tip */}
      {tip ? <Sparkle x={tip[0]} y={tip[1]} r={18} rotate={f * 4} glow /> : null}

      {/* ---- payoff: the outline pops off the blueprint as a sticker */}
      <Sticker x={art.cx} y={art.cy} size={art.size * 1.02} night scale={stickerPop} rotate={-4 + Math.sin(f / 30) * 2}>
        <HeartArt />
      </Sticker>
      {Array.from({ length: 10 }, (_, i) => {
        const life = clamp((f - POP) / 30);
        if (f < POP || life >= 1) return null;
        const a = (i / 10) * Math.PI * 2;
        const d = art.size * 0.42 + easeOutCubic(life) * 110;
        return (
          <Sparkle
            key={`b${i}`}
            x={art.cx + Math.cos(a) * d}
            y={art.cy + Math.sin(a) * d}
            r={(i % 2 ? 12 : 20) * (1 - life)}
            rotate={i * 20}
            glow
          />
        );
      })}
      {/* label under the sticker */}
      <g
        opacity={stickerPop > 0.5 ? 1 : 0}
        transform={`translate(${art.cx} ${art.cy + art.size * 0.5 + 44}) scale(${easeOutBack(clamp((f - POP - 6) / 16), 2)})`}
      >
        <text textAnchor="middle" fontFamily={SANS} fontWeight={600} fontSize={tall ? 34 : 28} fill={NIGHT.text}>
          drawn, not exported
        </text>
      </g>
    </Stage>
  );
};
