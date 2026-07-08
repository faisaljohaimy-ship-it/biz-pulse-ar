---
name: ARIA Singleton & Executive Envelope Constitution
description: Permanent, always-on invariants (INVARIANT-13..17) locking ARIA to a single Brain/Provider/Voice/Avatar/Memory instance, routing every request through ariaBrain, mounting ExecutiveCard from activeExecution, and keeping /aria/demo as the executive-grade validation surface. Enforced at runtime via src/lib/aria/singletons.ts.
type: constraint
---

Governs: `src/lib/aria/singletons.ts`, `src/lib/aria-core/core/*`,
`src/lib/aria-core/providers/aria-provider.tsx`,
`src/components/aria-core/AriaCopilot.tsx`,
`src/components/aria-core/ExecutiveCard.tsx`,
`src/routes/_authenticated/aria.demo.tsx`, and every hook/component that
calls ARIA (`useAria`, `ariaBrain`).

**INVARIANT-13 — One Brain, One Provider.** The following ARIA subsystems
MUST exist exactly once per browser session and are registered at module
load via `assertOne(...)` / `trackMount(...)` in `src/lib/aria/singletons.ts`:
- `BRAIN`  → `ariaBrain@aria-core/core/aria-brain`
- `VOICE`  → `voiceManager@aria-core/core/voice-manager`
- `AVATAR` → `avatarRuntime@aria-core/core/avatar-runtime`
- `MEMORY` → `memoryManager@aria-core/core/memory-manager`
- `PROVIDER` → `AriaProvider@__root` (via `trackMount` in `useEffect`)

A duplicate registration logs a loud `[aria-singleton] duplicate …` error in
dev and warns in prod. Never bypass this registry when adding a new ARIA
subsystem — extend `AriaSingletonKey` and register the owner instead.

**INVARIANT-14 — Single Request Entrypoint.** Every page, hook, and
component that talks to ARIA MUST route through `ariaBrain.submit(...)`
(via `useAria().ask(...)`). No component may call OpenAI, Claude,
OpenRouter, `/api/chat`, `useChat`, or any provider SDK directly. The ONE
`useChat` transport lives inside `<AriaProvider>` and is bound into the
Brain via `ariaBrain.bindSender(...)`.

**INVARIANT-15 — Executive Envelope Live.** `ExecutiveCard` is mounted
inside `AriaCopilot` and MUST render from `useAriaStore().activeExecution`
(never from ad-hoc props or mock objects). Executive fields
(summary / risks / priority / confidence / recommendation / approval /
next-step) come only from the orchestrator's structured envelope, never
from freeform assistant prose.

**INVARIANT-16 — TTS Discipline.** Chat TTS is owned EXCLUSIVELY by
`AriaCopilot` through `/api/tts` on the single `AriaAudioBus`
`"chat-tts"` token. Browser `SpeechSynthesis.speak` is FORBIDDEN during
chat replies. The provider must NOT re-add a second `speak()` path —
two pipelines competing for `AriaAudioBus.acquire("chat-tts")` reproduce
the "first sentence clean, rest robotic" regression.

**INVARIANT-17 — Executive Demo Surface.** `/aria/demo` is a permanent
production surface, not a scratch page. It MUST:
1. Present pre-built Arabic executive scenarios.
2. Trigger them exclusively via `useAria().open() + ask(prompt)` (no
   direct LLM calls, no bypass of the Brain).
3. Render the live `ExecutiveCard` from `activeExecution`.
Any regression here fails the ARIA Impact Directive Phase 3 (Live
Demonstration) audit at `/aria/directive`.

**Why:** These five invariants are the load-bearing wall of the NEXIOS AI
OS. A duplicate Brain fragments memory. A second `useChat` breaks
telemetry, TTS, and turn tracking. Ad-hoc LLM calls bypass safety
gating, evidence, and the orchestrator envelope. Mock ExecutiveCard
props hide broken pipelines. Browser SpeechSynthesis during chat re-
introduces the robotic-voice regression. `/aria/demo` is how executive
readiness is proven on every deploy.

**How to apply:** Before editing any file under jurisdiction, cite this
constraint in commit rationale, confirm INVARIANT-13..17 still hold,
and run `bunx tsgo --noEmit` plus a browser check for
`[aria-singleton] duplicate` warnings. When adding a new ARIA
subsystem, extend `AriaSingletonKey` in `src/lib/aria/singletons.ts`
and register the owner at module load.
