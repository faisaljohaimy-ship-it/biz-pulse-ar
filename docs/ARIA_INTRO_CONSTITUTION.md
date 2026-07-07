# ARIA Intro Constitution

**Status:** Immutable engineering rule. Any PR/self-evolution proposal that
touches the intro gate MUST reference this document by ID and preserve every
invariant below. Violations are release-blockers.

## Scope

Files under jurisdiction:
- `src/components/cinematic/AriaWelcomeVideo.tsx`
- `src/components/cinematic/WelcomeThenGenesis.tsx`
- `src/lib/user-interaction.ts` (interaction tracker used by the gate)
- `src/lib/intro-store.ts` (intro-active flag consumed by the shell)

## Invariants

- **INVARIANT-1 — Single gate.** `WelcomeThenGenesis` is the ONLY pre-system
  gate. No sibling intro, splash, curtain, or hero-zero may mount before the
  landing route. The session guard key is `sessionStorage["nexios-welcome"]`.
- **INVARIANT-2 — Fast paint.** A visible layer (poster, HUD, or video)
  must reach the screen within ≤200ms of mount. A blank frame is a bug.
- **INVARIANT-3 — Minimum display.** `finish()` MUST NOT run before
  `MIN_DISPLAY_MS = 3500ms` from mount, regardless of `onEnded`, `onError`,
  network failure, or user gesture other than the explicit Skip button.
- **INVARIANT-4 — finishOnce.** Exactly one terminal path via `finish()`
  guarded by `finishedRef`. No race between `onEnded`, `onError`, timeout,
  and skip.
- **INVARIANT-5 — Paired lifecycle.** `setIntroActive(true)` at mount is
  paired with exactly one `setIntroActive(false)` on unmount / finish.
- **INVARIANT-6 — SSR-safe.** Every access to `window`, `document`,
  `AudioContext`, `performance`, and `sessionStorage` is guarded or lives
  inside `useEffect`. The component must not throw during SSR.
- **INVARIANT-7 — Graceful degradation.** Video load/error, autoplay
  blocking, `prefers-reduced-motion`, private-mode storage, and offline
  states each have a defined fallback (poster + HUD or explicit entry
  button). None of them cause the gate to disappear early.
- **INVARIANT-8 — Skip is explicit.** The Skip button is the only user
  action that may bypass INVARIANT-3.

## Enforcement

1. `bunx tsgo --noEmit` MUST be green.
2. E2E test `tests/e2e/02-genesis-intro.spec.ts` MUST assert:
   - a visible surface within 500ms of `/`,
   - the gate remains mounted for ≥ MIN_DISPLAY_MS unless Skip is clicked,
   - the session guard causes it to skip on the second navigation.
3. Self-evolution engine (`src/lib/aria/self-evolution/*`) MUST treat the
   files listed above as protected paths. Proposals mutating them must cite
   this document in `rationale` and demonstrate all invariants still hold.

## Rationale

The pre-system opening is the first impression of NEXUS AI OS. A blank
frame, an early disappearance, or a broken autoplay path degrades the
executive identity the product is built to project. These invariants make
the intro deterministic and self-healing under every failure mode observed
in production.

---

# ARIA Runtime Constitution (Chat + Self-Learning)

**Status:** Immutable engineering rule. Any PR or self-evolution proposal
that touches the chat runtime, learning pipeline, or self-healing layer
MUST cite this section and preserve every invariant below.

## Scope

Files under jurisdiction:
- `src/routes/api/chat.ts` (streaming chat handler)
- `src/components/aria-core/AriaCopilot.tsx` (chat UI + TTS pipeline)
- `src/lib/aria/learning/*` (interaction log, pattern miner, prompt injector)
- `src/lib/aria/self-healing/*` (watchdog, incident ledger)
- DB tables: `aria_interactions`, `aria_learned_patterns`, `aria_incidents`

## Invariants

- **INVARIANT-9 — Measure every reply.** Every completed assistant turn for
  an authenticated user is persisted into `aria_interactions` with
  `latency_ms`, `first_token_ms`, `model`, and `device_class`. No learning
  without measurement.
- **INVARIANT-10 — Safe injection.** No learned pattern may be injected
  into the system prompt unless `safety_passed = true`, `confidence ≥ 0.7`,
  AND `hits ≥ 3`. The chat handler enforces this in SQL; do not relax the
  filter client-side.
- **INVARIANT-11 — Renewal.** Patterns unseen for 30 days are pruned; every
  7 days confidence is recomputed from `hits / (hits + decay)`. The self-
  healing watchdog writes to `aria_incidents` on every fallback (model
  switch, TTS failure, timeout, rate-limit).
- **INVARIANT-12 — Zero-latency baseline.** The chat pipeline MUST ship
  these speed guarantees on every device (mobile / tablet / desktop):
  1. Priority serving tier (`service_tier: "priority"`) for every gpt-5
     family model that supports Fast mode.
  2. AudioContext primed on dock open, BEFORE the first user keystroke.
  3. TLS preconnect to gateway + ElevenLabs on dock open.
  4. First sentence fires TTS at ≥8 chars (not 12), so first-audio starts
     as soon as the first clause completes.
  5. Composer refocuses after every send.
  6. `abortSignal: request.signal` wired into `streamText` so cancels stop
     token burn immediately.

## Enforcement

1. `bunx tsgo --noEmit` MUST be green.
2. The chat handler `onFinish` MUST insert into `aria_interactions` for
   every authenticated turn — never fire-and-forget without try/catch.
3. The chat handler MUST query `aria_learned_patterns` with the exact
   INVARIANT-10 filter before injection.
4. Self-evolution engine (`src/lib/aria/self-evolution/*`) MUST treat the
   files listed above as protected. Proposals mutating them must cite
   this section in `rationale` and demonstrate INVARIANT-9..12 still hold.

## Rationale

ARIA is the executive AI face of NEXUS AI OS. Every millisecond of latency
degrades executive trust; every uncalibrated learned instinct risks
propagating a bad answer forever. Measuring on every turn, gating
injection behind safety+confidence+hits, and renewing patterns weekly
turns ARIA into a self-improving agent WITHOUT introducing drift.

