# 01 — Button System · نظام الأزرار

**`NxButton` (+ specialized siblings). Purpose: one grammar for every action in the OS —
the hand should recognize "actionable" instantly, and rank actions without reading.**

---

## Base spec (all buttons inherit)

| Property | Value |
|---|---|
| Height | sm 32 · md 40 · lg 48 · xl 56 (`--nx-space` ladder) |
| Padding-inline | sm 12 · md 16 · lg 24 · xl 32 |
| Radius | `--nx-radius-12` (sm: 8) — buttons are squarer than cards: instruments, not surfaces |
| Typography | Label 12 (sm) / Body-500 14–16; Arabic-first; icon gap 8 |
| Icon | `icon-16` (sm/md) · `icon-20` (lg/xl), leading side (right in RTL) |
| Motion | universal matrix (Standards §2/§3) |
| Focus | universal 2px cyan ring |
| A11y | Arabic accessible name; `aria-busy` when loading; min 44px touch box on touch tiers |

**States beyond the universal matrix — Loading:** label fades to 38%, inline 16px spinner
replaces the icon slot, width locked (no reflow), `aria-busy="true"`.

## The sixteen buttons

| Variant | Purpose | Visual style (overrides only) |
|---|---|---|
| **Primary** | THE action of the surface (max one per screen) | solid `--nx-cyan`, text `--nx-obsidian`, hover +4% lightness |
| **Secondary** | Strong-but-not-primary | solid `--nx-card`, text pearl, border white 14% |
| **Ghost** | Tertiary, inline, toolbars | transparent, text pearl 72→100% on hover, wash only |
| **Glass** | Actions living on ambient/holographic strata | glass surface 65% + blur 12 + border 10% |
| **Outline** | Neutral alternative beside a Primary | transparent, 1px `--nx-cyan` @ 60% border, cyan text |
| **Danger** | Destructive, irreversible | solid `--nx-critical`, obsidian text; **always paired with confirm modal (doc 08)** |
| **Warning** | Risky-but-reversible | outline style in `--nx-warning`; never solid (yellow floods) |
| **Success** | Confirm/complete in flows | solid `--nx-success`, obsidian text; only inside flow contexts |
| **Icon Button** | Single-glyph action | square (height=width), icon only, mandatory `aria-label` + tooltip ≥ 500ms |
| **FAB** | The screen's floating quick action (mobile/tablet mostly) | 56px circle, Primary colors, E3 elevation, bottom-**left** (RTL trailing), max one |
| **Floating** | Contextual floating bar actions (selection toolbars) | Glass variant at E3 in a floating group |
| **Runtime Button** | Module/system operations (restart, load) | Secondary base + `--nx-layer-runtime` 24% border + runtime glyph; **requires confirm for state-changing ops** |
| **Executive Action** | Decision-grade acts (approve directive, sign) | lg/xl only, solid gold `--nx-gold`, obsidian text, static authority glow; **one per screen — the Constitution's single-gold law** |
| **Loading Button** | Not a variant — the loading state of any variant | see base; documented separately because it is a review checkpoint |
| **Voice Button** | Push-to-talk / FINN listening | 48–56px circle, glass base; listening = agent-glow breathing ring (2s); recording = solid critical dot glyph; `aria-pressed` semantics |
| **FINN Button** | Invoke/summon FINN | Ghost base + agent presence ring on icon + `--nx-layer-agent` text; appears identically OS-wide (one summon affordance) |

## Hierarchy law

Per surface: ≤ 1 Primary, ≤ 1 Executive Action (they never co-exist — an Executive
Action *is* the primary), ≤ 2 Secondary; everything else Ghost/Outline/Icon. Danger never
sits adjacent to Primary (fat-finger law: 8px minimum gap + order separation).

## Animation notes

Voice Button's breathing ring and FINN Button's presence ring are the only looping
buttons (they display *state*: listening/available). All other button motion is
transactional micro-motion. Reduced-motion: rings freeze at 60% intensity.

## RTL note

Icon leads on the right; loading spinner replaces the icon slot in place; FAB anchors
bottom-left (trailing). In LTR embeddings all of this mirrors automatically via logical
properties.
