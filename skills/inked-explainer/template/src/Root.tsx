import { Composition } from "remotion";
import { Film, type FilmProps } from "./film/Film";
import { chaptersOf, CUTS, FPS, HEIGHT, totalOf, WIDTH, type Cut } from "./film/timeline";

/**
 * Two compositions of the same film:
 *
 *   InkedFilm          1920×1080 @ 60 — landscape (X, YouTube, a website)
 *   InkedFilmVertical  1080×1920 @ 60 — portrait (Reels / TikTok / Shorts)
 *
 * Every scene reads the frame size, so both render from the same files.
 * Add a composition per extra cut in `timeline.ts`'s CUTS.
 */
const duration = (cut: Cut) => totalOf(chaptersOf(CUTS[cut]));

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="InkedFilm"
      component={Film}
      durationInFrames={duration("full")}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ mute: false, cut: "full" } satisfies FilmProps}
    />
    <Composition
      id="InkedFilmVertical"
      component={Film}
      durationInFrames={duration("full")}
      fps={FPS}
      width={HEIGHT}
      height={WIDTH}
      defaultProps={{ mute: false, cut: "full" } satisfies FilmProps}
    />
  </>
);
