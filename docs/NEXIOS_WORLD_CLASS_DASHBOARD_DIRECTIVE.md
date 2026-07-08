# NEXIOS · WORLD-CLASS EXECUTIVE DASHBOARD DIRECTIVE

> **Prompt of Record — Principal AI Software Architect Mandate**
> **Target surface:** `/os` (Enterprise Operating System — first screen of the platform)
> **Status:** ACTIVE · Additive-only · Freeze-safe · Evidence-gated
> **Language:** AR primary · EN parity · RTL-perfect
> **Doctrine:** Sovereign · Cinematic · Silent Confidence

---

## 1. MISSION

Transform `/os` into the **most luxurious, cinematic, and AI-native executive dashboard ever
shipped** — a sovereign command deck that a Minister, a CEO, and a Field Commander can
each read in under 3 seconds, in Arabic or English, on a phone or on a wall display.

It must feel **inevitable**: as if the world's best design studio, the world's best AI lab,
and the world's best security operations center collaborated on a single artifact.

No hype text. No fake metrics. No decorative charts. Every pixel earns its place with
verified operational evidence via the FR-19 Evidence Gate.

---

## 2. IDENTITY & VOICE

| Axis | Rule |
|------|------|
| Persona | Executive partner briefing a Director — calm, precise, decisive. |
| Palette | Base `#061A2E` · Primary `#00D4FF` · Secondary `#3AE8FF` · dark-locked. |
| Type | Geometric, tabular numerics, generous tracking on labels. |
| Motion | Motion for React, 60fps p95, reduce-motion honored. |
| Depth | Glass · parallax · specular highlights — never skeuomorphic. |
| Sound | ARIA voice only via `/api/tts`; no browser SpeechSynthesis in chat. |

---

## 3. INFORMATION ARCHITECTURE (fixed order)

1. **Command Deck** — ARIA presence, mission clock, health pulse, session state.
2. **Live Pulse Row** — sites, assets offline, contractors active, runtime pulse.
3. **Executive KPIs** — 6 sovereign tiles (Critical, Open Incidents, Patrols,
   CCTV Alerts, Visitors, Permits) — all via `<EvidenceBadge>`.
4. **Decision Queue** — top decisions awaiting executive action (evidence-linked).
5. **Predictive Strip** — ARIA-derived forward indicators (evidence-linked).
6. **Runtime Modules** — deep-link tiles to every subsystem.

---

## 4. NON-NEGOTIABLE RULES

- `additiveOnly: true` — never delete or rebuild existing routes/components.
- `tokensOnly: true` — no hardcoded colors in JSX; use `src/styles.css` tokens.
- `evidenceRequired: true` — every metric/status/LIVE badge via `<EvidenceBadge>`.
- `singletonLock: ["BRAIN", "PROVIDER", "VOICE", "AVATAR", "MEMORY"]`.
- `bilingualParity: true` — every string ships AR + EN with RTL correctness.
- `responsiveParity: true` — 360px phone → 4K wall; no clipped tiles, no scroll traps.

---

## 5. PERFORMANCE BUDGET

| Metric | Target |
|--------|--------|
| LCP | ≤ 1.2s |
| INP | ≤ 120ms |
| CLS | ≤ 0.02 |
| Bundle (route) | ≤ 180 KB gz |
| Memory (24h) | stable · zero leak |
| Lighthouse | ≥ 98 (Perf/A11y/BP/SEO) |

---

## 6. DEFINITION OF DONE

- 0 TypeScript errors · 0 deferred phases in ARIA audit.
- 0 hardcoded color literals in `/os` component tree.
- 0 static `LIVE` / `بث مباشر` strings — all badges evidence-gated.
- 0 duplicate ARIA singleton mounts.
- Mobile & desktop screenshots verified: **full dashboard renders without clipping**.
- Executive Card E2E: PASS.
- First-impression paint ≤ 200ms; ARIA greeting delivered once, silently.

---

## 7. EXECUTION PROTOCOL (autonomous)

1. Audit current `/os` for gaps against §3.
2. Add missing zones as **new components under `src/components/os/`**; never edit
   existing tile navigation.
3. Wire every value to `sec_overview` via the public `os-overview` endpoint
   (cached 15s) or an authenticated `createServerFn` when scoped.
4. Compose zones into `/os` in the fixed order.
5. Verify: `tsgo --noEmit`, phase audit, mobile+desktop Playwright screenshots.
6. Stop when §6 is satisfied. Report only: Files, Optimizations, Metrics, Score.

---

*This document is the prompt of record. Any change to `/os` must cite this file.*
