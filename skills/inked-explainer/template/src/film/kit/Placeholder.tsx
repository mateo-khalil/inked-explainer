import React from "react";
import { useVideoConfig } from "remotion";
import { MONO, NIGHT, PAPER } from "../palette";
import type { Chapter } from "../timeline";

/** Stand-in for a chapter that has not been drawn yet. */
export const Placeholder: React.FC<{ chapter: Chapter }> = ({ chapter }) => {
  const { width, height } = useVideoConfig();
  return (
    <text
      x={width / 2}
      y={height / 2}
      textAnchor="middle"
      fontFamily={MONO}
      fontSize={40}
      fill={chapter.ground === "night" ? NIGHT.textDim : PAPER.inkSoft}
    >
      [{chapter.id}]
    </text>
  );
};
