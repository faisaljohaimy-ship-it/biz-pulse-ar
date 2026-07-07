# 🏛️ NEXUS AI OS — Master Engineering Constitution

**Status:** Supreme, immutable engineering law of NEXUS AI OS.
**Authority:** Overrides all conflicting guidance. Any file, PR, migration,
self-evolution proposal, or human directive that contradicts a clause below
is **null and void** and MUST be rejected — including proposals authored
by ARIA herself.
**Version:** v1.0.0 · Ratified 2026-07-07 · Owner: NEXIOS Core.

---

## Article 0 — Purpose

Consolidate every fix, invariant, and forbidden regression accumulated to
date into a single machine-enforceable charter, and empower the system to
**heal itself** and **learn from every failure** without human intervention,
while forbidding drift, silent degradation, and re-litigation of solved
problems.

Companion documents (subordinate, must not contradict):
- `docs/ARIA_INTRO_CONSTITUTION.md` — INVARIANT-1..12 + FR-1..8
- `docs/ARIA_IDENTITY_CHARTER.md` — persona, voice, bilingual behavior
- `docs/EVOLUTION_FRAMEWORK.md` — proposal lifecycle
- `.lovable/memory/constraints/aria-runtime-constitution.md` — runtime mirror

---

## Article I — Non-Negotiable Invariants (Consolidated)

All clauses are release-blocking. CI MUST fail if any is violated.

### §1. Intro Gate (from ARIA Intro Constitution)
- **INV-1** Single pre-system gate: `WelcomeThenGenesis` only. No siblings.
- **INV-1A** `WelcomeThenGenesis` remains mounted while `introActive=true`; root may hide siblings, never the gate.
- **INV-2** Visible surface within ≤200ms of mount. No blank frame.
- **INV-3** `MIN_DISPLAY_MS = 3500ms` before any `finish()` — enforced in code.
- **INV-4** `finishOnce` guarded by `finishedRef` — exactly one terminal path.
- **INV-5** Paired lifecycle: `setIntroActive(true/false)` symmetric.
- **INV-6** SSR-safe: every `window`/`document`/`storage` access guarded.
- **INV-7** Graceful degradation: video error → poster + HUD fallback, never blank.
- **INV-8** Skip is the ONLY user action allowed to bypass INV-3.

### §2. Cross-Device Rendering (from Cross-Device Constitution)
- **INV-CD-1** Portrait mobile (`≤768px & portrait`) → `object-fit: cover` + `object-position: center 30%`.
- **INV-CD-2** Everywhere else → `object-fit: contain` + blurred backdrop fills letterbox.
- **INV-CD-3** Every top-anchored control uses `env(safe-area-inset-top)`.
- **INV-CD-4** Intro layer `z-[100]` — nothing renders above it while visible.

### §3. Chat Runtime (from ARIA Runtime Constitution)
- **INV-9** Every authenticated assistant turn persisted to `aria_interactions`
  with `latency_ms`, `first_token_ms`, `model`, `device_class`. Try/catch wrapped —
  never fire-and-forget.
- **INV-10** Learned patterns injected ONLY if
  `safety_passed = true AND confidence ≥ 0.7 AND hits ≥ 3`.
  Filter enforced in SQL, not client-side.
- **INV-11** Patterns unseen 30d → pruned. Confidence recomputed weekly
  as `hits / (hits + decay)`. Every fallback → `aria_incidents`.
- **INV-12** Zero-latency baseline: priority tier for gpt-5, AudioContext
  primed on dock open, TLS preconnects to gateway + ElevenLabs, TTS threshold
  ≥8 chars, composer refocus after send, `abortSignal` wired.

### §4. Data & Security
- **INV-DS-1** RLS enabled on every `public.*` table. `GRANT` in same migration.
- **INV-DS-2** Roles in `user_roles` only. Never on `profiles`. `has_role()` is
  `SECURITY DEFINER`.
- **INV-DS-3** `SUPABASE_SERVICE_ROLE_KEY` never in client bundle, never in loaders.
  `supabaseAdmin` loaded via `await import()` inside handler bodies only.
- **INV-DS-4** Protected server fns use `requireSupabaseAuth` + explicit role check.
  Unauthenticated `createServerFn` is a public endpoint — treat as such.

### §5. Architecture
- **INV-A-1** Route path in `createFileRoute("…")` MUST match generated route ID.
- **INV-A-2** No module-scope property assignments on route components
  (`X.displayName`, `X.head`, etc.) — code-split transform deletes them → `ReferenceError`.
- **INV-A-3** Layout `<Outlet />` never gated on `pathname`.
- **INV-A-4** Public route loaders MUST NOT call `requireSupabaseAuth` fns
  (SSR prerender → 401 → build fail).
- **INV-A-5** No `src/pages/`. No React Router DOM. TanStack Start only.

---

