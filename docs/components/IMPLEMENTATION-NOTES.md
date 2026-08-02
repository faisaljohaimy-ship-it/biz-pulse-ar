# Implementation Notes — سجل التنفيذ

**Phase 4 · v1.0 — the constitutions became code. This log tracks what is implemented,
where, and what remains. Updated every implementation phase.**

---

## Implemented (Phase 6 — cockpit composites + showcase route)

### Composites (`src/components/nx/composite/`)

| Component                                                 | Spec                         | Notes                                                                                                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NxLayerStack` (closed five-stratum chip row)             | design 03 §5 / components 07 | pulse licensed only on the active layer; sr-only «نشطة الآن» co-signal                                                                                                                                                        |
| `NxPipelineFlow` (request→…→result, seven stages)         | motion 05 §Pipeline          | gold approval gate breathes ONLY while pending (single-gold law); execution stage never carries a standing animation (advisory law); CSS-only                                                                                 |
| `NxEventTicker` (decision/alert/approval/execution/audit) | motion 04 §Ticker            | duplicated track + `nx-ticker-track` (0→−50%, leftward); duration from measured width at 24px/s (`--nx-loop-ticker`); pauses on hover/focus; a critical item revokes the loop → static emphasis; reduced motion → static list |

Motion doc 03 amended (v1.0.1): `nx-ticker-track` joined the closed keyframe
vocabulary; implemented in `nx-tokens.css`.

### Showcase route (`src/routes/nx-cockpit.tsx`)

Additive-only assembly of the executive cockpit reference: layer stack → KPI row
(5 × `NxKpiCard`, simulation-badged) → pipeline (approval pending) → twin zone
(4 region pulses + 4 twin nodes) → FINN panel (presence + voice + quick actions,
«لا تنفيذ دون اعتماد بشري») → event ticker. **Not wired into any navigation**
(`noindex`); zero changes to existing pages or chrome.

### Tests (`src/components/nx/composite/composite.test.tsx`)

11 tests: closed sets + order, active-only pulse with Arabic co-signals, gate
breathe gating, advisory-law assertion on the execution stage, ticker scroll/
duplication/pause/critical-override/reduced-motion/empty behaviors, and a
composed-RTL axe pass (0 violations).

---

## Implemented (Phase 4 — Phase A foundation + core)

### Tokens & theme (`src/styles/nx-tokens.css`, imported by `src/styles.css`)

- All nine ladders from doc 14: spacing, radius, shadow (e1–e4), glow (5 licensed
  recipes incl. sector via the existing `--nx-region-rgb` mechanism), blur, opacity,
  z-index, motion durations/easings/loops/amplitudes (motion doc 03), layer palette
  (Ch. 03 §5 — incl. the new shell violet).
- Tailwind v4 theme bridge: `bg/text/border-nx-*` color utilities, `shadow-e1..e4`,
  `rounded-nx-8/12/16/20`.
- Glass composites `nx-glass-e1..e4` (Ch. 06 recipes) as utilities.
- The closed keyframe vocabulary (`nx-fade-in`, `nx-rise-in`, `nx-scale-in`,
  `nx-breathe`, `nx-pulse-ring`, `nx-shimmer`, `nx-dot-wave`, `nx-sweep`, `nx-spin`,
  `nx-indeterminate`) + licensed motion utilities.
- Token-level `prefers-reduced-motion` remap (durations→1ms, amplitudes→0, loops
  paused) — parity is automatic for every consumer.
- **Additive only**: nothing restyles existing screens; existing `--nx-*` brand tokens
  untouched and reused.

### Components (`src/components/nx/` — Nx prefix per NAMING-CONVENTION)

| Component                                                                                                                                                                          | Spec           | Notes                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `NxButton` (10 variants: primary/secondary/ghost/glass/outline/danger/warning/success/runtime/executive)                                                                           | 01             | loading locks width + `aria-busy`; executive = the gold single     |
| `NxVoiceButton` (idle/listening/recording)                                                                                                                                         | 01             | licensed breathing ring, `aria-pressed`                            |
| `NxPanel` (layer accents, 3 density registers, header/footer anatomy)                                                                                                              | 07             |                                                                    |
| `NxGlassCard`, `NxKpiCard`                                                                                                                                                         | 03             | four truths + simulation badge                                     |
| `NxKpiNumber`, `NxDelta` (direction-aware + noise threshold), `NxStatusIndicator` (triple-coded), `NxAnimatedKpi` (count-up on change only, reduced-motion instant), `NxSparkline` | 05             |                                                                    |
| `NxSkeleton`, `NxSpinner`, `NxProgress`                                                                                                                                            | 11             | RTL shimmer, Arabic verbs, determinate/indeterminate               |
| `NxEmptyState` (three honest kinds), `NxErrorState` (recoverable/blocked + trace disclosure)                                                                                       | 12/13          |                                                                    |
| `NxFinnPresence` (10 states) + `NxWaveform`                                                                                                                                        | motion 05 / 07 | «executing» renders as بانتظار التنفيذ المعتمد — advisory law kept |
| `NxRegionPulse`, `NxTwinLink`, `NxTwinNode`                                                                                                                                        | motion 05      | sector color exclusively from `regions.ts`; pulse only when live   |

### Tests (`src/components/nx/nx.test.tsx`)

22 tests: variant closed sets, aria/busy/pressed semantics, direction-aware delta
logic, provenance + simulation badge, loading roles, empty/error anatomy, all FINN
states with Arabic co-signals, twin live-pulse gating, and a jest-axe pass over a
composed RTL surface (0 violations).

## Compliance notes

- Zero raw hex/px design values in components — everything resolves through tokens or
  ladder-aligned Tailwind utilities.
- Zero `dark:` variants (dark-first law, doc 15). Zero physical direction utilities.
- Components fetch nothing (Standards §8); screens own data.
- Not imported by any route yet → zero bundle impact on existing pages (verified by
  the performance budget).

## Remaining gaps (for later phases)

1. **Adoption**: existing screens still use their current components; migrating them
   onto Nx components is intentionally out of scope (the mandate forbids redesigning
   pages) and is the natural Phase 5+ work, screen by screen behind QA gates.
2. **Unimplemented specs**: inputs (doc 02), tables (04), navigation chrome (06),
   modals (08), notifications (09), timelines (10), FAB/floating/FINN-button variants,
   gauges/progress-ring/heat indicator (05 partial), executive search/palette.
3. **Motion**: page-transition grammar and the pipeline light-packet need route-level
   integration (Framer Motion patterns from motion doc 06) — deferred with adoption.
4. **Tailwind enforcement lint** (no-arbitrary-values / no-physical-direction rules in
   `src/components/nx/**`) — tooling task, doc 15 migration path step 3.
5. **`wall` breakpoint** registration deferred until a boardroom surface adopts it.
