---
name: SADEED Premium Light Executive Directive v10.0
description: Light-mode-only premium white glass design law for SADEED — palette, depth, typography, and the ban on dark mode/theme switches.
type: design
---

# SADEED — Premium Light Executive Edition (owner directive v10.0, 2026-08-02)

**AMENDED 2026-08-02/6 by the owner:** light stays the permanent DEFAULT, but a
manual light/dark switch is now required. `ThemeProvider` (`src/lib/theme.tsx`)
starts at `light`, never detects the OS theme, and persists the user's explicit
choice in `localStorage`. The single switch is the floating
`src/components/layout/ThemeToggle.tsx`, mounted once in `__root.tsx` opposite
`GlobalBackButton`. Do not re-add per-screen theme toggles (`HomeTopNav`,
cockpit NavFooter, `app-shell.tsx`, settings) — one switch only.

## Palette (tokens at the tail of `src/styles.css`, block `SADEED — PREMIUM LIGHT EXECUTIVE LAYER`)

- Primary Royal Blue `#1D4ED8` · Secondary Azure `#2563EB`/`#3B82F6` · Accent Soft Cyan `#06B6D4`
- Background pure white `#FFFFFF` · secondary pearl `#F8FAFC` · cards pure white
- Borders `#E5E7EB` · primary text `#111827` · secondary text `#6B7280`
- Success emerald `#059669` · warning amber `#D97706` · error ruby `#DC2626`
- Never: carbon black, deep navy backgrounds, dark glass, dark cards.

## Surface language

Premium white glass (`rgba(255,255,255,.72)` + blur 18 saturate 140%), 1px
`#E5E7EB` border, three elegant shadow steps `--sd-shadow-1..3`, hover =
elevation + 2px rise, 200ms `cubic-bezier(.16,1,.3,1)`. Legacy neon gloss
sweeps and holo aurora/grid/scan layers are damped (opacity ≤ .28 / .06).
Background = soft white gradient + faint blue/cyan ambient radials.

## Typography

Arabic: IBM Plex Sans Arabic / Tajawal / Cairo. Latin: Inter / SF Pro Display /
Space Grotesk. Global bold weight directive (700, headings 800) stays in force.

## Scope guard

This is a UI/UX layer only: business logic, APIs, database, auth, roles,
routing, modules, forms, reports and workflows are untouched.
