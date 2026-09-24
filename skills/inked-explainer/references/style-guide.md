# Style guide

The look is **printed paper and a drafting table**, alternating. Everything below is
implemented in `template/src/film/kit/` — this file says what each piece is *for*, so
you can bend it without losing it.

## Two grounds

| | Paper | Night (blueprint) |
| --- | --- | --- |
| Base | cream `#f4ead3` with wide pastel diagonal stripes (`STRIPES`, one colour per chapter, ~118 px bands at 36°, drifting ~0.3 px/frame) | radial navy: `#1d2560` lifted centre → `#141a45` → `#0a0d27` |
| Texture | `paper.png` **multiplied** over everything: mottling, fibres, specks, tooth, a baked edge vignette | `night.png` **screened** at ~22%: soft mottling + dust motes |
| Structure | pencil construction marks (`Pencil`): a faint compass circle, a ticked baseline | a two-weight grid (48 / 240 px), corner brackets, edge rulers, three slow-spinning compass circles |
| Line | near-black ink `#2b2430`, 3–4 px, round joins | pale periwinkle `#b8c5ff`, 1.4–2.4 px, glow on what matters |
| Accent | red pencil, pins, stamps | cyan/violet/gold/green glows, white sparkles |
| Grain | soft-light at ~22% | overlay at ~18% |

Alternate them chapter by chapter — the contrast between a warm illustrated world and a
cool technical diagram is the style's rhythm. A paper chapter tells what it *feels* like;
a night chapter shows how it *works*.

**Stripes are an SVG pattern**, not a CSS gradient: a pattern tiles forever, so drifting
it never opens a seam at the frame edge (a shifted `background-position` on a frame-sized
`repeating-linear-gradient` does).

## Ink

- `#ink` filter: `feTurbulence` (fractal, baseFrequency 0.011, 2 octaves) →
  `feDisplacementMap` scale 3.2. It bends straight lines just enough to read as drawn.
- **Boil**: the turbulence re-seeds every 7.5 frames (8 fps) — a hand-drawn line never
  sits perfectly still. Amplitude stays low; it should never read as jitter.
- Only the drawing goes under `#ink`. **Text never does** — titles, chips, numbers and
  pencil notes live in `Stage`'s `crisp` layer, same camera, no wobble.
- Shading is layered, not rendered: a gradient fill, a darker crescent clipped to the
  shape, a patch of `#hatch` pencil lines, a white rim light on the lit edge, a soft
  white sheen ellipse and a dot highlight.

## Type

| Role | Face | Size (1920×1080 / 1080×1920) | Notes |
| --- | --- | --- | --- |
| Chapter title | Inter 600 | 38 / 58 px | lowercase, typed at ~34 cps from frame 3 with a caret; a short underline grows under the first word(s) |
| Dial caption | Inter 500 | 24 / 28 px | "1 · plan" — under the progress dial, top-right |
| Chips / data | JetBrains Mono 500 | 20–28 / 26–32 px | pills with a colour tab; counters, code, file names |
| Labels | Inter 600 | 26–42 / 30–52 px | |
| Pencil notes | Kalam 700 | 42–64 / 46–88 px | sparingly — "caught!", "one chapter = whole bars" — with a red underline |

The **progress dial** (top-right) is a thin ring filled to `frame / total`, a comet dot at
its head, a small coral square pulsing at each cut, and the stage caption below. It is the
viewer's sense of "how much is left".

## Stickers

Anything important becomes a **die-cut sticker**: hardened alpha → white border
(dilate 15/512) → ink line (dilate 19/512) → soft shadow offset down-right. On night,
the same die-cut with a pale line and a cyan glow instead of the shadow. `Sticker` takes
a picture in `public/` or vector children in a 100-unit box; both are scaled into the
512-unit box the filter is tuned for, so every sticker has the same border weight.

Stickers are how a product's own art enters the paper world without being redrawn — a
logo, a screenshot crop, a product shot.

## Props carry the story — no mascot

The style needs no character. An **object** does the action: a pencil that glides to each
card, taps it on the beat and then draws the bracket; a metronome that swings one side per
beat; a fountain-pen nib that inks the underline and draws a heart that fills in; a stamp
that slams; a card that slides across a table. Draw props in the same ink as everything
else — flat fills, a ~3 px outline, one white highlight stroke, a soft paper shadow that
drifts away when the prop lifts — and give each one a pose that is a function of the frame
(see *Aiming a prop* in `motion-and-timing.md`).

If the brief brings **the user's own character** (their mascot, their product's figure),
draw it in code from their art as a posable component the same way — pose, look, mood,
squash as props. Never invent a mascot for them, and never reuse a character from another
project.

## Small furniture

- **Sparkles**: four-point stars (`sparklePath`) — white with an ink stroke on paper,
  glowing white on night. They mark arrivals, catches, completions; they trail moving
  things.
- **Chips** (night) and **tags** (paper) for data.
- **Dashed connectors** (`DashPath`) that draw on and march — they tie a label to its
  thing, the way the reference's diagrams do.
- **Clouds, grass, flowers, a table, a board** — simple ink shapes that make a paper
  chapter a *place*.
- **Grain + vignette** over the whole frame, every frame (`FilmOverlay`).
