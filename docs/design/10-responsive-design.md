# Chapter 10 — Responsive Design

**One design, every glass: from a 390px phone in the field to a 4K boardroom wall.**

---

## Philosophy of adaptation

NEXIOS does not shrink to fit — it **re-prioritizes**. The tier ladder (Chapter 05) sets
the grid; this chapter sets _what survives_ at each size. The invariant across all sizes:
the executive question sequence (Chapter 09) remains answerable, in order, without
horizontal scrolling, in RTL.

## The tiers and their contracts

### Mobile (< 640px, portrait) — الجوال

The glance device. Contract:

- Hero first, full-width; context panels stack beneath in reading order.
- Tier-3 periphery collapses into an expandable section; tier-4 ambient reduces to a
  static gradient (no cinema, no parallax — battery and budget law).
- Touch targets ≥ 44×44px; primary action within thumb reach (bottom 40%).
- Tables become key-value cards; charts become sparklines + verdict; never pinch-zoom UI.
- Reference viewport for QA: **390×844** (the doctrine's demo width).

### Landscape phone / small tablet (640–1023px) — الأفقي واللوح الصغير

- 8-column grid; hero spans full width, context pairs 2-up.
- Landscape phones get the _same_ composition as portrait with paired context — never a
  squeezed desktop.
- Video/cinema surfaces may return (muted, capped 720p-class assets).

### Tablet (768–1023px, the field device) — اللوح

- The inspection tier: drawers open side-by-side (drawer takes 45%, content compresses).
- Operations register becomes fully usable (real tables, 44px rows).
- Stylus/touch parity: hover-revealed content must also be tap-reachable.

### Desktop (1024–1535px) — سطح المكتب

- The reference design target: 12 columns, full four-tier composition, all registers.
- QA reference viewport: **1280×800** (doctrine's laptop width).

### Ultra-wide (1536–2559px) — الشاشة العريضة

- Content max 1600px centered (Chapter 05); freed margins host the ambient stratum and
  optional pinned FINN rail — reading lines never stretch.
- Multi-panel workspaces may place two Command-register groups side by side; never one
  group stretched.

### 4K / Large displays / Boardroom wall (≥ 2560px) — الجدار التنفيذي

- Boardroom register everywhere: Display-XL/96 type, 16-column grid, ≤ 5 objects.
- Viewing distance 3–5m: minimum body 18px-equivalent, contrast pairs re-checked at
  ambient-light penalty (assume −1 contrast step; Chapter 03 AAA pairs absorb this).
- Cursor-free assumption: the wall is a _display_ surface — nothing on it may require
  hover; interactions happen from the presenter's device.
- Cinema and holographic strata run at full glory here — this is their home tier.

## Density shifting

Registers map to tiers by default: Mobile → Boardroom-like sparsity (few objects, big
type) at _small_ scale; Desktop → Command; Wall → Boardroom. The Operations register
never appears below the tablet tier. A screen may pin its register (a log viewer is
Operations everywhere ≥ tablet) but must declare it.

## RTL responsiveness

- Column collapse preserves RTL reading order: the top-right panel remains first after
  stacking.
- Drawers and disclosure open from the left edge (leftward = deeper), at every tier.
- Logical properties only (Chapter 05) — breakpoints never introduce physical left/right.

## Motion & performance across tiers

- Mobile: blur ≤ 12px, no parallax, no looping ambient video; skeletons still animate.
- Reduced-motion users: identical information at every tier, loops frozen (Chapters 02/07).
- The performance budget applies per tier: heavier tiers earn richness by having the
  pixels, not by exemption from the budget.

## Testing law

Every screen ships only after passing, as a visitor, at minimum: **390×844** and
**1280×800** (doctrine widths), plus 2560×1440 for any screen that can appear on the
boardroom wall. No infinite loaders, no horizontal scroll, no RTL breakage at any of the
three — the same bar the demo-readiness doctrine already enforces, now constitutional.
