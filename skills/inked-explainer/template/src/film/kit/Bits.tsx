import React, { useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import { sparklePath } from "../motion";
import { MONO, NIGHT, PAPER, SANS } from "../palette";

/**
 * Small reusable drawings. Everything is SVG in world px; pass the local frame
 * in where something idles.
 */

/**
 * An SVG <image> that holds the render until its bitmap has loaded. Remotion
 * waits for its own <Img>, but not for an SVG <image> — without this a sticker
 * can be captured blank on the first frame it appears.
 */
export const SvgImage: React.FC<React.SVGProps<SVGImageElement> & { href: string }> = ({ href, ...rest }) => {
  const [handle] = useState(() => delayRender(`svg image ${href}`, { timeoutInMilliseconds: 60000 }));
  return (
    <image
      href={href}
      onLoad={() => continueRender(handle)}
      onError={() => continueRender(handle)}
      preserveAspectRatio="xMidYMid meet"
      {...rest}
    />
  );
};

/**
 * Anything as a die-cut sticker: white border, ink line, drop shadow (or, on
 * the blueprint, a white border and a glow). Two sources:
 *
 *   src       a picture in `public/` (`"art/logo.png"`) — square works best
 *   children  vector art drawn in a `box`×`box` local square centred on 0,0
 *
 * `size` is the sticker's box in px and (x, y) its centre. Both sources are
 * scaled into the 512-unit box the #sticker filter is tuned for, so the
 * border is the same weight whatever the art is.
 */
export const Sticker: React.FC<{
  src?: string;
  children?: React.ReactNode;
  box?: number;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  opacity?: number;
  night?: boolean;
  scale?: number;
}> = ({ src, children, box = 100, x, y, size, rotate = 0, opacity = 1, night = false, scale = 1 }) => {
  if (scale <= 0.001 || opacity <= 0.001) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${(size / 512) * scale})`} opacity={opacity}>
      <g filter={night ? "url(#sticker-night)" : "url(#sticker)"}>
        {src ? (
          <SvgImage href={staticFile(src)} x={-256} y={-256} width={512} height={512} />
        ) : (
          <g transform={`scale(${512 / box})`}>{children}</g>
        )}
      </g>
    </g>
  );
};

/** Four-point sparkle. `glow` adds a halo (for the blueprint). */
export const Sparkle: React.FC<{
  x: number;
  y: number;
  r: number;
  rotate?: number;
  fill?: string;
  opacity?: number;
  glow?: boolean;
  stroke?: string;
}> = ({ x, y, r, rotate = 0, fill = "#fff", opacity = 1, glow = false, stroke }) => {
  if (r <= 0.01 || opacity <= 0.001) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={opacity}>
      {glow ? <circle r={r * 1.1} fill="url(#spark-core)" opacity={0.55} /> : null}
      <path
        d={sparklePath(r)}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? Math.max(1.4, r * 0.08) : undefined}
        strokeLinejoin="round"
        filter={glow ? "url(#glow)" : undefined}
      />
    </g>
  );
};

/** A puffy paper cloud, ink-outlined. */
export const Cloud: React.FC<{ x: number; y: number; w?: number; opacity?: number }> = ({
  x,
  y,
  w = 150,
  opacity = 1,
}) => {
  const s = w / 150;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <path
        d="M -62 18 C -84 18 -86 -8 -64 -10 C -66 -32 -36 -40 -24 -24 C -16 -46 22 -46 28 -22 C 44 -34 70 -22 62 -2 C 84 0 80 20 60 20 Z"
        fill={PAPER.white}
        stroke={PAPER.ink}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <path
        d="M -50 14 C -30 16 20 16 52 14"
        stroke={PAPER.ink}
        strokeOpacity={0.14}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

/**
 * A monospace chip, blueprint style: dark fill, pale line, optional colour tab
 * on the left. Its width is estimated from the character count (monospace, so
 * the estimate holds).
 */
export const Chip: React.FC<{
  x: number;
  y: number;
  text: string;
  tab?: string;
  size?: number;
  opacity?: number;
  scale?: number;
  bright?: boolean;
  anchor?: "start" | "middle";
}> = ({ x, y, text, tab, size = 24, opacity = 1, scale = 1, bright = false, anchor = "middle" }) => {
  if (opacity <= 0.001 || scale <= 0.001) return null;
  const charW = size * 0.6;
  const padX = size * 0.62;
  const w = text.length * charW + padX * 2 + (tab ? size * 0.5 : 0);
  const h = size * 1.62;
  const left = anchor === "middle" ? -w / 2 : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect
        x={left}
        y={-h / 2}
        width={w}
        height={h}
        rx={h / 2}
        fill={NIGHT.chip}
        stroke={bright ? "#ffffff" : NIGHT.line}
        strokeOpacity={bright ? 0.95 : 0.7}
        strokeWidth={1.6}
      />
      <rect
        x={left + 3}
        y={-h / 2 + 3}
        width={w - 6}
        height={h - 6}
        rx={(h - 6) / 2}
        fill="none"
        stroke={NIGHT.line}
        strokeOpacity={0.18}
      />
      {tab ? (
        <rect x={left + size * 0.5} y={-h * 0.28} width={size * 0.2} height={h * 0.56} rx={size * 0.1} fill={tab} />
      ) : null}
      <text
        x={left + padX + (tab ? size * 0.5 : 0)}
        y={size * 0.36}
        fontFamily={MONO}
        fontSize={size}
        fontWeight={500}
        fill={bright ? "#ffffff" : NIGHT.text}
      >
        {text}
      </text>
    </g>
  );
};

/**
 * A paper tag: a small white card with an ink outline and a label. Width is
 * estimated from the character count — use `mono` for long labels, where the
 * estimate is exact.
 */
export const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  fill?: string;
  color?: string;
  opacity?: number;
  scale?: number;
  rotate?: number;
  mono?: boolean;
  weight?: number;
}> = ({
  x,
  y,
  text,
  size = 24,
  fill = PAPER.white,
  color = PAPER.ink,
  opacity = 1,
  scale = 1,
  rotate = 0,
  mono = false,
  weight = 600,
}) => {
  if (opacity <= 0.001 || scale <= 0.001) return null;
  const charW = size * (mono ? 0.6 : 0.56);
  const w = text.length * charW + size * 1.2;
  const h = size * 1.7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      <rect x={-w / 2 + 3} y={-h / 2 + 5} width={w} height={h} rx={10} fill={PAPER.ink} fillOpacity={0.16} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={fill} stroke={PAPER.ink} strokeWidth={3} />
      <text
        x={0}
        y={size * 0.36}
        textAnchor="middle"
        fontFamily={mono ? MONO : SANS}
        fontWeight={weight}
        fontSize={size}
        fill={color}
      >
        {text}
      </text>
    </g>
  );
};

/**
 * A dashed path drawn on progressively (0..1), optionally with marching
 * dashes. The draw-on is a mask whose id is a hash of `d` — two DashPaths with
 * the same `d` share one mask, so give them the same `length` too.
 */
export const DashPath: React.FC<{
  d: string;
  length: number;
  progress: number;
  stroke: string;
  width?: number;
  dash?: [number, number];
  opacity?: number;
  march?: number;
  glow?: boolean;
}> = ({ d, length, progress, stroke, width = 2, dash = [8, 10], opacity = 1, march = 0, glow = false }) => {
  if (progress <= 0) return null;
  let h = 0;
  for (let i = 0; i < d.length; i += 1) h = (Math.imul(h, 31) + d.charCodeAt(i)) | 0;
  const maskId = `dp-${(h >>> 0).toString(36)}`;
  return (
    <g opacity={opacity}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={8000} height={8000}>
          <path
            d={d}
            fill="none"
            stroke="#fff"
            strokeWidth={width + 8}
            strokeDasharray={`${length * progress} ${length}`}
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={`${dash[0]} ${dash[1]}`}
        strokeDashoffset={-march}
        strokeLinecap="round"
        mask={`url(#${maskId})`}
        filter={glow ? "url(#glow)" : undefined}
      />
    </g>
  );
};

