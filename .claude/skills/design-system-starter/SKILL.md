---
name: design-system-starter
description: Generate a starter design system — color palette, typography scale, spacing, radii, shadows, and core component tokens — from a brand direction or reference. Use when the user asks for design tokens, a style guide, a theme, or wants consistent UI foundations for a new product.
---

# Design System Starter

Turn a brand direction ("premium dark, navy/emerald, executive") into a usable, consistent token system and component foundations.

## When to trigger

- "Create a design system / style guide / theme for X"
- "Give me design tokens for this brand"
- Starting a new product UI and needing consistent foundations
- Converting a reference screenshot or moodboard into tokens

## Process

1. **Pin the direction**: subject, audience, and one-line personality (e.g., "executive command center — precise, calm, futuristic"). If a reference image exists, derive from it.
2. **Color**: 4–6 named base colors + semantic roles (canvas, surface, border, text-primary/secondary/muted, accent, success, warning, critical). Provide hex + usage note per token. Check text/surface pairs for WCAG AA contrast.
3. **Typography**: display, body, and data/utility faces with a modular scale (e.g., 1.25 ratio), weights, line-heights. For Arabic-first products pair an Arabic family (IBM Plex Sans Arabic / Tajawal) with a Latin companion and specify tabular numerals for data.
4. **Space & shape**: 4px-base spacing scale, radius scale, elevation/shadow levels (2–4 max).
5. **Motion**: 2–3 durations + one easing; note reduced-motion behavior.
6. **Core components**: token mapping for button (primary/secondary/ghost), input, card, badge — states included (default/hover/focus/disabled).
7. **Deliverables**: `design-tokens.json` (machine-readable) + a short human style guide. Offer CSS variables or Tailwind config on request.

## Rules

- Every token gets a semantic name (`surface-elevated`, not `gray-2`) and a one-line usage rule.
- Dark themes: never pure black canvas with pure white text; keep border colors translucent for depth.
- RTL: mirror-safe spacing (logical properties), minimum 44×44px touch targets.

## Quality bar

A developer can build a first screen using only the tokens, without inventing a single value.
