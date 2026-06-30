## Scope reality check

This directive spans ~30 disciplines and weeks of work (cinematic Hero, Three.js/WebGPU avatar, Saudi Digital Twin map, Executive Cinema fullscreen player, magnetic cursor, full motion/design token system, PWA, telemetry, QA, …). Shipping it as one mega-edit would break the app and produce mock surfaces — exactly what the directive forbids.

I'll execute it as **6 production waves**, each independently shippable, demoable, and reversible. We start with Wave 1 immediately on approval. Each wave keeps Charter v10.0: no mocks, real data, real tools, real tests.

---

## Wave 1 — Executive Hero v2 + Mission Control Strip (this PR)

Visible result the executive sees on `/` and `/runtime-hub`:

- Promote `NexusRevealHero` → `ExecutiveHeroStage`:
  - ARIA centerpiece doubled, no clipping ring, mesh-gradient + volumetric fog backdrop (CSS conic + radial layers, GPU-only).
  - Particle aura (deterministic SVG, 24 motes, prefers-reduced-motion safe).
  - Floating glass panels: live KPI tiles bound to `sec.kpis.latest` (open incidents, patrol compliance, CCTV availability, critical incidents 24h) — real `sec_*` data, no placeholders.
  - Magnetic CTA "ابدأ التشغيل" with spring physics (existing launch overlay reused).
- New `MissionControlStrip` component pinned under the hero: 6 live tiles (risk level, compliance %, emergency status, readiness, open WOs, agents online) updating every 6s via the existing `pulse` server fn.
- Tokenize all new colors/shadows/blur into `src/styles.css` (`--nx-glass-*`, `--nx-elev-*`, `--nx-motion-spring-*`). Zero hardcoded hex.
- a11y: landmark roles, `aria-live` for KPI changes, full keyboard order, reduced-motion variants.
- Tests: extend existing vitest a11y suite (axe) for Hero + Strip; visual snapshot via Playwright at 1280×1800.

## Wave 2 — Agent Ring & Hover Inspector

- Refactor existing `AgentRing` to orbit ARIA in the new hero.
- Hover inspector card: role · status · current task · confidence · tools · last 3 actions — pulled live from `agent_runs` + `tool_executions`. No mock fields.
- Shared-layout open animation (Framer Motion `layoutId`) to a side rail.

## Wave 3 — Executive Cinema

- New route `/_authenticated/cinema.tsx`. Glass FAB on hero opens fullscreen player.
- 9 chapters with adaptive `<video>` (HLS where assets exist, MP4 fallback), progress persisted in `aria_user_prefs`, keyboard shortcuts (`Space`, `←/→`, `F`, `M`), captions AR/EN.
- Real chapters seeded; no Lorem placeholders. Missing assets → graceful "Coming soon" card, not fake content.

## Wave 4 — Digital Twin Backdrop

- Behind ARIA: SVG map of KSA (Jeddah, Makkah, Yanbu, Riyadh nodes) with live pulse rings driven by `sec_sites` + `enterprise_events`. CSS/SVG first; WebGL upgrade gated behind `feature.dt_webgl` flag and adapter check (sandbox has no GPU — must degrade).
- Risk heatmap overlay from `sec_incidents` last 24h.

## Wave 5 — Motion & Design System Hardening

- Publish `src/lib/motion/tokens.ts` (springs, durations, easings) and migrate hero + dock to use it.
- Audit + remove hardcoded colors across `src/components/digital-humans/*` and `src/routes/index.tsx`.
- Add `prefers-reduced-motion` and `prefers-contrast` global guards.

## Wave 6 — Quality Gate

- Lighthouse run (target ≥90 perf on `/`), Playwright smoke for hero/strip/cinema/ring, axe zero-violation on all four, bundle-size budget check.
- Production readiness report committed under `docs/wave-report.md`.

---

## What I will **not** do as part of this directive (and why)

- **Three.js / WebGPU ARIA**: sandbox preview has no GPU adapter (`navigator.gpu === undefined`); the current `HologramFace` is CSS/SVG and ships everywhere. A WebGL upgrade lands in Wave 4 behind a feature flag with CPU fallback — not as the default path.
- **Mock agent telemetry, fake KPIs, Lorem cinema chapters**: forbidden by Charter v10.0 and the directive itself ("No mock implementations").
- **Rewriting `_authenticated.tsx` auth bypass, runtime routes, or backend**: out of scope for an experience PR; the existing forensic chain stays intact.

---

## Technical details (Wave 1 only)

- Files added: `src/components/executive/ExecutiveHeroStage.tsx`, `src/components/executive/MissionControlStrip.tsx`, `src/components/executive/KpiTile.tsx`, `src/lib/motion/tokens.ts`, tests under same dirs.
- Files modified: `src/routes/index.tsx` (swap `NexusRevealHero` → `ExecutiveHeroStage`), `src/styles.css` (new tokens), `src/components/cinematic/NexusRevealHero.tsx` kept as legacy export.
- Data sources: existing `sec.kpis.latest`, `pulse.snapshot`, `sec_incidents`, `sec_patrols`, `sec_cameras`. No new tables, no migrations.
- Perf: all decorative layers `pointer-events:none`, GPU-only transforms, particle count capped at 24, paused under `prefers-reduced-motion`.
- a11y: `<main>` stays single, hero is `<section aria-label="ARIA executive stage">`, KPI updates announced via `aria-live="polite"`.

---

## Ask

Approve **Wave 1** and I start immediately. Waves 2–6 ship in order, each as its own PR, after you sign off on the previous one. Want me to reorder (e.g. Cinema before Agent Ring) or expand Wave 1 to also include the Agent Ring?