/** Pencil construction marks for paper scenes: a faint compass circle and, optionally, a ticked baseline. */
export const Pencil: React.FC<{
  cx: number;
  cy: number;
  r: number;
  baseline?: number;
  from?: number;
  to?: number;
}> = ({ cx, cy, r, baseline, from = 160, to = 1760 }) => (
  <g fill="none" stroke={PAPER.ink} strokeOpacity={0.12} strokeWidth={1.4}>
    <circle cx={cx} cy={cy} r={r} />
    <circle cx={cx} cy={cy} r={r * 1.45} strokeDasharray="3 12" />
    <path d={`M ${cx - 14} ${cy} H ${cx + 14} M ${cx} ${cy - 14} V ${cy + 14}`} />
    {baseline !== undefined ? (
      <>
        <path d={`M ${from} ${baseline} H ${to}`} />
        {Array.from({ length: Math.floor((to - from) / 40) + 1 }, (_, i) => (
          <path key={i} d={`M ${from + i * 40} ${baseline} v ${i % 5 === 0 ? 12 : 6}`} />
        ))}
      </>
    ) : null}
  </g>
);

/* ---------------------------------------------------------------- vector sticker art
 * Small pictures drawn in a 100×100 box centred on 0,0 — the demo's stickers,
 * and a starting point for your own. Pass one as `Sticker`'s children.
 */

