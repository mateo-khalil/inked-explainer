# QA checklist

A film is checked by **looking at frames**, not by reading the code and imagining them.

## Stills and contact sheets

```bash
npx remotion bundle --out-dir out/bundle            # bundle once, render many stills fast
npx remotion still out/bundle InkedFilm out/s/code_120.png --frame=312 --props='{"mute":true}' --scale=0.5
```

- `--props='{"mute":true}'` skips the soundtrack (audio files are not needed for a still).
- Frames are **global**: a chapter's local frame + its `from` (print them from
  `chaptersOf(CUTS.full)`).
- Render 3–6 stills per chapter (establish, action, payoff, the last frame) in parallel
  and tile them into one sheet with PIL, then read the sheet:

```python
from PIL import Image
ims = [Image.open(p).convert("RGB") for p in paths]
w, h = ims[0].size; cols = 3 if w > h else len(ims)
sheet = Image.new("RGB", (cols * (w + 6), ((len(ims) + cols - 1) // cols) * (h + 6)), "white")
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
sheet.save("out/sheet.png")
```

- **Every cut**: the last frame of chapter *n* and frames +3 of chapter *n+1* side by side.

## What to look for

- **Overlaps**: a label on a sticker, a tag on the dial caption, text under the title.
- **Empty bands**: a portrait frame with content only in the middle third.
- **Off-crop content** on a store cut (draw the 97/983 guides on the sheet).
- **Illegible text** at phone size (scale your sheet to phone width and read it).
- **Aim**: does the swing actually hit? Check the contact frame, not only the pose after.
- **Zeros and placeholders** visible mid-animation (a counter showing 0 before it counts).
- **Seams**: a drifting background that opens a line at the frame edge.

## Traps that cost a render

- An SVG `<image>` is **not** awaited by Remotion — wrap it (`SvgImage` does
  `delayRender`/`continueRender` on load) or the first frame it appears can be blank.
- `DashPath` masks are named from a hash of `d`; two with the same `d` share one mask —
  give them the same `length`.
- In **zsh**, `set -- $pair` does not word-split an unquoted variable; batch loops that
  build `name frame` pairs silently render the wrong frames. Write batch scripts in bash.
- Parallel `remotion still` on a fresh install race to download headless Chrome — run
  `npx remotion browser ensure` once first.
- CSS transitions/animations never render; everything must be a function of the frame.
- Text inside the `#ink` layer wobbles; put it in `crisp`.

## Sound

- Audio-only render + `ebur128` (see `sound-design.md`): ≈ −16 LUFS, ≤ −1.5 dBFS peak.
- Band balance against a reference with `volumedetect`.
- After any retime: `npm run assets` again, or the music drifts off the cuts.

## Silence is not success

A background render that "finished" may have failed: read its log's tail, check the exit,
`ffprobe` the output (duration, resolution, fps, an audio stream), and pull frames from
the **file** at every cut before calling it done.
