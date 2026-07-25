# 07 — Motion Quality Checklist · بوابة جودة الحركة

**The ship gate. Every PR introducing or modifying motion answers this list; any ✗
blocks. Reviewers copy this table into the review.**

---

## A · Purpose (Motion Constitution)

- [ ] Names its job: state report / attention guide / continuity / confirmation.
- [ ] Freezing it loses information (otherwise: delete it).
- [ ] Fires only on a real state change (no mount/scroll/tab-return theater).
- [ ] Data motion fires only on data change.

## B · Physics (Timing Standards)

- [ ] All durations/easings are tokens; zero raw `ms`/curves in the diff.
- [ ] Enter uses `--nx-ease-out`; exits are one class faster than entrances.
- [ ] Blocking motion ≤ 300ms; cinematic (≤ 600ms) only on licensed surfaces.
- [ ] Loops ≥ 2s cycle; ambient ≥ 4s; no overshoot/bounce anywhere (springs `bounce: 0`).
- [ ] Stagger only on initial mount: 30–60ms, ≤ 8 items.

## C · Hierarchy & Calm

- [ ] ≤ 2 moving elements at rest on the resulting screen; ≤ 3 simultaneous transition
      animations.
- [ ] No motion competes with a critical pulse (holds during its 2 pulses).
- [ ] Glow/halo/gold-sweep usage passes the licensing tables (Ch. 06 + motion doc 05) —
      gold motion at most once per screen.
- [ ] Holographic effects: ≤ 2 concurrent, ambient stratum only, absent from
      Operations-register screens.

## D · Accessibility

- [ ] `prefers-reduced-motion`: transitions ≤ 1ms, loops frozen at designed static
      frames, parallax off — verified, with full information parity.
- [ ] No flashing > 3Hz; no zoom-through; content translation ≤ 24px.
- [ ] Animated state has a static co-signal (color/glyph/Arabic word).
- [ ] Focus indication never depends on motion.

## E · RTL & Responsiveness

- [ ] Directional motion respects RTL (shimmer sweeps right→left, drawers deepen
      leftward, ticker flows left); mirrors correctly in LTR embeddings.
- [ ] Verified at 390×844 and 1280×800 (+2560 for wall-eligible surfaces).
- [ ] Mobile tier: no parallax, no ambient loops, blur ≤ 12 — confirmed.

## F · Performance

- [ ] Animates only transform/opacity (+static blur layers crossfading).
- [ ] No layout thrash (batched reads/writes); `will-change` transient.
- [ ] Off-viewport and hidden-tab loops pause.
- [ ] 60fps on doctrine viewports (trace attached for signature motion).
- [ ] Bundle impact within the performance budget script.

## G · One-OS Feel

- [ ] Uses the closed keyframe vocabulary (doc 03) — no new keyframes without amendment.
- [ ] Matches the component's spec (docs/components) motion rows exactly.
- [ ] Passes the boardroom test: acceptable projected mid-briefing.

---

**Verdict line for the PR:** `MOTION-GATE: PASS (A–G ✓)` or the failing items listed.
Motion without a verdict line does not merge.
