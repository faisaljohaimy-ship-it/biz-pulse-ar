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
