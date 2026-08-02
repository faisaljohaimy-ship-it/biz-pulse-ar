# UI/UX hardening — baseline

Non-destructive audit taken before any edit.

## Repository

|                      |                                                                             |
| -------------------- | --------------------------------------------------------------------------- |
| Root                 | `/home/user/biz-pulse-ar`                                                   |
| Branch               | `claude/security-system-structure-3unljf`                                   |
| SHA at baseline      | `d644e1542d349ee2e8c538d11ed739ef39a9e8e6`                                  |
| Default branch       | `main` (from `git remote show origin`; `refs/remotes/origin/HEAD` is unset) |
| `git status --short` | clean — no user changes were present or overwritten                         |
| Package manager      | npm (`package-lock.json`)                                                   |

## Stack (verified from package.json, not assumed)

React 19.2 · Vite 7.3 · TanStack Router 1.168 / Start 1.167 · Tailwind 4.2 ·
three 0.185 + @react-three/fiber 9.6 · @supabase/supabase-js 2.106 ·
vitest 4.1 · @playwright/test 1.61

Scripts that exist: `dev build lint typecheck test test:e2e check:performance
check:secrets check:deadcode format`. No script was invented.

## Route reality vs. the brief

The brief names `/sec/kpi` and `/sec/projects`. **Neither exists.** The repo
ships **328 non-API routes**; the real equivalents are `/sec`, `/projects`,
`/risk`, `/finn`. The audit ran against `/`, `/projects`, `/risk`, `/finn`, `/sec`.

## Key files

- App shell / nav: `src/components/app-shell.tsx`, `src/components/nav/HomeTopNav.tsx`,
  `src/components/cockpit/navigation.tsx`, `src/components/sec/sec-shell.tsx`
- Home: `src/routes/index.tsx`, `src/components/home/FourRegionHub.tsx`
- FINN: `src/components/finn-core/FinnCopilot.tsx`, `src/components/home/FinnLiveHologram.tsx`
- 3D: `SectorGlobeScene.tsx`, `RegionGlobeScene.tsx`, `FinnLiveHologram.tsx`,
  `digital-humans/r3f/FinnScene.tsx`

## Measured baseline

| Criterion                         | Before                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Build                             | Pass                                                                                             |
| Typecheck                         | Pass (0 errors)                                                                                  |
| Lint                              | Pass (0 errors, 34 warnings)                                                                     |
| Tests                             | Pass (943)                                                                                       |
| Smallest functional font (source) | **6px** — 1,163 occurrences below 12px across 229 files                                          |
| — distribution                    | 606×10px · 409×11px · 94×9px · 30×8px · 11×8.5px · 4×9.5px · 3×7px · 3×7.5px                     |
| Sub-12px CSS declarations         | 3 (`0.625rem`, `0.68rem`, `9.5px`)                                                               |
| Sub-12px SVG `<text>`             | 6                                                                                                |
| Horizontal overflow               | 0 (already clean — a pre-existing `overflow-x: hidden` guard)                                    |
| WebGL capability detection        | **absent** — `canUseWebGL` in 0 files; 4 unguarded `<Canvas>` mounts                             |
| Supabase health truthfulness      | **misleading** — «الأنظمة متصلة» hard-coded at `FourRegionHub.tsx:258`, independent of any probe |
| Identity strings                  | ARIA 48 · NEXIOS 253 · NEEXIOS 1 · "Nexus AI OS" 37 · «FINN جاهزة» 2 · «FINN الموحّدة» 2         |
| Global reduced-motion honouring   | absent                                                                                           |
| Global focus-visible ring         | absent                                                                                           |
| Touch-target floor                | none — no global rule at any breakpoint                                                          |

## Console errors in the local environment (pre-existing, not introduced)

`.env.local` points at `test-local.supabase.co`, which does not resolve and is
additionally blocked by this environment's network policy. Every route therefore
logs 1–6 resource errors (404 / `ERR_CONNECTION_RESET` / realtime WebSocket
failure). These are environment artefacts, not application defects, and are
excluded from the console gate — with the consequence that the console gate
cannot be fully evaluated here.
