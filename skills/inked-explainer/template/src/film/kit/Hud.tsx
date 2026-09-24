import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { clamp, easeOutCubic, prog, typed } from "../motion";
import { NIGHT, PAPER, SANS } from "../palette";
import type { Chapter } from "../timeline";
import { useCut } from "./Cut";

/**
 * The heads-up layer the reference keeps on every chapter: a lowercase title
 * typed in at the top-left with a short underline, and a progress dial at the
 * top-right captioned with the stage. It sits outside the camera, so it never
 * zooms with the world.
 *
 * Two layouts. Landscape is the reference's. Portrait sets the title larger
 * (it is read on a phone held upright), lets it wrap, and keeps both pieces
 * inside the central 886 px so the App Store's 886×1920 crop loses nothing.
 */

type Layout = {
  titleLeft: number;
  titleTop: number;
  titleSize: number;
  titleLine: number;
  titleWidth: number;
  dialX: number;
  dialY: number;
  dialR: number;
  labelSize: number;
};

const WIDE: Layout = {
  titleLeft: 110,
  titleTop: 70,
  titleSize: 38,
  titleLine: 48,
  titleWidth: 1400,
  dialX: 1768,
  dialY: 112,
  dialR: 40,
  labelSize: 24,
};

const TALL: Layout = {
  titleLeft: 130,
  titleTop: 150,
  titleSize: 58,
  titleLine: 68,
  titleWidth: 650,
  dialX: 902,
  dialY: 192,
  dialR: 44,
  labelSize: 28,
};

export const Hud: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height } = useVideoConfig();
  const layout = height > width ? TALL : WIDE;
  const { chapters, total } = useCut();
  const chapter = chapters.find((c) => frame >= c.from && frame < c.from + c.duration) ?? chapters[chapters.length - 1];
  const local = frame - chapter.from;
  // The end card's title is the wordmark itself; only the dial stays, closing its ring.
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {chapter.id === "end" ? null : <Title chapter={chapter} local={local} layout={layout} />}
      <Dial chapter={chapter} frame={frame} local={local} total={total} layout={layout} width={width} />
    </AbsoluteFill>
  );
};

const Title: React.FC<{ chapter: Chapter; local: number; layout: Layout }> = ({ chapter, local, layout }) => {
  const night = chapter.ground === "night";
  const text = typed(chapter.title, local, 3, 34);
  const colour = night ? NIGHT.text : PAPER.ink;
  // The underline grows under the opening word(s), like the reference.
  const words = chapter.title.split(" ");
  const lead = words[0].length < 4 && words.length > 1 ? `${words[0]} ${words[1]}` : words[0];
  const perChar = layout.titleSize * 0.53;
  const lineTarget = Math.min(perChar * 14, Math.max(perChar * 4.5, lead.length * perChar + 10));
  const line = lineTarget * prog(local, 8, 26, easeOutCubic);
  const caretOn = text.length < chapter.title.length || Math.floor(local / 18) % 2 === 0;
  const caret = local < 70 && caretOn;
  return (
    <div
      style={{
        position: "absolute",
        left: layout.titleLeft,
        top: layout.titleTop,
        width: layout.titleWidth,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: layout.titleSize,
          letterSpacing: -0.4,
          color: colour,
          whiteSpace: "pre-wrap",
          lineHeight: `${layout.titleLine}px`,
          textShadow: night ? "0 0 18px rgba(170,190,255,0.35)" : "none",
        }}
      >
        {text}
        <span style={{ opacity: caret ? 0.8 : 0, marginLeft: 2, fontWeight: 400 }}>|</span>
      </div>
      <div
        style={{
          marginTop: layout.titleSize * 0.16,
          height: layout.titleSize > 40 ? 6 : 4,
          width: line,
          borderRadius: 3,
          background: night ? NIGHT.text : PAPER.ink,
          opacity: 0.9,
          boxShadow: night ? "0 0 12px rgba(200,210,255,0.7)" : "none",
        }}
      />
    </div>
  );
};

const Dial: React.FC<{
  chapter: Chapter;
  frame: number;
  local: number;
  total: number;
  layout: Layout;
  width: number;
}> = ({ chapter, frame, local, total, layout, width }) => {
  const night = chapter.ground === "night";
  const { dialX: cx, dialY: cy, dialR: r } = layout;
  const progress = clamp(frame / total);
  const a0 = -Math.PI / 2;
  const a1 = a0 + progress * Math.PI * 2;
  const large = progress > 0.5 ? 1 : 0;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const stroke = night ? NIGHT.text : PAPER.ink;
  const pulse = 1 + 0.12 * Math.max(0, 1 - local / 14);
  const sq = r * 0.225;
  return (
    <>
      <svg width={width} height={cy + r + 80} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke={stroke} strokeOpacity={0.12} strokeWidth={1.4} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeOpacity={0.16} strokeWidth={5} />
        {progress > 0.002 ? (
          <path
            d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.92}
            strokeWidth={5}
            strokeLinecap="round"
            style={{
              filter: night ? "drop-shadow(0 0 6px rgba(200,210,255,0.8))" : "none",
            }}
          />
        ) : null}
        <circle cx={x1} cy={y1} r={3.4} fill={night ? "#fff" : PAPER.white} stroke={stroke} strokeWidth={1.2} />
        <rect
          x={cx - sq * pulse}
          y={cy - sq * pulse}
          width={sq * 2 * pulse}
          height={sq * 2 * pulse}
          rx={sq / 2}
          fill={night ? NIGHT.coral : PAPER.red}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: cx - 150,
          width: 300,
          top: cy + r + 18,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: layout.labelSize,
          color: night ? NIGHT.textDim : PAPER.inkSoft,
          letterSpacing: 0.2,
        }}
      >
        {chapter.stage}
      </div>
    </>
  );
};