## Article II — Forbidden Regressions (Consolidated FR Registry)

Any of these reappearing = release-blocking bug. **Never re-litigate.**

| ID | Regression | Root cause forbidden |
|----|-----------|----------------------|
| **FR-1** | ARIA cropped at the head on portrait mobile | `contain` on portrait, or `object-position: center` |
| **FR-2** | Letterbox bars on laptop/desktop/ultrawide | `cover` forced on wide viewports, or missing backdrop |
| **FR-3** | Intro disappears on video/CDN error | `onError → finish()` before MIN_DISPLAY_MS |
| **FR-4** | Skip/Sound hidden behind notch | Top-anchored control without safe-area inset |
| **FR-5** | Auto-dismiss before 3500ms | Any `finish()` path bypassing `finishOnce` |
| **FR-6** | Hydration mismatch on first paint | `window`/`matchMedia` outside `useEffect` |
| **FR-7** | Intro replays every refresh | Session guard written after state flip |
| **FR-8** | Chat/marquee covers intro | Element with `z-index > 100` mounted with intro |
| **FR-9** | Chat first-token latency >1500ms (p50) | Missing priority tier, missing preconnect, cold TTS |
| **FR-10** | Marquee blocks chat close button on mobile | `z-[100]` marquee above `z-50` dock |
| **FR-11** | Learned pattern injected without safety gate | Client-side filter, or relaxed SQL threshold |
| **FR-12** | Placeholder / fake KPI shipped to prod | Static `Math.random()`, `TODO`, `Lorem ipsum` |
| **FR-13** | Service-role key in loader/component | Top-level `client.server` import in `*.functions.ts` |
| **FR-14** | Public schema table without RLS or GRANT | `CREATE TABLE` migration missing GRANT block |
| **FR-15** | Google OAuth calling `supabase.auth.signInWithOAuth` directly | Bypassing `lovable.auth.signInWithOAuth` broker |
| **FR-16** | Cinematic intro flashes then disappears / never appears on laptop or mobile | Root shell hides `WelcomeThenGenesis` behind `suppressOverlays`/`introActive`, or marks session complete before `onDone` |
| **FR-19** | Unverified metric, status, or certification badge shown to user | Static "UPTIME 99.97%", "TLS 1.3", "ISO 27001", "LIVE", "بث مباشر" rendered without an `Evidence` object from `src/lib/evidence/gate.ts` |

Every fix touching these areas MUST cite the FR ID(s) it protects.
The self-evolution engine's `proposalRespectsIntroConstitution` gate blocks
proposals against `PROTECTED_PATHS` that fail to cite this document.

---

## Article III — Self-Healing Doctrine

The system MUST detect, isolate, and recover from its own failures without
human intervention, within bounded time budgets.

### §1. Failure detection
- **Client watchdog** (`src/lib/aria/self-healing/watchdog.ts`) monitors
  `chat.status`, video events, TTS pipeline, AudioContext state, and gateway
  responses. Every anomaly → `aria_incidents` row with:
  `severity`, `device_class`, `viewport`, `user_agent`, `network`, `failure_mode`.

### §2. Recovery ladder (bounded, deterministic)
| Failure mode | Tier 1 (auto) | Tier 2 (auto) | Tier 3 (auto) | Tier 4 (defer) |
|--------------|---------------|---------------|---------------|----------------|
| Chat stream error | Exponential retry ×3 (500ms) | Model swap `gpt-5` → `gpt-5-mini` | Fallback to non-stream `generateText` | Surface error card |
| TTS failure | Retry ×2 | Switch voice ID | Text-only reply | Silent |
| Video load error | Retry preload once | Poster + HUD fallback | HUD-only mode | — |
| Autoplay blocked | Show "Tap for sound" chip | Continue muted | — | — |
| Rate limit (429) | Exponential backoff | Queue with UI hint | Model tier downgrade | User error card |
| Auth 401 | Refresh session | Redirect `/auth` | — | — |

Every tier transition is logged. **No tier may skip** MIN_DISPLAY_MS or any Article I invariant.

### §3. Circuit breakers
- 5 consecutive failures of the same `failure_mode` within 60s → open circuit
  for that dependency (30s cool-down). Watchdog surfaces status via
  `/api/health` route.
- Circuit state is process-local; durable incident history in DB.

### §4. Rollback
- Self-evolution proposal that lands and triggers `severity=critical`
  incident within 24h → **auto-rollback** the commit and mark the proposal
  `rejected_by_watchdog` in `evolution_proposals`.

---

## Article IV — Self-Learning Doctrine

The system MUST become measurably better from every interaction, without
drift and without violating safety.

### §1. Measure everything (INV-9)
Every assistant turn, every tool call, every failure → durable row with
latency, outcome, model, device class. **No learning without measurement.**

