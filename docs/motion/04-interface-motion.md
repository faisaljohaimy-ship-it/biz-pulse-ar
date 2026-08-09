# 04 — Interface Motion · حركة الواجهة

**Choreography for pages, panels, KPIs, streams, notifications, micro-interactions and
loading — sections 03, 04, 08–12. All timings/curves by token (doc 03).**

---

## Page transitions (Section 03)

One grammar, domain-flavored only by what _loads_, never by different physics — routes
must feel like turning the head, not changing worlds:

- **Universal route transition:** old content releases ≤ 100ms (fade), chrome (TopNav,
  SideNav) never blinks; new screen skeleton arrives immediately, content crossfades in
  200ms with a single 4px rise. **No slide-based route transitions** (RTL/LTR ambiguity
  - vestibular cost).
- **Dashboard / Executive Cockpit:** hero tier resolves first (skeleton → value), then
  context panels stagger-mount (30ms, cap 8). The cockpit may use the one _Cinematic_
  entrance per session: first arrival after boot gets the 600ms hero reveal.
- **Runtime:** panels mount in dependency order (mirrors boot order) — the stagger IS
  information.
- **Knowledge:** reader surfaces fade only (200ms) — text never moves while arriving.
- **Digital Twin:** viewport holds last frame during route return (continuity), telemetry
  strip refreshes with update tick (below).
- **Adaptive Shell:** grid mount stagger by kind groups (skills, then agents…).
- **SADEED:** summon = scale-in 200ms from the summon origin (button/palette); SADEED never
  "navigates" — he appears.
- **Analytics:** charts draw axes first (150ms), then series (300ms clip-path reveal,
  once per data-load — not per tab-return).

## Panel animations (Section 04)

| Event                  | Motion                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open                   | `nx-rise-in` 200ms                                                                                                                                             |
| Close                  | fade 150ms (no collapse choreography — get out of the way)                                                                                                     |
| Expand                 | height auto-animate 200ms ease-out; content fades in after 50ms                                                                                                |
| Collapse               | height 150ms; content fades first                                                                                                                              |
| Refresh (user-invoked) | refresh icon rotates once 400ms; content crossfades on arrival — panel body NEVER blanks                                                                       |
| Update (new data)      | **update tick**: 1px underline sweep across the panel header (300ms) + changed values run their change motion; unchanged content is untouched                  |
| Live update            | as Update, plus the panel's live dot (StatusIndicator pulse ≥ 2s) while subscribed                                                                             |
| Realtime data          | value-level only: changed cells flash background at 12% accent for 600ms then fade; ≥ 3 updates/s collapses to batched ticks at 1s — the eye cannot use faster |

## KPI motion (Section 08) — only on value change, ever

Counter: `nx-count` 400ms with tabular digits (no width jitter). Progress/Gauge: sweep to
new value 300ms ease-out. Trend arrow: crossfade+rotate 150ms on direction change.
Sparkline: new point extends path 200ms; no full redraw. Risk score: delta flash 12%
(status-colored by _direction map_, doc 05 components). Performance dashboards: batched
per update-tick; mounting shows final values instantly (no fake count-ups on mount —
constitutional Data-driven law).

## Event stream (Section 09)

- **Continuous ticker** (boardroom/cinema surfaces): linear scroll `--nx-loop-ticker`
  24px/s, seamless loop, RTL direction (content flows left), pause on hover/focus.
- **Feed mode** (EventStreamPanel): new entries `nx-rise-in` at top, others shift down
  200ms; auto-scroll pauses on user interaction (resume chip).
- **Critical pause:** a critical event STOPS the ticker 4s, renders the item static at
  full width with the 2-pulse ring, then resumes — the stream literally holds its breath.
- **Executive emphasis:** hero-tier events (approvals, verdicts) get a 600ms gold-edge
  sweep once.
- **Priority colors** move nothing: severity is static color+glyph+word; only timing
  (pause) and the licensed pulse differentiate motion-wise.

## Notifications (Section 10)

Toast: slide-up 8px + fade 200ms in, fade 150ms out; stack shifts 200ms. Banner: height
expand 200ms (content pushes down — honesty over overlay). Alert (inline): fade only.
Critical alert: enter as toast + `nx-pulse-ring` ×2, then static until acknowledged;
other motion holds during its pulses (hierarchy law). Approval result: gold edge sweep
600ms once. Execution complete: outcome chip pops via 150ms scale-in (0.95→1, no
overshoot). Knowledge ready: quiet — fade-in toast only (arrival of reading material
should feel like a librarian, not a herald).

## Micro-interactions (Section 11)

| Interaction   | Motion                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Hover         | wash+border 150ms; elevation shift where spec'd; pointer tiers only                                                   |
| Press         | translate-y 1px + wash 8%, 100ms; release returns 100ms                                                               |
| Focus         | ring fades in 100ms (never animates position)                                                                         |
| Selection     | check glyph scale-in 150ms; row wash 150ms                                                                            |
| Drag          | item lifts to E2 150ms, 2° max tilt NONE (no tilt — glass doesn't tilt), 96% opacity; origin shows dashed placeholder |
| Drop          | settle 200ms ease-out to slot; invalid target: 2×4px horizontal shake 150ms total (the one licensed "no" motion)      |
| Toggle/Switch | thumb travel 150ms ease-out; track color crossfade 150ms                                                              |
| Checkbox      | check draw-in 150ms (stroke-dashoffset)                                                                               |
| Search        | results container height-animates 200ms; result items crossfade (no per-keystroke stagger)                            |
| Voice button  | press → ring appears 100ms; listening breathe 2s; release → ring contracts 150ms                                      |

## Loading motion (Section 12)

Bound to components doc 11: skeleton shimmer `nx-shimmer` 2s linear RTL sweep · pulse
(placeholder dots/blocks) opacity 60↔100% 2s · glass loading (panel-level) = skeleton
inside static glass — glass itself NEVER pulses (surfaces are furniture) · runtime
loading = staged checklist, each stage's spinner 900ms linear · knowledge loading =
page-shaped shimmer · twin loading = silhouette static + telemetry shimmer (no sector
pulse while loading — pulse means live) · SADEED thinking = doc 05.
