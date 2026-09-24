# inked explainer — template

A working Remotion 4 project for a hand-inked explainer film. Copy this folder to start a new video.

```bash
npm install
npm run assets          # textures + music + sound effects (zero-dependency Node scripts)
npm run studio          # scrub InkedFilm / InkedFilmVertical
npm run render          # out/film.mp4
npm run render:vertical # out/film-vertical.mp4
npm run typecheck
```

- `src/film/timeline.ts` — the clock: BPM, chapters (whole bars), cuts. Re-run `npm run assets` after changing it.
- `src/film/scenes/` — one file per chapter, each responsive (16:9 and 9:16 from the same code), each exporting its sound `cues`.
- `src/film/kit/` — `Stage`, grounds, HUD, `Sticker`, chips, tags, sparkles, dashed paths, shared SVG filters.
- `scripts/textures.mjs`, `scripts/make-audio.mjs` — every bitmap and every sound, generated.

The skill that explains the style and the workflow is `../SKILL.md` and `../references/`.
