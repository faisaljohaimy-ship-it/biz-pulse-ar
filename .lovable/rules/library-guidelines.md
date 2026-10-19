# AI Command Center — Guidelines

## Components

The design system exports these components — import them from `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f` and compose them before building anything from scratch:

`NxAnimatedKpi`, `NxButton`, `NxDelta`, `NxEmptyState`, `NxErrorState`, `NxEventTicker`, `NxGlassCard`, `NxKpiCard`, `NxKpiNumber`, `NxLayerStack`, `NxPanel`, `NxPipelineFlow`, `NxProgress`, `NxRegionPulse`, `NxSadeedPresence`, `NxSkeleton`, `NxSparkline`, `NxSpinner`, `NxStatusIndicator`, `NxTwinLink`, `NxTwinNode`, `NxVoiceButton`, `NxWaveform`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/brand-plate.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-analytics.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-brand.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-chrome.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-kpi.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-layout.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-map.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-motion.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-ops.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-sadeed.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/home/home-ticker.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/icon-motion.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/nx-tokens.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/report-charts.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/styles/report-viewer.css` (source — preferred import)
- `@ws-7sphzeh8xspa9m6mdyig/6f092c67-70c5-400b-9a7e-8c068475864f/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

