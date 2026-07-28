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

## 2. Card edges — NO GLASS
- Glass backgrounds and glass edges are BANNED on all FINN surfaces (owner directive).
- Forbidden: `backdrop-blur`, semi-transparent white fills, luminous frosted-glass rings, tinted borders on the outer card, halo rings around the face, arc brackets, `.finn-glass-edge` (kept as no-op only for legacy safety).
- If the card needs a rim, use a plain 1px dark border matching the digital backdrop — never a glass gradient.

## 3. Enforcement
- Any refactor touching `FinnHolographicPortal`, `FinnLiveHologram`, or `FinnScene` must preserve rules 1 & 2.
- If a new FINN surface is added, import `FINN_BG_BASE` — never re-derive colors, never reintroduce glass.
