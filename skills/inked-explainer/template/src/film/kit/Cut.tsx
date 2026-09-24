import React, { useContext } from "react";
import { CHAPTERS, TOTAL_FRAMES, type Chapter, type Cut } from "../timeline";

/**
 * Which cut is rendering — its chapters laid end to end and its length. The
 * HUD's dial and the end card's stage recap read it, so a shorter cut (say a
 * 30-second App Store preview) counts and recaps only what it actually shows.
 */
export type CutInfo = { cut: Cut; chapters: Chapter[]; total: number };

export const CutContext = React.createContext<CutInfo>({
  cut: "full",
  chapters: CHAPTERS,
  total: TOTAL_FRAMES,
});

export const useCut = () => useContext(CutContext);

/** The distinct stages a cut walks through, in order ("plan", "draw", …). */
export const stagesOf = (chapters: Chapter[]) => [
  ...new Set(chapters.filter((c) => c.id !== "end").map((c) => c.stage.split(" · ")[1])),
];
