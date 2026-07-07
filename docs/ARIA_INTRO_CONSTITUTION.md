# ARIA Intro Constitution

**Status:** Immutable engineering rule. Any PR/self-evolution proposal that
touches the intro gate MUST reference this document by ID and preserve every
invariant below. Violations are release-blockers.

## Scope

Files under jurisdiction:
- `src/components/cinematic/AriaWelcomeVideo.tsx`
- `src/components/cinematic/WelcomeThenGenesis.tsx`
- `src/routes/__root.tsx` (mount order; MUST NOT hide the gate when `introActive=true`)
- `src/lib/user-interaction.ts` (interaction tracker used by the gate)
- `src/lib/intro-store.ts` (intro-active flag consumed by the shell)

## Invariants

- **INVARIANT-1 — Single gate.** `WelcomeThenGenesis` is the ONLY pre-system
  gate. No sibling intro, splash, curtain, or hero-zero may mount before the
  landing route. The session guard key is `sessionStorage["nexios-welcome"]`;
  only value `complete:v2` may skip the intro. Interrupted/stale values MUST replay.
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
- **INVARIANT-13 — No self-unmount.** The root shell may hide marquee, chat,
  watermark, and greeter while `introActive=true`, but it MUST keep
  `WelcomeThenGenesis` mounted independently of `suppressOverlays`.

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

---

# ARIA Cross-Device Rendering Constitution (Intro)

**Status:** Immutable engineering rule. Applies to `AriaCinematicIntro`
and any future pre-hero cinematic gate. Governs how ARIA appears on
mobile, tablet, laptop, and desktop.

## Rendering Contract

- **Portrait mobile (`≤768px` AND orientation:portrait):** `object-fit: cover`
  with `object-position: center 30%`. ARIA fills the frame; her face sits
  in the upper third; no letterbox.
- **Landscape mobile, tablet, laptop, desktop, ultrawide:** `object-fit: contain`.
  A blurred, scaled copy of the same video renders behind it as a full-bleed
  backdrop so the frame is never bare black bars.
- **Safe-area:** every top-anchored control uses
  `top: calc(env(safe-area-inset-top, 0px) + 16px)` so notch/dynamic-island
  devices do not clip the Skip / Sound buttons.
- **z-index:** intro layer `z-[100]`, controls `z-30` inside it. Nothing in
  the app may render above the intro while it is visible.

## Forbidden Regressions (FR)

Any of the following reappearing in production is a release-blocking bug
and MUST be reverted or hot-fixed, never re-litigated:

| ID    | Regression                                                               | Root cause to avoid                                                        |
|-------|--------------------------------------------------------------------------|----------------------------------------------------------------------------|
| FR-1  | ARIA cropped at the head on portrait mobile                              | `object-fit: contain` on portrait mobile, or `object-position: center`     |
| FR-2  | Large black letterbox bars on laptop / desktop / ultrawide               | `object-fit: cover` forced on wide viewports, or missing blurred backdrop  |
| FR-3  | Intro disappears entirely when the video errors / CDN fails              | `onError` calling `finish()` before `MIN_DISPLAY_MS`, or no poster/HUD     |
| FR-4  | Skip / Sound button hidden behind the iOS notch                          | Top-anchored control without `env(safe-area-inset-top)`                    |
| FR-5  | Intro auto-dismisses before 3500 ms on any failure path                  | Any `finish()` path not routed through the `finishOnce` guard              |
| FR-6  | React hydration mismatch on first paint                                  | Reading `window` / `matchMedia` outside a `useEffect`                      |
| FR-7  | Intro replays on every hard refresh in the same session                  | Writing the session-guard key AFTER flipping state, or not writing at all  |
| FR-8  | Chat/composer or marquee ribbon covers the intro                         | Any element with `z-index > 100` mounted at the same time as the intro    |
| FR-9  | Intro flashes then disappears / never appears on laptop or mobile         | Root shell gates `WelcomeThenGenesis` behind `!introActive`/`suppressOverlays`, or writes completion before `onDone` |

Every future fix that touches `AriaCinematicIntro.tsx` MUST cite the FR
  ID(s) it protects in the commit / proposal rationale. `PROTECTED_PATHS`
in `src/lib/aria/self-evolution/engine.server.ts` blocks self-evolution
proposals that do not.

## Enforcement

1. `bunx tsgo --noEmit` MUST be green.
2. `tests/e2e/09-intro-multi-device.spec.ts` MUST pass on all listed
   viewports (390×844, 440×799, 844×390, 1024×1366, 1440×900, 1920×1080).
   It asserts: visible surface ≤500ms, no cropping, Skip button reachable,
   no early dismissal, session-guard on refresh.
3. Self-healing watchdog logs every `videoerror` / `autoplay-blocked` event
   into `aria_incidents` with `severity`, `device_class`, `viewport`,
   `user_agent`, and `failure_mode`. Repeated patterns (`hits ≥ 3`) become
   `aria_learned_patterns` proposals gated by INVARIANT-10.
4. Self-evolution engine (`src/lib/aria/self-evolution/*`) treats every
   file listed in `PROTECTED_PATHS` as protected. Proposals mutating them
   must cite this document AND preserve every FR-1..8 above.

## Rationale

ARIA is the executive face of NEXUS AI OS. A cropped head on mobile, a
black bar on a boardroom laptop, or a chat modal covering her presence
each cost more than a first impression — they signal an unfinished
product. Codifying the rendering contract + forbidden regressions turns
these into deterministic, machine-enforceable invariants that the
self-evolution loop cannot silently undo.


