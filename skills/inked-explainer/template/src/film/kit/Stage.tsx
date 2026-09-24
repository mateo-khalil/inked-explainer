import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOutSine, noise, prog } from "../motion";
import type { Chapter } from "../timeline";
import { NightGround, PaperGround, PaperTexture } from "./Ground";

export type CameraSpec = {
  /** Zoom at the start and end of the chapter (1 = the 1920×1080 world fills the frame). */
  from?: number;
  to?: number;
  /** The point the camera looks at, start → end, in world px. */
  focus?: [number, number];
  focusTo?: [number, number];
  /** Hand-held drift amplitude in px. */
  drift?: number;
};

/** A camera keyed by hand: zoom and the world point at the centre of the frame, per local frame. */
export type CameraFn = (frame: number) => {
  zoom: number;
  focus: [number, number];
};

export type SceneProps = { chapter: Chapter };

/**
 * One chapter's frame. Lays down the ground, then an <svg> with the world in
 * two layers under the same camera:
 *
 *   children  the drawing — run through the #ink wobble so it reads as inked
 *   crisp     text and anything that must stay sharp — same camera, no wobble
 *
 * and, on paper, the paper texture multiplied over the lot. The HUD (title,
 * dial) and grain live above this in `Film.tsx`, outside the camera.
 */
export const Stage: React.FC<{
  chapter: Chapter;
  camera?: CameraSpec | CameraFn;
  /** Drawn under the wobble layer without the filter (large fills, glows). */
  under?: React.ReactNode;
  children?: React.ReactNode;
  crisp?: React.ReactNode;
  /** Night ground's lifted centre, in % of the frame. */
  nightCentre?: [number, number];
  /** Skip the wobble filter (for layers that are all photos or glow). */
  still?: boolean;
}> = ({ chapter, camera = {}, under, children, crisp, nightCentre, still }) => {
  const frame = useCurrentFrame();
  // The world is the composition's own size: 1920×1080 for the film, 1080×1920 vertical.
  const { width: WIDTH, height: HEIGHT } = useVideoConfig();
  let zoom: number;
  let fx: number;
  let fy: number;
  if (typeof camera === "function") {
    const c = camera(frame);
    zoom = c.zoom;
    fx = c.focus[0] + noise(frame / 70, 11) * 2.5;
    fy = c.focus[1] + noise(frame / 80, 23) * 2.5;
  } else {
    const { from = 1, to = 1.035, focus = [WIDTH / 2, HEIGHT / 2], focusTo, drift = 3 } = camera;
    const t = prog(frame, 0, chapter.duration, easeInOutSine);
    zoom = from + (to - from) * t;
    fx = focus[0] + ((focusTo ?? focus)[0] - focus[0]) * t + noise(frame / 70, 11) * drift;
    fy = focus[1] + ((focusTo ?? focus)[1] - focus[1]) * t + noise(frame / 80, 23) * drift;
  }
  const transform = `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-fx} ${-fy})`;

  return (
    <AbsoluteFill>
      {chapter.ground === "paper" ? (
        <PaperGround frame={frame} stripe={chapter.stripe ?? "#c9dadd"} />
      ) : (
        <NightGround frame={frame} centre={nightCentre} />
      )}
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <g transform={transform}>
          {under}
          <g filter={still ? undefined : "url(#ink)"}>{children}</g>
          {crisp}
        </g>
      </svg>
      {chapter.ground === "paper" ? <PaperTexture /> : null}
    </AbsoluteFill>
  );
};
