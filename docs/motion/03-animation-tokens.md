# 03 — Animation Tokens · رموز الحركة

**The single vocabulary implementations may use. Extends the component token ladder
(components doc 14 §6) — durations/easings there are the base; this doc completes the
motion-specific set. Declared once (implementation phase) beside the existing token
block in `src/styles.css`.**

---

## Duration tokens

```
--nx-anim-micro:      100ms;   /* press, toggles, focus */
--nx-anim-fast:       150ms;   /* hover, exits */
--nx-anim-base:       200ms;   /* open, expand, toast */
--nx-anim-slow:       300ms;   /* large surfaces */
--nx-anim-cinematic:  600ms;   /* boardroom reveals only */
--nx-anim-count:      400ms;   /* KPI count-up */
--nx-anim-stagger:    30ms;    /* list mount step */
```

## Easing tokens

```
--nx-ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--nx-ease-inout:  cubic-bezier(0.65, 0, 0.35, 1);
--nx-ease-linear: linear;
```

## Loop tokens

```
--nx-loop-breathe:      2s;    /* presence, listening rings */
--nx-loop-pulse-sector: 4s;    /* region halos */
--nx-loop-shimmer:      2s;    /* skeleton sweep */
--nx-loop-ambient:      8s;    /* holographic drift */
--nx-loop-dots:         1.2s;  /* FINN thinking dot wave (v1.0.1 amendment) */
--nx-loop-dash:         3s;    /* twin energy-flow dash drift (v1.0.1 amendment) */
--nx-loop-ticker:       linear, speed 24px/s;  /* event ticker */
```

## Distance tokens (motion amplitude)

```
--nx-move-1: 1px;    /* press translate */
--nx-move-4: 4px;    /* card entrance rise */
--nx-move-8: 8px;    /* toast slide */
--nx-move-16: 16px;  /* parallax max, drawer peek */
--nx-move-24: 24px;  /* absolute translation ceiling for content */
```

Full-distance travel (drawers, sheets) animates transform from off-canvas — the ceiling
applies to *content within view*, not container entry.

## Spring configurations (Framer Motion)

Springs are permitted **only critically damped** — zero overshoot, visually equivalent
to ease-out with natural interruption handling (the constitutional bounce ban stands):

```ts
export const NX_SPRINGS = {
  /* interchangeable with --nx-anim-base ease-out */
  panel:  { type: "spring", stiffness: 420, damping: 42, mass: 1, bounce: 0 },
  /* micro interactions */
  micro:  { type: "spring", stiffness: 700, damping: 50, mass: 0.8, bounce: 0 },
  /* large surfaces (drawer/fullscreen) */
  surface:{ type: "spring", stiffness: 300, damping: 38, mass: 1.1, bounce: 0 },
} as const;
```

Rule: `bounce: 0` (or damping ≥ critical) is non-negotiable; any config producing
overshoot fails review. Springs are preferred over duration curves ONLY where motion is
interruptible mid-flight (drags, dismissable sheets); otherwise use duration tokens.

## Keyframe vocabulary (named, closed set)

| Name | Definition | License |
|---|---|---|
| `nx-fade-in` | opacity 0→1 | universal |
| `nx-rise-in` | opacity 0→1 + translateY 4px→0 | cards, toasts |
| `nx-scale-in` | opacity 0→1 + scale .98→1 | dialogs, palette |
| `nx-breathe` | glow/opacity 60%↔100% | presence loops |
| `nx-pulse-ring` | ring scale 1→1.15 + fade, ×2 then stop | critical alerts |
| `nx-shimmer` | gradient sweep RTL (right→left) | skeletons |
| `nx-dot-wave` | 3 dots stagger-bounce (opacity only) | FINN thinking |
| `nx-sweep` | light band traverse | holographic (doc 05) |
| `nx-count` | numeric interpolation | KPI (JS-driven) |

New keyframes require a motion-system amendment — the vocabulary is closed so every
screen *moves* recognizably NEXIOS.

## Reduced-motion mapping (token-level)

Under `prefers-reduced-motion: reduce`, tokens re-map globally:
all `--nx-anim-*` → 1ms · all `--nx-loop-*` → paused at designed static frame ·
`--nx-move-*` → 0 · springs → duration 1ms. Components inherit parity automatically by
consuming tokens — this is why raw values are banned.