export const StarArt: React.FC<{ fill?: string }> = ({ fill = PAPER.yellow }) => (
  <g>
    <path
      d="M 0 -42 L 12 -13 L 43 -12 L 19 8 L 27 39 L 0 22 L -27 39 L -19 8 L -43 -12 L -12 -13 Z"
      fill={fill}
      stroke={PAPER.ink}
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <path d="M -6 -20 L 0 -34" stroke="#fff" strokeOpacity={0.7} strokeWidth={4} strokeLinecap="round" />
  </g>
);

export const HeartArt: React.FC<{ fill?: string }> = ({ fill = "#ff7aa2" }) => (
  <g>
    <path
      d="M 0 38 C -40 12 -46 -12 -30 -28 C -18 -40 -4 -34 0 -20 C 4 -34 18 -40 30 -28 C 46 -12 40 12 0 38 Z"
      fill={fill}
      stroke={PAPER.ink}
      strokeWidth={4}
      strokeLinejoin="round"
    />
    <ellipse cx={-18} cy={-18} rx={8} ry={5} fill="#fff" fillOpacity={0.6} transform="rotate(-35 -18 -18)" />
  </g>
);

export const BoltArt: React.FC<{ fill?: string }> = ({ fill = "#ffd24a" }) => (
  <path
    d="M 8 -44 L -26 6 L -2 6 L -12 44 L 26 -8 L 2 -8 Z"
    fill={fill}
    stroke={PAPER.ink}
    strokeWidth={4}
    strokeLinejoin="round"
  />
);

export const NoteArt: React.FC<{ fill?: string }> = ({ fill = "#8fd0ff" }) => (
  <g stroke={PAPER.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
    <path d="M -14 26 V -30 L 28 -40 V 16" fill="none" />
    <path d="M -14 -30 L 28 -40 V -26 L -14 -16 Z" fill={fill} />
    <ellipse cx={-24} cy={28} rx={13} ry={10} fill={fill} transform="rotate(-20 -24 28)" />
    <ellipse cx={18} cy={18} rx={13} ry={10} fill={fill} transform="rotate(-20 18 18)" />
  </g>
);

export const SunArt: React.FC<{ fill?: string }> = ({ fill = "#ffb347" }) => (
  <g stroke={PAPER.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
    {Array.from({ length: 8 }, (_, i) => (
      <path key={i} d="M 0 -30 L 0 -44" transform={`rotate(${i * 45})`} />
    ))}
    <circle r={24} fill={fill} />
    <path d="M -9 -2 q 3 -4 6 0 M 3 -2 q 3 -4 6 0 M -8 8 q 8 7 16 0" fill="none" strokeWidth={3} />
  </g>
);

export const LeafArt: React.FC<{ fill?: string }> = ({ fill = "#7fc57a" }) => (
  <g stroke={PAPER.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round">
    <path d="M -34 34 C -40 -10 -6 -40 38 -38 C 40 6 8 40 -34 34 Z" fill={fill} />
    <path d="M -34 34 C -10 10 8 -8 26 -26" fill="none" strokeWidth={3} />
  </g>
);
