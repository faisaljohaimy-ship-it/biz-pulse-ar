# NEXIOS Executive Design Constitution — الدستور التصميمي التنفيذي

**Version 1.0 · Status: RATIFIED · Scope: every current and future screen, component, animation, interaction and feature of NEXIOS**

---

## What this is

NEXIOS is an Executive AI Operating System — Arabic-first, RTL-native, built for the Saudi
energy and utilities sector. This constitution is the permanent design law of the product.
It does not redesign anything; it codifies the identity the system already carries —
obsidian depth, cyan command light, sector-colored life, glass panels, holographic
layers — and elevates it into reusable, scalable, future-proof rules.

The architecture is approved and frozen. The Executive Runtime, Adaptive Shell, FINN and
the navigation model stay exactly where they are. This document governs **how things look,
read, move and feel** — never where they live.

## Authority and precedence

1. This constitution governs all visual and interaction decisions.
2. `NEXIOS_CONSTITUTION.md` and `CLAUDE.md` govern engineering doctrine; where they
   constrain implementation (regions.ts single-source, RTL, performance budget), those
   constraints are load-bearing walls of this constitution, not exceptions to it.
3. Existing tokens in `src/styles.css` and `src/lib/regions.ts` are the **canonical
   implementation** of Chapter 03; the constitution names them, it does not fork them.
4. Any conflict between a screen and this constitution is a defect in the screen.

## The chapters

| # | Chapter | Governs |
|---|---------|---------|
| [01](./01-design-philosophy.md) | Design Philosophy | Identity, principles, what NEXIOS refuses to be |
| [02](./02-visual-language.md) | Visual Language | Glass, holographic layers, panels, density, rhythm |
| [03](./03-color-system.md) | Color System | Full enterprise palette: hex/rgb/hsl, opacity, usage, accessibility |
| [04](./04-typography-system.md) | Typography System | Arabic + Latin scales, numbers, KPI display, weights |
| [05](./05-grid-system.md) | Grid System | 8pt grid, breakpoints, containers, spacing law |
| [06](./06-depth-system.md) | Depth System | Elevation, glass depth, blur, glow, layer hierarchy |
| [07](./07-iconography.md) | Iconography | Sizes, stroke, states, animated / executive / agent / runtime icons |
| [08](./08-card-system.md) | Card System | The eight canonical cards, fully specified |
| [09](./09-executive-dashboard-principles.md) | Executive Dashboard Principles | Hierarchy, reading flow, decision support, progressive disclosure |
| [10](./10-responsive-design.md) | Responsive Design | Mobile → 4K rules, RTL responsiveness, density shifting |

## How to use this constitution

- **Building a new screen?** Read 01, 05, 09 first. Pick components that already satisfy
  02–08. If a needed pattern does not exist, extend the constitution *first* (amendment
  below), then build.
- **Reviewing a PR?** Chapters 03–08 are checklists. A hex value not in Chapter 03, a
  spacing value off the 8pt grid, or a card that doesn't match Chapter 08 is a finding.
- **Designing motion or a future feature?** Chapter 01's principles are the tiebreaker
  when detailed rules don't cover a case: Executive First → Decision First → Minimal
  Cognitive Load, in that order.

## Amendment process

The constitution is permanent but not fossilized. An amendment requires: (1) a written
rationale referencing the Chapter-01 principles it serves, (2) proof the change scales to
every existing screen, (3) a version bump of this index. Silent divergence is forbidden —
screens follow the constitution, never the other way around.

## Non-negotiables inherited from engineering doctrine

- Arabic-first, RTL-native. English is the guest, Arabic is the host.
- `src/lib/regions.ts` is the only source of sector geography and sector accent colors.
- FINN speaks with one voice; the interface never contradicts what FINN says.
- Simulation data is always visibly badged (`is_simulation`).
- The performance budget (`scripts/check-performance-budget.mjs`) caps every aesthetic
  ambition: beauty that breaks the budget is a defect, not a feature.
