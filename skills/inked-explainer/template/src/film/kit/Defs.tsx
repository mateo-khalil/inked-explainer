import React from "react";
import { NIGHT, PAPER } from "../palette";

/**
 * Every filter, pattern and gradient the film shares, defined once in a
 * zero-size <svg> at the root. SVG ids are document-global, so any scene's
 * <svg> can say `filter="url(#ink)"` without redefining it.
 *
 *   #ink          the hand-inked wobble — a low-frequency displacement that
 *                 bends straight lines just enough to read as drawn. `boil`
 *                 re-seeds it a few times a second, the way a hand-drawn
 *                 line never sits perfectly still.
 *   #sticker      a die-cut sticker: hardened alpha → white border → thin ink
 *                 line → soft drop shadow. Tuned for a 512-unit box —
 *                 `Sticker` scales any picture or vector art into one.
 *   #paper-shadow a soft contact shadow for things lying on the paper.
 *   #glow / #glow-strong   the blueprint scenes' light.
 *   #crosshatch   a two-way mesh for nets, baskets, fabric.
 *   #hatch        pencil shading for paper objects.
 */
export const GlobalDefs: React.FC<{ frame: number }> = ({ frame }) => {
  // Re-seed at 8 fps. Low amplitude: this should never be noticed as motion.
  const boilSeed = 1 + (Math.floor(frame / 7.5) % 6);
  return (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={2} seed={boilSeed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="ink-still" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.2} xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="sticker" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          {/* Harden the soft edges (smoke, sparkles) so the border follows the body, not the haze. */}
          <feComponentTransfer in="SourceAlpha" result="hard">
            <feFuncA type="linear" slope={5} intercept={-1.2} />
          </feComponentTransfer>
          <feMorphology in="hard" operator="dilate" radius={15} result="white-a" />
          <feMorphology in="hard" operator="dilate" radius={19} result="ink-a" />
          <feGaussianBlur in="ink-a" stdDeviation={9} result="sh-blur" />
          <feOffset in="sh-blur" dx={4} dy={12} result="sh-off" />
          <feFlood floodColor="#3b2a1f" floodOpacity={0.28} />
          <feComposite in2="sh-off" operator="in" result="shadow" />
          <feFlood floodColor={PAPER.ink} />
          <feComposite in2="ink-a" operator="in" result="ink" />
          <feFlood floodColor={PAPER.white} />
          <feComposite in2="white-a" operator="in" result="white" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="ink" />
            <feMergeNode in="white" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* The same die-cut, glowing instead of shadowed, for the blueprint scenes. */}
        <filter id="sticker-night" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceAlpha" result="hard">
            <feFuncA type="linear" slope={5} intercept={-1.2} />
          </feComponentTransfer>
          <feMorphology in="hard" operator="dilate" radius={14} result="white-a" />
          <feMorphology in="hard" operator="dilate" radius={17} result="line-a" />
          <feGaussianBlur in="line-a" stdDeviation={16} result="g" />
          <feFlood floodColor={NIGHT.cyan} floodOpacity={0.55} />
          <feComposite in2="g" operator="in" result="glow" />
          <feFlood floodColor={NIGHT.line} />
          <feComposite in2="line-a" operator="in" result="line" />
          <feFlood floodColor="#f4f6ff" />
          <feComposite in2="white-a" operator="in" result="white" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="line" />
            <feMergeNode in="white" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={7} result="b" />
          <feOffset in="b" dx={3} dy={9} result="o" />
          <feFlood floodColor="#3b2a1f" floodOpacity={0.2} />
          <feComposite in2="o" operator="in" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={4} result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={6} result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={22} result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="blur-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={10} />
        </filter>

        <pattern id="crosshatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={7} height={7} fill={PAPER.white} fillOpacity={0.35} />
          <path d="M0 0 V7 M0 0 H7" stroke={PAPER.ink} strokeOpacity={0.55} strokeWidth={1.2} />
        </pattern>

        <pattern id="hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <path d="M0 0 V9" stroke={PAPER.ink} strokeWidth={1.2} strokeOpacity={0.22} />
        </pattern>

        <pattern id="hatch-night" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <path d="M0 0 V8" stroke={NIGHT.line} strokeWidth={1} strokeOpacity={0.18} />
        </pattern>

        <radialGradient id="spark-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity={0.9} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
    </svg>
  );
};
