# Chapter 05 — Grid System

**The 8pt law, the responsive grid, and the spacing vocabulary of NEXIOS.**

---

## The 8pt Grid — قانون الثمانية

Every dimension in NEXIOS — spacing, sizing, radii, row heights — is a multiple of
**8px**, with **4px** permitted only *inside* components (icon-to-label gaps, chip
padding). Reasoning: one modular unit makes every screen rhythmically identical, makes
handoff arithmetic trivial, and scales cleanly across densities (8 → 8/16/24… survives
2× and 1.5× displays without half-pixels).

**Spacing tokens:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (12 is the single
sanctioned in-between, for dense table cells). No other values exist. `space-24` is the
default panel padding (Command register); `space-32` in Boardroom.

## Responsive grid

The grid is column-based, RTL-native (column 1 is the **rightmost**), with fixed gutters
of 24px (16px on mobile):

| Tier | Viewport width | Columns | Margin | Container behavior |
|---|---|---|---|---|
| **Mobile** | < 640px | 4 | 16px | fluid, single column stacks |
| **Tablet** | 640–1023px | 8 | 24px | fluid |
| **Desktop** | 1024–1535px | 12 | 32px | fluid to max 1440px |
| **Ultra-wide** | 1536–2559px | 12 | 48px | **content max 1600px, centered**; ambient strata may bleed full width |
| **4K / Wall** | ≥ 2560px | 16 | 64px | Boardroom register; content max 2240px |

Rules:
- Panels span whole columns; nothing sits between columns.
- The hero (Chapter 02 focus tier 1) spans ≥ 6 of 12 columns on desktop.
- Ultra-wide never stretches reading content past 1600px — extra width goes to margins
  and the ambient/holographic stratum, not to longer lines (Chapter 04 line-length law).
- 16-column 4K exists for the boardroom wall: it hosts *more panels*, never *wider text*.

## Vertical rhythm

- Base row: 8px. Component heights: controls 40px, inputs 48px, panel headers 48px,
  table rows 36/44/56px by density register (Chapter 02).
- Section spacing: 48px between panel groups, 64px between screen zones, 96px above the
  footer stratum.
- Nothing aligns to "optical center" — everything aligns to the grid; optical adjustments
  happen inside the component, not by nudging the component.

## Margins & containers

- Screen shell: fixed top bar (64px) + RTL side rail; the content viewport below/beside
  owns the grid.
- Container nesting depth ≤ 3 (screen → panel group → panel). Deeper nesting means the
  information architecture is wrong, not the grid.
- Full-bleed is reserved for the ambient stratum (cinema background, Kingdom map) and
  Boardroom hero moments — never for tables or forms.

## RTL specifics

- Grid origin, scroll affordances, and progressive columns all start right.
- Directional spacing uses logical properties (`margin-inline-start`), never left/right
  literals — the same rules serve any future LTR embedding without a second grid.

## Enforcement

A dimension not on the token ladder is a review finding. The only sanctioned escape is a
computed value derived from tokens (e.g., `calc(var(--space-24) + var(--row-8))`) — and
it must justify itself in the PR.
