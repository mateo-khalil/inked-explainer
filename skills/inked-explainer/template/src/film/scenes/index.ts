import type { Registry } from "../Film";
import * as Beats from "./Beats";
import * as Code from "./Code";
import * as End from "./End";
import * as Sound from "./Sound";

/**
 * Chapter id → its drawing and its sound cues. One file per chapter; each is
 * written responsively (positions derived from the frame size) so the same
 * file serves the 16:9 and the 9:16 composition.
 */
export const SCENES: Registry = {
  beats: { Scene: Beats.Beats, cues: Beats.cues },
  code: { Scene: Code.Code, cues: Code.cues },
  sound: { Scene: Sound.Sound, cues: Sound.cues },
  end: { Scene: End.End, cues: End.cues },
};
