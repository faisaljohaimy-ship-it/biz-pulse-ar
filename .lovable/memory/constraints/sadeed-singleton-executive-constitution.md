---
name: SADEED Singleton & Executive Envelope Constitution
description: Permanent, always-on invariants (INVARIANT-13..17) locking SADEED to a single Brain/Provider/Voice/Avatar/Memory instance, routing every request through sadeedBrain, mounting ExecutiveCard from activeExecution, and keeping /sadeed/demo as the executive-grade validation surface. Enforced at runtime via src/lib/sadeed/singletons.ts.
type: constraint
---

Governs: `src/lib/sadeed/singletons.ts`, `src/lib/sadeed-core/core/*`,
`src/lib/sadeed-core/providers/sadeed-provider.tsx`,
`src/components/sadeed-core/SadeedCopilot.tsx`,
`src/components/sadeed-core/ExecutiveCard.tsx`,
`src/routes/_authenticated/sadeed.demo.tsx`, and every hook/component that
calls SADEED (`useSadeed`, `sadeedBrain`).

**INVARIANT-13 — One Brain, One Provider.** The following SADEED subsystems
MUST exist exactly once per browser session and are registered at module
load via `assertOne(...)` / `trackMount(...)` in `src/lib/sadeed/singletons.ts`:

- `BRAIN` → `sadeedBrain@sadeed-core/core/sadeed-brain`
- `VOICE` → `voiceManager@sadeed-core/core/voice-manager`
- `AVATAR` → `avatarRuntime@sadeed-core/core/avatar-runtime`
- `MEMORY` → `memoryManager@sadeed-core/core/memory-manager`
- `PROVIDER` → `SadeedProvider@__root` (via `trackMount` in `useEffect`)

A duplicate registration logs a loud `[sadeed-singleton] duplicate …` error in
dev and warns in prod. Never bypass this registry when adding a new SADEED
subsystem — extend `SadeedSingletonKey` and register the owner instead.

**INVARIANT-14 — Single Request Entrypoint (General SADEED).** Every
general SADEED reply (executive Q&A, dock/copilot, page narration, cross-
route assistant) MUST route through `sadeedBrain.submit(...)` (via
`useSadeed().ask(...)`). The ONE `useChat` transport for the singleton
lives inside `<SadeedProvider>` (chat id `"sadeed-singleton"`) and is bound
into the Brain via `sadeedBrain.bindSender(...)`. No component may call
OpenAI/Claude/OpenRouter SDKs or `fetch("/api/chat")` directly for
general SADEED.

**INVARIANT-14b — Purpose-Scoped Chat Surfaces (Documented Exceptions).**
Feature-specific chat surfaces are allowed ONLY when ALL apply:

1. Distinct `useChat` id (never `"sadeed-singleton"`).
2. Purpose-scoped server endpoint (NOT `/api/chat`) — e.g. lesson
   teaching, threaded assistant persistence, digital-twin scenario.
3. Do NOT acquire `SadeedAudioBus` `"chat-tts"` (no chat TTS collision).
4. Do NOT mutate `useSadeedStore` `activeTurn` / `activeExecution`.
5. Registered here as an approved exception.

Approved exceptions (as of this turn):

- `src/components/learn/simulations/MeetSadeedSimulation.tsx` — lesson
  teach flow, id `sim-meet-sadeed-${slug}`, endpoint `/api/learn/sadeed-teach`.
- `src/components/learn/LessonSadeedChat.tsx` — lesson chat surface.
- `src/routes/_authenticated/digital-twin.tsx` — twin scenario,
  id `sadeed-digital-twin`.
- `src/routes/_authenticated/assistant.$threadId.tsx` — threaded
  assistant with per-thread persistence.

Any new purpose-scoped surface MUST be added to this list in the same
PR that introduces it, or it counts as an INVARIANT-14 violation.

**INVARIANT-15 — Executive Envelope Live.** `ExecutiveCard` is mounted
inside `SadeedCopilot` and MUST render from `useSadeedStore().activeExecution`
(never from ad-hoc props or mock objects). Executive fields
(summary / risks / priority / confidence / recommendation / approval /
next-step) come only from the orchestrator's structured envelope, never
from freeform assistant prose.

**INVARIANT-16 — TTS Discipline.** Chat TTS is owned EXCLUSIVELY by
`SadeedCopilot` through `/api/tts` on the single `SadeedAudioBus`
`"chat-tts"` token. Browser `SpeechSynthesis.speak` is FORBIDDEN during
chat replies. The provider must NOT re-add a second `speak()` path —
two pipelines competing for `SadeedAudioBus.acquire("chat-tts")` reproduce
the "first sentence clean, rest robotic" regression.

**INVARIANT-17 — Executive Demo Surface.** `/sadeed/demo` is a permanent
production surface, not a scratch page. It MUST:

1. Present pre-built Arabic executive scenarios.
2. Trigger them exclusively via `useSadeed().open() + ask(prompt)` (no
   direct LLM calls, no bypass of the Brain).
3. Render the live `ExecutiveCard` from `activeExecution`.
   Any regression here fails the SADEED Impact Directive Phase 3 (Live
   Demonstration) audit at `/sadeed/directive`.

**Why:** These five invariants are the load-bearing wall of the NEXIOS AI
OS. A duplicate Brain fragments memory. A second `useChat` breaks
telemetry, TTS, and turn tracking. Ad-hoc LLM calls bypass safety
gating, evidence, and the orchestrator envelope. Mock ExecutiveCard
props hide broken pipelines. Browser SpeechSynthesis during chat re-
introduces the robotic-voice regression. `/sadeed/demo` is how executive
readiness is proven on every deploy.

**How to apply:** Before editing any file under jurisdiction, cite this
constraint in commit rationale, confirm INVARIANT-13..17 still hold,
and run `bunx tsgo --noEmit` plus a browser check for
`[sadeed-singleton] duplicate` warnings. When adding a new SADEED
subsystem, extend `SadeedSingletonKey` in `src/lib/sadeed/singletons.ts`
and register the owner at module load.
