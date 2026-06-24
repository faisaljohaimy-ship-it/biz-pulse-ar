# NEXUS — Executive AI Hero Redesign (Scene 01)

Replace the current Earth + Riyadh-skyline hero on `/` with an ARIA-centric cinematic command center inspired by the reference image (atmosphere only, not copied).

## Scope (this plan only touches the homepage hero)

- **File touched**: `src/routes/index.tsx` — Scene 01 block (≈ lines 162–250) + `HeroHoloPanels` helper (≈ 1980+).
- **New components**:
  - `src/components/cinematic/AriaExecutiveCore.tsx` — premium holographic AI core (SVG + CSS, no humanoid, no robot).
  - `src/components/cinematic/ExecutiveOfficeBackdrop.tsx` — dark glass office with depth-of-field, light rays, particles, neural lines, glass reflections.
  - `src/components/cinematic/HoloWidgetRing.tsx` — orbiting glass holographic widgets (Mail/AI Responses, KPI, Reports, Alerts, Risk, Predictions, Workflow, Agents, Decision Intel, Search, Twin, Health, Ops, Charts, Timeline, Recommendations) — auto-positioned in an elliptical orbit around ARIA with live tick animations.
- **Removed from Scene 01**: `cinematicEarth` image, `<EarthScene>`, `<HeroSkyline>` usage (component file kept, just unused here so other scenes aren't affected).
- **Palette added** to `src/styles.css` under `@theme` as semantic tokens:
  `--aria-bg #061A2E`, `--aria-bg-2 #0B2742`, `--aria-surface #123B57`, `--aria-card #184E77`, `--aria-cyan #00D4FF`, `--aria-cyan-bright #3AE8FF`, `--aria-aqua #6FFFE9`, `--aria-glow #00B8D9`, `--aria-text #FFFFFF`, `--aria-text-soft #D7EAF4`. Used via `bg-[var(--aria-*)]` / arbitrary `text-[var(--aria-text-soft)]` to keep dark-mode safe.

## Visual composition

```text
┌──────────────────────────────────────────────────────────┐
│  glass-office backdrop · blurred · cyan volumetric rays  │
│                                                          │
│   ◐ Mail        ◐ KPI        ◐ Alerts      ◐ Agents      │
│         ╲          ╲           ╱             ╱           │
│            ┌──────────────────────────┐                  │
│            │     ARIA  EXECUTIVE CORE │  ← center        │
│            │  plasma · rings · halo   │                  │
│            └──────────────────────────┘                  │
│         ╱          ╱           ╲             ╲           │
│   ◐ Reports   ◐ Risk     ◐ Predict     ◐ Twin            │
│                                                          │
│  H1 "NEXUS AI OS"  ·  sub  ·  CTAs (unchanged)           │
└──────────────────────────────────────────────────────────┘
```

- ARIA core: layered SVG — outer dashed ring (slow rotate), mid neural-line ring (counter-rotate), inner plasma sphere (radial gradient `--aria-cyan` → `--aria-aqua` with breathing pulse), soft halo blur `--aria-glow`. No face, no humanoid silhouette.
- HoloWidgetRing: 8 cards mobile (compact, 2 visible + auto-rotate carousel), 12–16 cards on `md+` arranged on an ellipse with `position: absolute` + transforms. Each card = frosted glass (`backdrop-blur-xl bg-white/5 border border-[var(--aria-cyan)]/25`), tiny icon, label, animated mini-bar/spark, subtle float (CSS keyframes, staggered delays).
- Backdrop: full-bleed CSS — base `--aria-bg`, layered radial gradients, faint grid SVG, animated diagonal light rays, particle field (reuse existing `ParticleField` with cyan tint via prop or wrap), out-of-focus glass-wall silhouettes (CSS shapes blurred 40px).

## Responsive

- Mobile (≤ 640): ARIA core ~ `clamp(180px, 55vw, 260px)`, widgets reduced to a 4-up grid below the core instead of orbiting (prevents clipping). Text sizes preserved.
- Tablet/desktop: full orbit. Container caps at `max-w-6xl`, ARIA `clamp(280px, 28vw, 440px)`.
- Uses `prefers-reduced-motion` to pause rotation/float.

## Preserved

- H1 "NEXUS AI OS", subtitle, two CTAs (Request Demo, Watch Film), demo button, scroll-down chevron, scene progress indicator.
- Other scenes (2–10), header, sidebar — untouched.

## Out of scope

- No backend changes, no new dependencies, no Three.js additions (pure CSS + SVG for performance and to avoid the current 3D heaviness the user already flagged).
- Dashboard route's robot image (recently added) is left as-is.

## Verification

- `bunx tsgo --noEmit`.
- Playwright screenshot at 440×799 (mobile, current viewport) and 1440×900 (desktop) to confirm no clipping and ARIA reads as the focal point.
