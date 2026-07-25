# 01 — Motion Constitution · دستور الحركة

**Seven principles that decide every animation before a single keyframe is drawn.**

---

## 1 · Executive Motion — حركة تنفيذية

NEXIOS moves like a senior officer: deliberate, economical, already-composed. Nothing
darts, nothing bounces, nothing begs. Weighted-glass physics (Constitution Ch. 01 §6):
surfaces have mass, arrive settled, and decelerate — `ease-out` is the house curve
because command interfaces answer *immediately* then settle, they never wind up.
**Test:** would this motion be acceptable projected on the boardroom wall mid-briefing?

## 2 · Functional Animation — الحركة الوظيفية

Every animation performs one of exactly four jobs:
1. **Report state** (loading, listening, live, degraded)
2. **Guide attention** (a new critical alert's one-time pulse)
3. **Preserve continuity** (a drawer sliding from where it lives; a count-up bridging
   old→new value)
4. **Confirm action** (press acknowledgment, toast arrival)

An animation that does none of the four is decoration and is deleted. "It feels nice"
is not a job.

## 3 · Calm Intelligence — الذكاء الهادئ

The system is alive but never restless. At rest, a NEXIOS screen has at most **two**
moving things visible: one ambient stratum motion (≥ 4s cycle) and one licensed presence
loop (FINN's breathing, a live dot). Everything else is still until state changes.
Intelligence is shown through *timing* (instant response, honest progress), not through
perpetual busyness.

## 4 · Holographic Motion — الحركة الهولوغرامية

The ambient stratum (Ch. 02/06) may drift, breathe and sweep — slowly (≥ 4s), at low
amplitude (≤ 16px parallax, ≤ 8% luminance), behind everything, and pausable. Holographic
motion sets *atmosphere*; it earns its budget by never entering the instrument strata:
the moment ambient motion crosses under a panel with tier-1/2 content, it has trespassed.

## 5 · Data-driven Motion — حركة تقودها البيانات

Data moves **only when data changes** (Ch. 08 KPI law generalized): counters count on
new values, sparklines extend on new points, gauges sweep on updates — never on mount,
never on scroll, never on tab return. Replayed theater destroys trust in real signals;
an executive must be able to believe that *movement = news*.

## 6 · Motion Hierarchy — تسلسل الحركة

Motion amplitude follows the attention tiers (Ch. 02): the hero may earn the largest
motion moment (once, on genuine state change); context panels get standard transitions;
periphery gets micro-motion only; ambient gets slow drift. Two simultaneous large
motions are forbidden — motion events queue (stagger 30–60ms) rather than compete.
Critical alerts preempt: when a critical pulse fires, all other non-essential motion
holds for its 2-pulse duration.

## 7 · Motion Accessibility — إتاحة الحركة

- `prefers-reduced-motion`: transitions collapse to ≤ 1ms crossfades, loops freeze at a
  designed static frame (60% intensity), parallax and sweeps disable — with **full
  information parity** (state still visible statically: a frozen listening ring still
  reads "listening" via its static glow + label).
- No flashing above 3Hz anywhere, ever (photosensitivity).
- Motion never carries meaning alone: every animated state has a static co-signal
  (color/glyph/word) — the same triple-coding law as color.
- Vestibular safety: no zoom-through transitions, no full-screen translation over 24px,
  no rotation of content planes (the twin's map rotation is object-level, slow, and
  user-stoppable).

## Precedence

When principles conflict: Accessibility > Functional > Calm > Hierarchy > Executive >
Data-driven > Holographic. (In practice: if an animation can't be made accessible and
calm, it doesn't ship.)
