# Scene recipes

Patterns that recur in this style, each with the minimum code that makes it work. All
snippets assume `const f = useCurrentFrame()` and the helpers in `motion.ts` / `kit/`.

## A prop that hits its mark (a pencil tapping cards on the beat)

```tsx
const LAND = [40, 64, 88, 112];
const pencilAt = (fr: number) => {
  let from = rest;
  for (let i = 0; i < LAND.length; i += 1) {
    const to = tapPoint(i);
    if (fr < LAND[i]) {
      const t = prog(fr, LAND[i] - 14, 14, easeInOutCubic);
      return { x: lerp(from[0], to[0], t), y: lerp(from[1], to[1], t) - 40 * (1 - t), lift: 1 - t };
    }
    if (fr < LAND[i] + 10) return { x: to[0], y: to[1], lift: clamp((fr - LAND[i] - 2) / 8) * 0.6 };
    from = to;
  }
  return { x: from[0], y: from[1], lift: 0.6 };
};
```

Tip down exactly on the landing frame, a ring pulse at the tap point, `note(i)` + `pop-hi`
on the cue list. Draw the prop with its **tip at (x, y)** and `lift` raising it and pushing
its shadow away — that is what makes a tap read as a tap. The same shape aims a stamp at a
form, or a catcher at something flying in (evaluate its pose at `HIT - 3`, end the flight
there, and draw the caught thing *before* the catcher so a mesh or rim sits over it).

## Hold-to-confirm with ramping haptics

```tsx
const PRESS = 30, HOLD = 51, DONE = PRESS + HOLD;             // 0.85 s at 60 fps
const PULSES = [0, 14, 25, 34, 41, 46, 50].map((p) => PRESS + p); // bunching toward the end
const holding = clamp((f - PRESS) / HOLD);
<circle r={78} strokeDasharray={`${2 * Math.PI * 78 * holding} 9999`} transform="rotate(-90)" filter="url(#glow)" />
// one ripple per pulse: r = 86 + easeOutCubic(life) * (60 + i * 12), opacity (1 - life) * (0.35 + i * 0.09)
// cues: buzz at every pulse with volume 0.22 + i * 0.07, chime at DONE
```

Show the same hold as a **ruler** beside it (0 → 0.85 s) with one bar per pulse, each
taller than the last, and a marker riding `holding`.

## A counter that ticks up

```tsx
const counting = prog(f, 118, 40, easeOutCubic);
<text fontFamily={MONO}>{Math.round(TOTAL * counting)}</text>
```

Fade it in **with** the count (a zero sitting on screen reads as a bug), end on a `pop`,
and circle the final number in red pencil (`strokeDasharray` drawn on).

## A receipt that types in

A white paper strip with a zig-zag bottom edge rising out of a printer; one line per
`tick` cue, `typed(line, f, at, 44)`, right-aligned numbers in mono, a dashed rule, then a
total that counts up (`coin` cue) and gets circled. Numbers come from the product's data.

## A stamp that slams

Lift (0.5 s) → slam (4 frames, `easeInCubic`) → squash the thing stamped by ~8 % for 6
frames → dust puffs out sideways → a rough-edged mark stays. **Give the mark a pale
knock-out fill** (`fill="#f4f8ee" fillOpacity={0.82}` inside its border): a stamp over
dark art is illegible without one. Cue: `stamp` on the impact frame.

## A radar sweep that lights nodes

```tsx
const sweep = ((f - 26) / 120) * Math.PI * 2;                  // one turn
const lit = nodes.filter((n) => angleOf(n) <= sweep);          // stay lit once passed
// the wedge: a path from the centre spanning [sweep - 0.5, sweep], a gradient fading backwards
// each newly lit node: pop + a dashed arc from "you" + note(i) — keep a running count chip
```

## A matrix resolving under a scan line

Rows × columns of cells; a vertical scan line sweeps left to right; each cell resolves
into its state as the line passes (`owned` filled + glow, `mastered` star, `rebuy` dashed
ring that spins) with one `note()` per column. Cells that do not exist are a faint dot,
never an empty square. A `% complete` readout and legend chips count live beside it.

## Stars that fill one by one

Five outlined stars; star `i` fills at `72 + i * 10` with `pop` and `note(i + 1)`; the
last one gets a sparkle burst. Follow with a quote typing in a chip.

## An orbit of stickers around a window

```tsx
const a = (i / N) * Math.PI * 2 + f * 0.0105;
const depth = Math.sin(a);                                     // -1 far … +1 near
const x = cx + Math.cos(a) * rx, y = cy + depth * ry + Math.cos(a) * -50; // tilted ellipse
const s = 0.7 + 0.3 * (depth + 1) / 2;
// far half: drawn in Stage's `under`, dimmed; near half: drawn after the window
```

Wide and flat for 16:9 (rx ≫ ry, the near side passing just under the window); tall and
round for 9:16 (swap sin/cos so depth runs top → bottom).

## A typed wordmark end card

A blueprint window draws itself on (`strokeDasharray = perimeter * draw`), the name types
in at one letter per 4 frames with a `tick` each, a pen nib inks the underline and then
draws a heart that fills in (the whole film's idea in one gesture),
the orbit fades in, the stages the cut showed light up one by one (`note(i + 1)`), then
the promise line, then the small print. Size the wordmark so the caret still fits inside
the window in both orientations.

## Pencil notes

`HAND` font, 42–88 px, slightly rotated, a red underline drawn with a quadratic curve.
One per chapter at most — they are the voice, not the captions.