### §2. Pattern mining
Nightly worker (`src/lib/aria/learning/pattern-miner.server.ts`) reads
`aria_interactions` + `aria_incidents` from the last 24h, extracts
recurring signals:
- Repeated question shapes with high user satisfaction → candidate patterns.
- Recurring failure modes with reproducible fix → candidate self-heal rule.
- Device+viewport correlations with degradation → candidate adaptation.

Candidates land in `aria_learned_patterns` with `safety_passed = false`
by default.

### §3. Injection gate (INV-10, non-negotiable)
Patterns reach production **only** after:
1. `safety_passed = true` (automated safety review + optional human).
2. `confidence ≥ 0.7`.
3. `hits ≥ 3` (seen in ≥3 distinct sessions).

Gate is **SQL-enforced** in the chat handler query. Never bypass client-side.

### §4. Renewal (INV-11)
- Unseen 30d → pruned.
- Confidence weekly = `hits / (hits + decay)`.
- Contradiction from user correction → confidence −0.2 immediately.

### §5. Scope isolation
Learned behaviors are scoped by `domain` and `context_fingerprint`. A
pattern learned in one org / one language / one route MUST NOT leak into
another unless explicitly promoted after multi-context validation.

---

## Article V — Self-Evolution Compliance

`src/lib/aria/self-evolution/engine.server.ts` is the sole autonomous
mutation surface. It MUST:

1. Respect `PROTECTED_PATHS`. Any proposal touching a protected file that
   does not cite this constitution + preserve every listed INVARIANT/FR
   in `rationale` → **auto-defer**, never merge.
2. Run in **ANALYZE-ONLY** mode by default. `applyApproved = true` is a
   privileged flag requiring explicit operator authorization.
3. Never mutate migrations, RLS policies, or `src/integrations/supabase/*`
   generated files.
4. Emit `aria_incidents` on rejection with `severity=info`,
   `failure_mode=self_evolution_gate`.

**PROTECTED_PATHS** (canonical list, keep in sync with engine):
```
src/components/cinematic/AriaWelcomeVideo.tsx
src/components/cinematic/WelcomeThenGenesis.tsx
src/components/intro/AriaCinematicIntro.tsx
src/routes/__root.tsx
src/routes/index.tsx
src/lib/aria/learning/interaction-log.server.ts
src/lib/aria/learning/pattern-miner.server.ts
src/lib/aria/learning/prompt-injector.server.ts
src/lib/aria/self-healing/watchdog.ts
docs/ARIA_INTRO_CONSTITUTION.md
docs/NEXUS_ENGINEERING_CONSTITUTION.md
```

---

## Article VI — Definition of Done (per change)

A change is complete **only when** all pass:

1. ✅ `bunx tsgo --noEmit` — zero errors.
2. ✅ `bun run build` — zero warnings that block ship.
3. ✅ Relevant E2E specs pass:
   - `tests/e2e/02-genesis-intro.spec.ts`
   - `tests/e2e/09-intro-multi-device.spec.ts` (6 viewports)
   - `tests/e2e/03-aria-no-autoplay.spec.ts`
   - `tests/e2e/07-health-endpoint.spec.ts`
4. ✅ Zero new console errors, zero 4xx/5xx on happy path.
5. ✅ Every new `public.*` table has RLS + GRANT in the same migration.
6. ✅ Every new server fn touching user data uses `requireSupabaseAuth`
   or documents why not in code comments.
7. ✅ Commit message cites the FR / INVARIANT the change protects
   when touching a protected area.
8. ✅ Placeholder scanner clean: no `TODO`, `Lorem`, `Math.random()` in
   production data paths.

---

## Article VII — Enforcement Chain

| Layer | Enforcer | Trigger |
|-------|----------|---------|
| Type safety | `tsgo` in CI | Every push |
| Route + syntax | Vite plugins | Every dev/build |
| Runtime invariants | E2E suite | Every PR |
| Data safety | Supabase linter + migration review | Every migration |
| Self-evolution | `proposalRespectsIntroConstitution` | Every proposal |
| Rollback | Watchdog + 24h critical-incident rule | Post-deploy |
| Learning safety | SQL injection gate (INV-10) | Every chat request |

Bypassing any layer without amending this constitution is a
**constitutional violation** and MUST be reverted.

---

## Article VIII — Amendment Procedure

This document may be amended only when:
1. A change is proposed as a PR modifying **only** this file (or its
   subordinate constitution files) with a clear rationale.
2. Every new clause specifies the enforcement mechanism (CI/E2E/SQL/gate).
3. Every removed clause explains why it is no longer needed AND confirms
   no active FR depends on it.
4. Version bumped, ratification date updated.

The self-evolution engine MUST NOT amend this file autonomously.
`docs/NEXUS_ENGINEERING_CONSTITUTION.md` is on the PROTECTED_PATHS list;
proposals against it require human `applyApproved` flag.

