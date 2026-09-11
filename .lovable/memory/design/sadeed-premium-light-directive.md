---
name: SADEED Premium Light Executive Directive v10.0
description: Light-layer palette/depth/typography reference for SADEED. Superseded on the theme-switch question — one switch exists, scoped to the home page, and the default is dark.
type: design
---

# SADEED — Premium Light Executive Edition (owner directive v10.0, 2026-08-02)

**SUPERSEDED — READ THIS BEFORE ANY THEME WORK (current as of 2026-09-11).**

There is exactly **ONE** theme switch in SADEED and it is **scoped to the home
page only** (`/` and its alias `/blueprint`). Its single source is
`src/components/nav/TopChrome.tsx`, mounted once in `__root.tsx`. **Do not add a
second one** — not per-screen, not in settings, not in the shell header. A page
that mounts its own toggle stacks it on the pinned one (measured: 8px apart).

History, so the old text below is not followed by mistake: this file once
_ordered_ a switch to exist and named a `ThemeToggle.tsx` mounted opposite a
`GlobalBackButton`. Both files are gone — the whole top chrome was removed on
2026-09-10 («أزل … من النظام كاملًا»), then three of the four controls returned
on 2026-09-11 with explicit scopes (theme on home; home button on pages that
need it; back where a parent exists). The notification bell was not asked back
and did not return.

One more correction to the text below: the permanent default is **dark**
(`DEFAULT_THEME = "dark"` in `src/lib/theme.tsx`), not light — SADEED's identity
was rebuilt dark on 2026-08-05. The two-mode token layer (`.light` / `.dark`)
is governed by articles 32–34 and is untouched by any of the above. The palette
sections below remain the correct light-layer reference.

The contract guard is `src/components/nav/top-chrome.contract.test.ts`.

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
