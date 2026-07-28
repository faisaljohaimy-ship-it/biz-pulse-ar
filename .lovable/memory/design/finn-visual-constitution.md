---
name: FINN Visual Constitution
description: Locked visual rules for FINN's card — dark digital backdrop (#061525) via FinnUnifiedBackground, glass edge glow via .finn-glass-edge. No tinted borders or glass overlays inside.
type: design
---

# FINN Visual Constitution (LOCKED)

## 1. Background — dark digital (no exceptions)
- Single source of truth: `src/components/home/FinnUnifiedBackground.tsx`.
- Base tokens (exported constants, do NOT hardcode elsewhere):
  - `FINN_BG_BASE = "#061525"` — card fill
  - `FINN_BG_CORE = "#0a2036"` — radial center
  - `FINN_BG_EDGE = "#030c17"` — radial rim
- Composition = radial dark gradient + PCB traces + digital grid + code rain + LED pulses, all muted (`multiply` overlay unifies tone).
- Every FINN surface (portal, R3F scene, hologram) MUST use `#061525` as the solid backdrop and render `<FinnUnifiedBackground />` when a decorated card is needed.
- Forbidden on FINN surfaces: light/glass fills, `backdrop-blur` panels, semi-transparent whites, tinted borders on the outer card, halo rings around the face, arc brackets.

## 2. Card edges — glass luminous ring
- The FINN card wrapper MUST carry class `finn-glass-edge` (defined in `src/styles.css`).
- It provides:
  - a 1px linear-gradient "frosted-glass" border via `::before` mask trick (white → cool blue → white),
  - a breathing outer halo (`nx-finn-glass-breathe`, 6s) in cool cyan-white — the "glass color".
- Do NOT add extra `border-*` or `shadow-*` utilities on the same element; they double the ring and dull the glass effect.
- Respects `prefers-reduced-motion` (animation off).

## 3. Enforcement
- Any refactor touching `FinnHolographicPortal`, `FinnLiveHologram`, or `FinnScene` must preserve rules 1 & 2.
- If a new FINN surface is added, import `FINN_BG_BASE` and apply `.finn-glass-edge` — never re-derive colors.
