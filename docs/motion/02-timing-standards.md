# 02 — Timing Standards · معايير التوقيت

**Five duration classes, two easing curves, hard latency budgets. All timings bind to
the token ladder (doc 03); raw milliseconds in code are findings.**

---

## Duration classes

| Class | Token | Duration | Use |
|---|---|---|---|
| **Instant** | `--nx-anim-micro` | 100ms | press, toggle flip, focus ring appear |
| **Fast** | `--nx-anim-fast` | 150ms | hover, exits, dismissals, crossfades |
| **Normal** | `--nx-anim-base` | 200ms | open/expand, tab slide, toast enter, drawer |
| **Slow** | `--nx-anim-slow` | 300ms | large-surface transitions, fullscreen enter |
| **Cinematic** | `--nx-anim-cinematic` | 600ms | boardroom hero reveals, twin fly-to — Boardroom register & explicit presentation moments ONLY |

**Maximum duration:** 300ms for any interaction-blocking motion; 600ms absolute ceiling
(cinematic, non-blocking); live loops exempt (they're state displays, ≥ 2s cycles).
Anything longer is a progress indicator problem, not an animation.

## The asymmetry law

Exits are one class faster than entrances (enter Normal 200 → exit Fast 150; enter Slow
300 → exit Normal 200). Reasoning: arriving content deserves a beat of orientation;
departing content should get out of the way — dismissal is a command, not a scene.

## Easing curves

| Token | Curve | Use |
|---|---|---|
| `--nx-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | THE house curve — all entrances, hovers, expansions |
| `--nx-ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | looping breathe/pulse cycles, position swaps within view |
| linear | `linear` | shimmer sweeps, spinner rotation, ticker scroll ONLY |

No `ease-in` entrances (sluggish start reads as lag). No overshoot/bounce curves — the
ban is constitutional; "springy" is achieved only via critically-damped springs (doc 03)
that visually match ease-out.

## Interaction latency budgets

| Moment | Budget | Note |
|---|---|---|
| Input → visual acknowledgment | ≤ 50ms | press state, ripple-free wash — perceived instant |
| Hover → response | ≤ 100ms start, 150ms settle | pointer tiers only, never touch |
| Click → meaningful response | ≤ 100ms (state) / skeleton by 300ms | if real result needs longer → loading system (components doc 11) |
| Route change → old screen released | ≤ 100ms | chrome never blinks (components doc 06) |
| Voice press → listening ring | ≤ 100ms | trust in the mic depends on it |

## Canonical timings quick table

| Pattern | Enter | Exit | Curve |
|---|---|---|---|
| Hover wash/border | 150 | 150 | out |
| Press | 100 | 100 | out |
| Panel open/expand | 200 | 150 | out |
| Drawer / sheet | 200 | 150 | out |
| Dialog + scrim | 200 (fade+scale 98→100) | 150 | out |
| Toast | 200 slide-up 8px + fade | 150 fade | out |
| Tab underline | 200 slide | — | out |
| Card list mount stagger | 200 each, +30ms stagger, cap 8 items | — | out |
| KPI count-up | 400 (`--nx-anim-count`) | — | out |
| Critical pulse | 2 pulses × 600ms then static | — | inout |
| Breathe/presence loops | ≥ 2000 cycle | — | inout |
| Ambient/holographic | ≥ 4000 cycle | — | inout/linear |

## Stagger law

Stagger only on **initial mount of a set** (30–60ms steps, max 8 participants, total
sequence ≤ 480ms). Re-renders, pagination, filter and sort changes swap instantly — data
operations are work, not theater.
