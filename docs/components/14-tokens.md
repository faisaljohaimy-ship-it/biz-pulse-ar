# 14 — Component Tokens · رموز التصميم

**The nine ladders. Every value in docs 01–13 resolves to a token here; every token here
resolves to the Design Constitution. Naming per NAMING-CONVENTION
(`--nx-<ladder>-<step>`). Color tokens live in Constitution Ch. 03 and are not
re-declared.**

---

## 1 · Spacing tokens (Ch. 05)

| Token | Value | Primary use |
|---|---|---|
| `--nx-space-4` | 4px | intra-component micro gaps |
| `--nx-space-8` | 8px | icon-label gap, chip padding |
| `--nx-space-12` | 12px | dense cell padding |
| `--nx-space-16` | 16px | compact card padding, control padding |
| `--nx-space-24` | 24px | default panel padding, grid gap |
| `--nx-space-32` | 32px | boardroom padding, section gap |
| `--nx-space-48` | 48px | panel-group separation |
| `--nx-space-64` | 64px | screen-zone separation |
| `--nx-space-96` | 96px | pre-footer, hero breathing |

Semantic aliases: `--nx-panel-padding→24` · `--nx-grid-gap→24` (mobile 16) ·
`--nx-touch-min: 44px`.

## 2 · Radius tokens (Ch. 05/08)

`--nx-radius-8` chips/tags · `--nx-radius-12` buttons/inputs/notification cards ·
`--nx-radius-16` cards/panels (=`--radius`) · `--nx-radius-20` executive card & dialogs ·
`--nx-radius-full` rings/avatars/FAB. No other radii exist.

## 3 · Elevation tokens (Ch. 06)

`--nx-elev-0…5` bind the level recipes: each sets surface-alpha, shadow, blur, border
as one composite. Components reference the level, never the parts
(`elevation: var(--nx-elev-3)` conceptually; implementation maps to the recipe).

## 4 · Shadow tokens

| Token | Value |
|---|---|
| `--nx-shadow-e1` | `0 8px 24px rgb(2 8 17 / 0.45)` |
| `--nx-shadow-e2` | `0 12px 32px rgb(2 8 17 / 0.50)` |
| `--nx-shadow-e3` | `0 16px 40px rgb(2 8 17 / 0.55)` |
| `--nx-shadow-e4` | `0 24px 64px rgb(2 8 17 / 0.60)` |
| `--nx-shadow-e5` | = e4 (solidity, not shadow, distinguishes E5) |

## 5 · Glow tokens (Ch. 06 licensing)

| Token | Recipe | License |
|---|---|---|
| `--nx-glow-focus` | cyan 35% / 24px | keyboard focus, active input |
| `--nx-glow-sector` | `rgb(var(--nx-region-rgb))` 30% / 32px | region halos (RGB var set by region-context — existing mechanism) |
| `--nx-glow-agent` | layer-agent 25% / 24px | FINN/agent presence |
| `--nx-glow-authority` | gold 30% / 24px static | THE approval element |
| `--nx-glow-critical` | critical 40% / 16px | new critical alerts (2-pulse then static) |

## 6 · Animation tokens (Standards §3)

| Token | Value | Use |
|---|---|---|
| `--nx-anim-micro` | 100ms ease-out | press, toggle |
| `--nx-anim-fast` | 150ms ease-out | hover, exits |
| `--nx-anim-base` | 200ms ease-out | open/expand, tab slide |
| `--nx-anim-slow` | 300ms ease-out | large surface transitions |
| `--nx-anim-count` | 400ms ease-out | KPI count-up |
| `--nx-anim-breathe` | 2s ease-in-out infinite | licensed live loops |
| `--nx-anim-pulse-sector` | 4s ease-in-out infinite | sector halos |

Easing tokens: `--nx-ease-out: cubic-bezier(0.16,1,0.3,1)` ·
`--nx-ease-inout: cubic-bezier(0.65,0,0.35,1)`. No spring/bounce curves exist.

## 7 · Opacity tokens (Ch. 03 ladder)

`--nx-opacity-100/72/56/38/24/14/8/6/4` — content · secondary text · tertiary ·
disabled · layer borders · glass border strong · glass border soft · hover wash ·
glass highlight. Closed set.

## 8 · Blur tokens (Ch. 06 caps)

`--nx-blur-12` panels (E1) · `--nx-blur-16` raised/topnav · `--nx-blur-20` floating ·
`--nx-blur-24` dialogs (hard cap). Mobile tier clamps all to ≤ 12.

## 9 · Z-index (layer) tokens (Ch. 06 ladder)

`--nx-z-canvas:0 · --nx-z-panel:10 · --nx-z-raised:20 · --nx-z-chrome:30 ·
--nx-z-overlay:40 · --nx-z-modal:50 · --nx-z-toast:60 · --nx-z-voice:70`.

## Governance

Tokens are declared once (implementation phase: `src/styles.css` under the existing
token block), consumed everywhere, and versioned with the constitution. Adding a step to
any ladder is a constitutional amendment. A component PR introducing a raw value where a
token exists is an automatic finding — the ladders are the API between design law and
code.
