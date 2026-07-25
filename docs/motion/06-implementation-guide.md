# 06 — Implementation Guide · دليل التنفيذ

**How the motion system becomes code — patterns, performance law, and the division of
labor between CSS and Framer Motion. Guidance for later implementation phases; nothing
here is implemented in this phase.**

---

## Division of labor

| Use CSS (transitions/keyframes) | Use Framer Motion |
|---|---|
| Hover/press/focus micro-motion | Presence choreography (mount/unmount with exit animations) |
| Loops (breathe, shimmer, pulse, ticker) | Layout animations (height auto, shared-element continuity) |
| Update ticks, sweeps, flashes | Interruptible gestures (drag, sheet dismiss) with NX_SPRINGS |
| Everything expressible with tokens + pseudo-states | Staggered orchestration (list mounts, pipeline packets) |

Rule: reach for CSS first — it's cheaper, SSR-safe and token-native. Framer Motion earns
its bundle cost only for exit/layout/gesture jobs CSS can't do. **AriaCopilot/voice
surfaces keep their frozen performance contract** — no new animation libraries enter
those paths (doctrine: performance budget is law; `MessageResponse`-class regressions
are the cautionary tale).

## CSS patterns

```css
/* tokens only — raw ms/curves are findings */
.nx-hover-surface { transition: background var(--nx-anim-fast) var(--nx-ease-out),
                                border-color var(--nx-anim-fast) var(--nx-ease-out); }

/* licensed loop, GPU-friendly properties only */
@keyframes nx-breathe { 0%,100% { opacity:.6 } 50% { opacity:1 } }
.nx-presence { animation: nx-breathe var(--nx-loop-breathe) var(--nx-ease-inout) infinite; }

/* reduced motion — token remap, one place */
@media (prefers-reduced-motion: reduce) {
  :root { --nx-anim-micro:1ms; --nx-anim-fast:1ms; --nx-anim-base:1ms;
          --nx-anim-slow:1ms; --nx-anim-cinematic:1ms; }
  .nx-presence, .nx-shimmer, .nx-ticker { animation-play-state: paused; }
}
```

## Framer Motion patterns

```tsx
// variants mirror spec tables 1:1 (review diffs them)
const panelVariants = {
  hidden:  { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: NX_SPRINGS.panel },
  exit:    { opacity: 0, transition: { duration: 0.15, ease: NX_EASE_OUT } },
};

// stagger law encoded once, reused
const listVariants = { visible: { transition: { staggerChildren: 0.03 } } };

// pipeline packet: transform-only travel
<motion.div style={{ offsetPath: `path("${channel}")` }}
  animate={{ offsetDistance: "100%" }} transition={{ duration: 0.3, ease: "linear" }} />
```

- `AnimatePresence` for every exit spec'd in docs 04–05.
- `layout` animations for panel expand/collapse (height auto) — never JS height math.
- `useReducedMotion()` gates every JS-driven loop (count-ups swap instantly).

## GPU optimization rules (Section 14)

1. **Animate only `transform`, `opacity`, `filter` (sparingly), and CSS custom
   properties consumed by those.** Never top/left/width/height/margin/box-shadow
   directly — shadows animate via pre-rendered layered elements crossfading.
2. `will-change` applied just-in-time (on interaction intent), removed after — standing
   `will-change` on lists is a memory leak in costume.
3. Blur is composited cost: animated blur is banned; blur values are static per
   elevation, only opacity of the blurred layer animates.
4. Layout thrash ban: reads batched before writes; no `getBoundingClientRect` inside
   rAF loops; ResizeObserver over polling.
5. 60fps target: any animation missing frame budget on a mid-tier device drops
   ornamentation first (holographic → stagger → micro), never correctness. Frame budget
   verified with DevTools performance traces on the doctrine viewports.
6. Lazy animation: off-viewport loops pause (`IntersectionObserver`); background tabs
   pause everything (`visibilitychange`); the ticker and twin loops respect both.
7. Battery: on `navigator.getBattery` low or mobile tier — ambient/holographic OFF,
   loops slow to 2× period (calm degrades gracefully; meaning never degrades).
8. Concurrency caps: ≤ 2 holographic effects, ≤ 8 stagger participants, ≤ 12 animated
   twin lines, ≤ 3 simultaneous non-loop animations per viewport.

## Testing motion

- Reduced-motion parity is a test case per component (information identical, frozen
  frames designed).
- The demo-readiness sweep (390 / 1280) includes a motion pass: no jank on route
  change, no loop running on a screen the user left.
- Performance budget script remains the final referee for bundle impact of any motion
  dependency.
