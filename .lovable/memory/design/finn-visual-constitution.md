---
name: FINN Visual Constitution
description: Locked visual rules for FINN's card — solid dark digital backdrop (#061525) via FinnUnifiedBackground. No glass, no backdrop-blur, no tinted borders, no halo rings, no arc brackets.
type: design
---

# FINN Visual Constitution (LOCKED)

## 1. Background — dark digital, solid (no exceptions)
- Single source of truth: `src/components/home/FinnUnifiedBackground.tsx`.
- Base tokens (exported constants, do NOT hardcode elsewhere):
  - `FINN_BG_BASE = "#061525"` — card fill
  - `FINN_BG_CORE = "#0a2036"` — radial center
  - `FINN_BG_EDGE = "#030c17"` — radial rim
- Composition = radial dark gradient + PCB traces + digital grid + code rain + LED pulses, all muted (`multiply` overlay unifies tone).
- Every FINN surface (portal, R3F scene, hologram) MUST use `#061525` as the solid backdrop and render `<FinnUnifiedBackground />` when a decorated card is needed.

## 2. Card edges — GLASS GLOSS (owner override 2026-08-02)
- Glass backgrounds and glass edges are BANNED on all FINN surfaces (owner directive).
- Forbidden: `backdrop-blur`, semi-transparent white fills, luminous frosted-glass rings, tinted borders on the outer card, halo rings around the face, arc brackets, `.finn-glass-edge` (kept as no-op only for legacy safety).
- If the card needs a rim, use a plain 1px dark border matching the digital backdrop — never a glass gradient.

## 3. Enforcement
- Any refactor touching `FinnHolographicPortal`, `FinnLiveHologram`, or `FinnScene` must preserve rules 1 & 2.
- If a new FINN surface is added, import `FINN_BG_BASE` — never re-derive colors, never reintroduce glass.


## 4. AMENDMENT 2026-08-02 (owner directive, supersedes rule 2)
- All cards, panels and icons are permanently glossy glass in BOTH themes (gloss layer at the end of `src/styles.css`).
- FINN's card is glossy glass in dark and light alike; `.finn-glass-edge` is a real glass surface again.
- **Light mode is the permanent default theme** (`<html class="light">`, ThemeProvider default `light`).