---

## Article IX — Cultural Clauses

- **No re-litigation.** A solved problem stays solved. If a symptom returns,
  the answer is "which FR did we break?", not "let's redesign."
- **Evidence over opinion.** Every claim in a PR description must reference
  a log, a test, or a screenshot — never "I think" or "should be fine."
- **Silence is a bug.** A failure that logs nothing is worse than one that
  crashes. Every recovery path emits an incident.
- **Speed is a feature.** INV-12 latency budgets are product requirements,
  not optimizations. Regressions are release-blocking.
- **ARIA is executive.** No placeholder greeting, no generic Sparkles icon,
  no "AI Assistant" copy. She is the face of the OS on every surface.

---

**Ratified.** Every engineer, every agent, and every future proposal in this
repository operates under this constitution. There is no exception clause.

---

## FR-17 — Mobile Audio Gesture Contract (permanent)

Extends INVARIANT-14 in `docs/ARIA_INTRO_CONSTITUTION.md`. Every video/audio
surface in the product MUST:

1. Never call `AudioContext.createMediaElementSource()` before verified
   unmuted playback.
2. Resume any `AudioContext` synchronously *inside* the originating user
   gesture, BEFORE mutating `muted`/`volume` or calling `play()`.
3. Mirror `muted` as both the property AND the DOM attribute so iOS
   honours the state.
4. Expose an always-tappable unmute affordance (min 44×44px, above
   safe-area-inset-top, z-index ≥ 20) whenever muted-autoplay fallback
   was taken.
5. Log a self-healing incident (`mobile_audio_locked`) when the fallback
   persists past `MIN_DISPLAY_MS` on a touch device without a follow-up
   unmute — so the ARIA pattern miner escalates it as a regression.

Enforcement: `PROTECTED_PATHS` covers the intro; new media components
must add themselves to this list on creation. Reviewers reject any diff
that violates FR-17.

---

## FR-18 — Automatic Audio Activation Policy (permanent, all devices)

Objective: ARIA speaks **automatically with sound** on mobile, laptop, and
desktop wherever the browser permits, and with a single-tap unlock where the
browser policy forbids autoplay-with-sound. Zero silent surprises. Zero
robotic fallbacks.

### Ground truth (non-negotiable)

Per WHATWG HTML autoplay spec, Chrome autoplay policy, Safari WebKit media
policy, and Android WebView, `play()` with audible sound BEFORE the first
user activation in the current document MUST fail. This law binds every
browser; it cannot be bypassed and MUST NOT be simulated with fake voices.

### Enforcement contract

1. **Session-wide audio primer** (`src/lib/user-interaction.ts`)
   - On the first `pointerdown | touchstart | keydown | click` anywhere in
     the document, `installInteractionTracker`:
     - marks `sessionStorage["nexios-user-interacted"] = "1"`,
     - constructs a shared `AudioContext`, calls `resume()` inside the
       gesture, and plays a 1-frame silent buffer (iOS unlock),
     - marks `sessionStorage["nexios-audio-primed"] = "1"`.
   - Every subsequent ARIA voice / intro / TTS surface inherits that
     unlocked context — no further gesture required for that session.

2. **First-load unlock affordance**
   - Any surface that would autoplay MUST attempt unmuted `play()` first.
   - On rejection, it MUST fall back to muted autoplay + a prominent
     always-tappable unmute chip (INVARIANT-14 / FR-17). The wrapper
     `onPointerDown` MUST also unmute.
   - The muted state MUST be reflected as BOTH the `muted` property and
     the DOM `muted` attribute (iOS).

3. **Return visitors / second-navigation**
   - If `hasPriorInteraction()` or `isAudioPrimed()` returns true, the
     surface MUST call `play()` unmuted directly; any muted fallback in
     this case is a regression.

4. **Persistence across route navigation**
   - The primer is `sessionStorage`-scoped; SPA route changes preserve it.
   - Hard reloads reset it — same policy applies to any new document.

5. **Constitution self-healing**
   - `PROTECTED_PATHS` in `src/lib/aria/self-evolution/engine.server.ts`
     covers `src/lib/user-interaction.ts` and every media surface using it.
   - The watchdog logs `audio_autoplay_failed` when unmuted `play()` is
     rejected on a session where `isAudioPrimed()` is true — pattern miner
     escalates as a Constitution violation.

### Forbidden

- Faking speech with `SpeechSynthesis` or robotic fallback when TTS fails.
- Instructing the user to "enable autoplay in browser settings."
- Removing the muted-fallback chip in an attempt to force sound.
- Creating an `AudioContext` outside of a user gesture (starts suspended,
  breaks iOS).
- Calling `createMediaElementSource()` before verified unmuted playback.

FR-18 is enforced permanently. Any diff violating it is auto-flagged by the
self-evolution engine and reverted.
