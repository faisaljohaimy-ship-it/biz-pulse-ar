# UI/UX hardening — implementation & verification

Companion to `ux-ui-9-baseline.md`. Every number here was measured against a
running build with Playwright, not estimated.

## What changed and why

| Change | Files | Why |
|---|---|---|
| Functional text raised to a 12px floor | 229 `.tsx` + `styles.css` + 4 SVG sites | 1,163 utilities and 9 CSS/SVG declarations rendered at 6–11px. Executive data at 9px is unreadable one-handed in the field. Pure class-name/attribute substitution — no logic touched. |
| Arabic line-height band | `styles.css` | Arabic needs more leading than Latin; 1.6 body / 1.7 prose / 1.3 headings. |
| Touch-target floors | `styles.css` | 44×44 on coarse pointers, 40×40 on fine — the brief's two thresholds. Applied via `min-block-size`/`min-inline-size` inside `:where()`, so it can only ever GROW a control and never wins a specificity fight with a component. |
| Focus-visible ring | `styles.css` | The UA default is invisible on a dark holographic surface — keyboard operation was effectively impossible. |
| `prefers-reduced-motion` | `styles.css` | Was not honoured anywhere globally. |
| WebGL capability detection | `lib/graphics/webgl-capability.ts`, `use-webgl-supported.ts`, 4 scene components | Four `<Canvas>` mounts had no guard. Without WebGL, three.js constructs a renderer, fails, and retries on every render. Not mounting is the only fix that actually stops it. |
| Honest system health | `lib/system/system-health.ts`, `components/system/SystemStatusBadge.tsx`, `FourRegionHub.tsx` | «الأنظمة متصلة» was a hard-coded string that said "connected" while Supabase was unconfigured. A status indicator that cannot report a problem trains the operator to ignore it. |

### Design decisions worth stating
- **The root font-size was deliberately NOT changed.** Every Tailwind spacing
  and type utility is rem-based, so moving the root would silently rescale the
  whole product — including shrinking `text-xs` back below the new 12px floor.
- **`FinnScene` uses a hook, not a bare call.** `canUseWebGL()` answers false
  during SSR and true on the client; an early return on that value runs zero
  hooks on the server and N on the client, which React rejects at hydration.
- **The decorative digit rain in `FinnUnifiedBackground` was left small** — the
  brief permits it. The `FINN-CORE` watermark inside it was raised, because a
  label is text, not texture.

## Verified viewport matrix — 7 viewports × 5 routes = 35 combinations

Measured live via Playwright/Chromium against `vite dev`, computing styles on
every visible element that owns text.

| Metric | Before | After |
|---|---|---|
| Smallest rendered font | 6px | **12px on all 35** |
| Elements rendering below 12px | 1,163 in source | **0 on all 35** |
| Touch targets <44px on coarse pointers | up to 5 per route | **0 on all touch viewports** |
| Controls <40px on desktop | unmeasured | **0** (`/` `/risk` `/finn` `/sec`) |
| Horizontal overflow | 0 | **0 on all 35** |
| WebGL / three.js console errors | unguarded | **0 on all 35** |

Viewports: 375×667 · 390×844 · 844×390 · 768×1024 · 1366×768 · 1440×900 · 1920×1080.
Routes: `/` `/projects` `/risk` `/finn` `/sec`.

> The desktop rows report non-zero counts against a 44px threshold because the
> audit used one threshold everywhere. Re-measured against the brief's actual
> desktop floor of 40px, the count is **zero**.

## Tests added
- `lib/system/system-health.test.ts` — 15 cases. Includes the regression the
  brief asks for by name: five combinations of probe/online state, none of which
  may turn a missing config into `connected`. **Proven to bite** — deleting the
  config check fails 4 assertions.
- `lib/graphics/webgl-capability.test.ts` — 6 cases, including that the probe is
  actually issued (a guard that never asks proves nothing) and that the answer
  is cached (re-probing is itself a cause of context exhaustion).

## Quality gates
| Gate | Result |
|---|---|
| Build | PASS |
| Typecheck | PASS — 0 errors |
| Lint | PASS — 0 errors (35 pre-existing `any` warnings, none new) |
| Tests | PASS — **964** (was 943; +21) |
| Performance budget | PASS — 638 files inside every ceiling |
| Secret scan | PASS |
| Readability & touch (Gate C) | PASS — measured above |
| Responsive (Gate E) | PASS — zero overflow on all 35 |
| WebGL fallback | PASS — 0 errors, renderer never mounted without support |
| Supabase truthfulness | PASS — proven by test |
| Console (Gate B) | **NOT EVALUABLE** — see below |
| Production verification | **BLOCKED** — see below |

## Blockers
- **BLOCKED_PRODUCTION_VERIFICATION.** `neexios.com` is unreachable from this
  environment: the agent proxy answers `403` to `CONNECT` for that host (and for
  `*.supabase.co`). The published URL could not be opened, so LCP/INP/CLS on
  production, and the post-deploy check of the five routes, were not performed.
  Minimum action to clear: run the audit from a network that can reach the host,
  or allow it in the environment's network policy.
- **CONSOLE GATE NOT EVALUABLE.** `.env.local` points at a non-resolving
  `test-local.supabase.co`, so every route logs 1–6 environment errors that
  would mask real ones. Minimum action: point the local env at a reachable
  project, then re-run.

## Not done in this pass
Navigation consolidation, the home information hierarchy, FINN dialog semantics,
project/risk empty states, Arabic terminology mapping, and `Intl` number/date
formatting are **not** implemented. The platform ships **328 non-API routes**;
this pass deliberately spent its effort on the systemic layers that move every
route at once. The remaining items are per-screen work and are listed here
rather than claimed.
