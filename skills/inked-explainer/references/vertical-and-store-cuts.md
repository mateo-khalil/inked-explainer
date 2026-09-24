# Vertical and store cuts

## Portrait is a re-composition, not a letterbox

Squeezing a 16:9 chapter into 1080×1920 leaves a thin band of content with text at a
third of its size. Instead, the kit reads the composition size (`useVideoConfig()`) —
`Stage`, both grounds, the textures (`-tall` variants), the HUD — and each scene derives
its layout from it:

```tsx
const { width: W, height: H } = useVideoConfig();
const tall = H > W;
const board = tall ? { x: 110, y: 420, w: 860, h: 1080 } : { x: 170, y: 270, w: 1580, h: 620 };
```

Stack what sat side by side (drawing over code, speaker over tape, the metronome beside
the speaker), make the featured things bigger, and keep the same beats, timing and cues so the
vertical cut sounds like the landscape one. When a chapter's portrait layout diverges
too far for one file, give it its own file (`scenes-tall/<Chapter>.tsx`) and a second
registry.

**Phone type sizes** (1080-wide frame): titles 58 px (they wrap to two lines — keep
content below y ≈ 370), secondary labels ≥ 26 px, chips ≥ 26, key numbers ≥ 72,
featured stickers ≥ 140 px.

**Overlay zones on social apps**: keep what reads out of the top ~150 px (tabs), the
bottom ~300–380 px (caption, audio row) and the right ~120 px in the lower half (the
button rail). Decorative ground may run under them.

## Cuts

A cut is a list of chapter ids in `timeline.ts`:

```ts
export const CUTS = {
  full: ["beats", "code", "sound", "end"],
  teaser: ["code", "end"],
} as const;
```

`make-audio.mjs` writes one `music-<cut>.wav` per cut, arranged to that cut's grounds
and bar lines. `Film` takes a `cut` prop; register one `<Composition>` per cut. The HUD's
dial and the end card's recap read the cut (`useCut()`), so a shorter cut counts and
recaps only what it shows.

## An App Store app preview

Apple's specs (App Store Connect → App Preview specifications):

| | |
| --- | --- |
| Length | 15–30 s |
| Frame rate | ≤ 30 fps |
| iPhone portrait | **886 × 1920** (every current 6.1–6.9" size); 1080 × 1920 for 5.5" |
| Video | H.264 High ≤ Level 4.0, ~10–12 Mbps, `.mp4`/`.mov`/`.m4v`; or ProRes 422 HQ |
| Audio | stereo, AAC 256 kbps, 44.1/48 kHz |
| File | ≤ 500 MB |

886 is narrower than 9:16. Render the 1080 × 1920 composition and **centre-crop** —
which means every vertical scene must keep what reads inside the central 886 px
(x 97…983; design to x 110…970):

```bash
npx remotion render InkedFilmPreview out/preview-master.mp4 --codec=h264 --crf=14
ffmpeg -y -i out/preview-master.mp4 -vf "crop=886:1920:97:0,fps=30" \
  -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -b:v 11M -maxrate 12M -bufsize 24M \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart out/app-preview.mp4
```

Two App Review guidelines to know **before** anyone uploads one:

- **2.3.4** — previews *"may only use video screen captures of the app itself"*
  (narration and text/video overlays on top of captures are allowed). An illustrated film
  like this is marketing, not a capture: in the preview slot it risks a rejection. Its
  home is socials, ads and the website. A compliant preview is screen recordings of the
  app framed by inked titles and stickers as overlays.
- **2.3.10** — no names, icons or imagery of other mobile platforms in store media: the
  store cut's end card must not say "android" or show a Play badge.

Google Play takes a YouTube link for its promo video (landscape preferred) — the 16:9
render, uploaded to YouTube, is the right asset there.
