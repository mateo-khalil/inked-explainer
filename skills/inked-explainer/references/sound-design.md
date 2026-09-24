# Sound design

Everything is **synthesised** by `template/scripts/make-audio.mjs` — zero dependencies,
no samples, nothing licensed, identical run to run. It writes:

- `public/music-<cut>.wav` — one bed per cut in `timeline.ts`'s `CUTS`.
- `public/sfx/<name>.wav` — every sound in `sfx.ts`'s vocabulary.

Run it (`npm run assets`) after **any** change to `timeline.ts`: the music is arranged
from the chapters' grounds and bar lines, so it only stays in sync if it is regenerated.

## The bed

C major, I – V – vi – IV, one chord per bar, 150 BPM (whatever `timeline.ts` says):

| Layer | Paper chapters | Night chapters |
| --- | --- | --- |
| Lead | marimba 8th-note arpeggios (fundamental + the bar's ~3.93× partial + a mallet tick) | glassy bells (1, 2.76, 5.4, 8.93× partials), sparser, more reverb |
| Pad | quiet | warmer and louder |
| Rhythm | kick on 1 and 3 (+ an off-beat ghost), snap on 2 and 4, swung 16th shaker | the same, lighter |
| Ambience | a filtered breeze, a few synthesised birds under the first paper chapter | a low 55/110/165 Hz hum, faint high twinkles |

Every cut gets an **air swell** (band-passed noise rising for ~0.4 s into the bar line)
and a **light cymbal** on the downbeat. The first bar is an intro (no kick until beat 3).
The last chapter resolves, counted from its last bar: … C, G, F, **C held** — with a bell
motif and a big pad under it, and a fade over the last ~0.6 bar.

Everything goes through a small Freeverb (8 combs + 4 allpasses per channel) on a send,
then a soft `tanh` clip, normalised to −3 dBFS.

## The SFX vocabulary

`tick` · `type` (a burst trimmed to the title's length) · `pop` · `pop-hi` · `boop` ·
`chime` · `sparkle` · `whoosh` · `swish` · `paper` · `thud` · `stamp` · `click` · `buzz`
(one haptic pulse) · `riser` · `notif` · `coin` · `heart` · `note-0`…`note-7` (a
pentatonic marimba, low → high, for things landing in sequence).

Rules of placement:

- A sound marks **an arrival or an action**, never decoration. One accent per event.
- Sequences go **up the scale**: four cards landing = `note(1)…note(4)`.
- Ramps get louder: a haptic ramp's `buzz` volumes rise pulse by pulse.
- A cue is exported by the scene, in the scene's **local** frames:
  `export const cues: Cue[] = [{ at: 88, sfx: "chime", volume: 0.5 }]`. A scene whose
  sound depends on the cut (an end card's recap) exports a function of the cut.
- The title's typing burst is added by `Film.tsx` for every chapter.

## Mix and loudness

- Music at **0.85**, every SFX at **0.72 ×** what its scene asks for, the typing at
  **0.24** (`Film.tsx`). Effects ~3 dB under the ask keeps a busy chapter from burying
  the bed.
- Target **≈ −16 LUFS integrated, ≤ −1.5 dBFS true peak** — platforms normalise to around
  −14; a peak at 0 clips after their re-encode.

Measure, don't guess — an audio-only render is fast:

```bash
npx remotion render InkedFilm out/mix.mp3 --codec=mp3
ffmpeg -hide_banner -nostats -i out/mix.mp3 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
```

Compare the **spectral balance** with a reference you like, band by band:

```bash
for band in "lowpass=f=120" "highpass=f=120,lowpass=f=500" "highpass=f=500,lowpass=f=2000" \
            "highpass=f=2000,lowpass=f=6000" "highpass=f=6000"; do
  ffmpeg -hide_banner -nostats -i out/film.mp4 -af "$band,volumedetect" -f null - 2>&1 | grep mean_volume
done
```

If 0.5–6 kHz runs several dB hotter than the reference, the effects are too loud — lower
`SFX_GAIN`, don't thin the cues.
