---
name: SADEED Premium Light Executive Directive v10.0
description: Light-layer palette/depth/typography reference for SADEED. Superseded on the theme-switch question — no switch exists (owner order 2026-09-10) and the default is dark.
type: design
---

# SADEED — Premium Light Executive Edition (owner directive v10.0, 2026-08-02)

**SUPERSEDED 2026-09-10 by the owner — READ THIS BEFORE ANY THEME WORK.**
The owner ordered: «أزل علامات وأيقونات تغيير الوضع والجرس والرجوع والهوم من
النظام كاملًا». There is **NO theme switch anywhere in SADEED**, and
`src/components/layout/ThemeToggle.tsx` no longer exists. **Do not recreate
it** — not in `__root.tsx`, not per-screen, not in settings.

What this file said before, and why it is now dangerous to follow: it _ordered_
a manual switch to exist and named `ThemeToggle.tsx` mounted opposite
`GlobalBackButton` as its home. Both files are deleted. A session that follows
the old text rebuilds a control the owner removed by explicit order.

Two further corrections to the text below: the permanent default is **dark**
(`DEFAULT_THEME = "dark"` in `src/lib/theme.tsx`), not light — SADEED's identity
was rebuilt dark on 2026-08-05; and the removal took the **control** only, so
the two-mode token layer (`.light` / `.dark`) stays intact and governed by
articles 32–34. The palette sections below still describe the light layer
correctly and remain useful as the light-mode reference.

The removal guard is `src/components/nav/top-chrome.contract.test.ts`.

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
