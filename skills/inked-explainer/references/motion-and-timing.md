# Motion and timing

## The grid

- **60 fps.** Smooth camera moves and pops need it; store previews that cap at 30 fps are
  a transcode of the 60 fps master, not a separate render.
- **A BPM, and whole bars.** At 150 BPM a beat is 24 frames and a bar is 96 frames
  (1.6 s). Every chapter is a whole number of bars, so every hard cut lands on a bar line
  of the music — the reason the cuts feel edited to the track.
- **One file holds time**: `timeline.ts`. Scenes animate on their **local** frame
  (`useCurrentFrame()` inside the chapter's `Sequence`), so moving a chapter never breaks
  its entrances. The music script reads the same file.
- Things that should feel musical land **on beats** inside a chapter: `LAND = [40, 64, 88,
  112]` (every 24 frames) for four cards dropping in sequence.

## The beat shape of a chapter

| Frames (2-bar chapter) | Job |
| --- | --- |
| 0–40 | **Establish.** The ground is there on frame 0 (hard cut); objects draw on, slide up or pop in; the title types. Frame 0–3 can be nearly empty — that is how the reference cuts. |
| 40–130 | **The action.** One focal thing happens (a catch, a hold, a sweep, a stamp). Everything else is secondary motion around it. |
| 130–170 | **The payoff.** The result lands: a check, a count, a stamp, a pencil note ("caught!"), a burst of sparkles, a chime. |
| 170–192 | **Lean in.** A slow push toward where the next chapter's idea is, or a hold. |

Longer chapters stretch the action; the end card gets 3–4 bars (a slow build, a hold,
a slight pull back).

## Easing vocabulary (`motion.ts`)

- `prog(frame, start, dur, ease)` — the workhorse: eased, clamped 0→1.
- `pop(frame, at, dur=18, overshoot=2.2)` — `easeOutBack` scale-in for anything that
  appears. Bigger overshoot (2.6–3) for small things like pins.
- `keys(frame, [[f, v], …])` — piecewise keyframes, for cameras and poses.
- `easeOutSpring` — a damped settle with a wobble past 1.
- `typed(text, frame, start, cps=34)` — typewriter substrings (titles ~34 cps, code 44).
- `visible(frame, at, until, fade)` — fade in and out around a window.
- `noise(t, seed)` — smooth value noise for hand-held drift and idle wander.
- `bob(frame, amp, period, phase)` — idle float.
- `quad` / a cubic evaluator — arcs for things flying in (never straight lines).

## Secondary motion (never let a frame be still)

- Props idle: a resting pencil rises a few px on each beat, a metronome swings one side
  per beat, a parked pen nib floats; things squash on beats when music is the subject.
- Dashed connectors draw on, then **march** (`strokeDashoffset = -frame * 0.8`).
- Paths draw themselves with a moving glowing tip (split the cubic at t — de Casteljau —
  rather than a dash trick when you also want the handles).
- Clouds drift, stripes drift, compass circles turn a fraction of a degree per frame.
- Sparkles trail anything that flies; a burst marks anything that arrives.

## Camera

`Stage` takes either `{ from, to, focus, focusTo, drift }` (a slow push over the chapter,
default 1 → 1.035 with ±3 px hand-held drift) or a function `frame → { zoom, focus }` for
a keyed move. The common keyed move: hold still, then in the last ~40 frames push to
1.1–1.16 toward the thing the next chapter is about — the cut then lands "inside" it.

## Aiming a prop: a pose that is a function of the frame

When an object must *hit* something — a pencil tapping a card, a stamp landing on a form,
a nib starting a line where the underline begins — write its pose as a pure function of
the frame, so the scene can ask where it will be on the contact frame:

```tsx
const LAND = [40, 64, 88, 112]; // the beats the cards land on
const tapPoint = (i: number): [number, number] => [slots[i][0] + cardW * 0.28, slots[i][1] - cardH * 0.18];
const pencilAt = (f: number) => {
  // glide to tapPoint(i) over the 14 frames before LAND[i], tip down ON the beat, lift after
};
const p = pencilAt(f);
<DrawingPencil x={p.x} y={p.y} lift={p.lift} />;
```

The reverse works too: when something flies in to be *caught* (by a net, a tray, a hand),
evaluate the catcher's pose at `HIT - 3` and make that the end of the flight. Without this
the object hovers where it looked right in one still and misses by 200 px in motion.
