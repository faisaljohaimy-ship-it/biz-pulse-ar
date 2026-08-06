# Chapter 07 — Iconography

**One icon language for the whole OS: geometric, stroked, calm — light instruments on
obsidian.**

---

## Foundation

SADEED icons are **stroke icons** (lucide-family grammar): consistent stroke, rounded
joins, minimal interior detail — they must survive 16px chips and 96px boardroom tiles
alike. Icons are instruments, not illustrations: they clarify, label and signal; they
never decorate.

## Sizes (8pt-locked)

| Token     | Size | Stroke | Use                               |
| --------- | ---- | ------ | --------------------------------- |
| `icon-16` | 16px | 1.5px  | chips, table cells, inline labels |
| `icon-20` | 20px | 1.5px  | buttons, inputs, nav rail         |
| `icon-24` | 24px | 2px    | panel headers, default            |
| `icon-32` | 32px | 2px    | feature tiles, empty states       |
| `icon-48` | 48px | 2.5px  | module tiles, hero moments        |
| `icon-96` | 96px | 3px    | boardroom / cinema only           |

Stroke scales with size so optical weight stays constant. Never scale an icon between
tokens — pick the token.

## Geometry rules

- 24px design grid, 2px padding safe-area, corner radius on joins = stroke width
  (rounded, not circular).
- Filled variants exist only for **state** (selected nav, active toggle) — fill is the
  "on" of the same icon, never a different icon.
- Mirroring under RTL: directional icons (arrows, chevrons, "send") mirror; physical
  objects, checkmarks, clocks and Latin-glyph icons do not.

## Interaction states

| State            | Treatment                                                           |
| ---------------- | ------------------------------------------------------------------- |
| Rest             | pearl @ 72%                                                         |
| Hover            | pearl @ 100% + 6% wash behind (no movement)                         |
| Pressed          | pearl @ 100%, translate 1px down, wash 8%                           |
| Active/Selected  | accent color (cyan or context accent) + filled variant if it exists |
| Disabled         | pearl @ 38%, no hover response                                      |
| Focus (keyboard) | 2px cyan ring, radius +2px                                          |

Icons never change _size_ on state — size shifts read as layout bugs.

## Animated icons

Motion license (aligned with Principle 6 — state change only):

- **Micro-transitions** (≤ 200ms, ease-out): hamburger↔close, play↔pause, chevron rotate.
- **Live indicators** (looping, ≥ 2s cycle, subtle): recording dot, agent presence ring,
  sync spinner — these are _state displays_, allowed to loop while the state persists.
- Everything else is static. `prefers-reduced-motion` freezes all loops to static state
  frames.

## Executive icons

Icons in Boardroom register (48/96px) get the executive treatment: 2.5–3px stroke,
optional soft glow _only if_ they carry the screen's single meaning (Chapter 06 glow
law), and a 1.5:1 minimum clear-space ratio. Executive icons never sit in crowds — one
per tile.

## Agent icons

Every agent (FINN and specialists from the Adaptive Shell) has: a **presence ring**
(2px, `--nx-layer-agent`, pulsing only while the agent is live), a monogram or glyph at
the ring's center, and a **mode glyph** at the bottom-left (RTL: bottom-left = trailing):
advisory (💬 speech-stroke glyph), supervised (👁 eye-stroke), gated (🔒 lock-stroke).
The mode glyph is constitutional: an executive must always see _what an agent is allowed
to do_ at a glance.

## Runtime icons

Architectural strata use fixed glyph + layer color pairs (Chapter 03 §5): Runtime = ring
of nodes (exec cyan), Adaptive Shell = hexagon (shell violet), Agents = concentric rings
(cyan), Knowledge = book-stroke (info blue), Digital Twin = mirrored square (twin cyan),
Analytics = trend-stroke (analytics blue). These pairs are permanent — a module chip
anywhere in the OS is identifiable by silhouette alone, colorblind-safe by shape.

## Prohibitions

❌ Emoji as UI icons · ❌ two icon families on one screen · ❌ icons as the only carrier of
critical meaning (always pair with Arabic label at 16/20px sizes in tier-1 content) ·
❌ recoloring icons with status colors unless the icon _is_ the status glyph.
