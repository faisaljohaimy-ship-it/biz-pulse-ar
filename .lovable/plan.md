# ARIA Brain Core — Phase 1 (Foundation)

## Goal

Introduce a single, permanent ARIA **Brain Core** that every page must go through. No new visual features, no RAG/tools/voice/memory implementations — only the architecture that Phases 2–N will plug into.

## Current State (already in place)

- `src/lib/aria-core/` singleton: `provider.tsx`, `store.ts`, `use-aria.ts`, `types.ts`, `index.ts`.
- `<AriaProvider>` mounted once in `src/routes/__root.tsx`, above `<Outlet/>`.
- `<AriaCopilot/>` is the sole UI surface.
- Backend: `src/routes/api/chat.ts` streams via Lovable AI Gateway or OpenRouter, with RAG + tools + thread persistence.

Phase 1 keeps all of that working, but reorganizes the client into named managers with clean seams, and adds the AI Router on the backend.

## Directory Layout (final)

All new files live under `src/lib/aria-core/` so existing imports keep working. The layout mirrors the spec:

```text
src/lib/aria-core/
├── core/
│   ├── aria-brain.ts                 # single request entry point + lifecycle
│   ├── executive-ai-orchestrator.ts  # pipeline: intent → context → route → validate
│   ├── ai-router.ts                  # OpenAI vs Claude selection + fallback
│   ├── conversation-manager.ts       # active conv, history, streaming, cancel, dedupe
│   ├── context-manager.ts            # route/module/screen/locale/permissions/page meta
│   ├── memory-manager.ts             # INTERFACE only (Phase 2 will implement)
│   ├── voice-manager.ts              # INTERFACE only (states: idle/listen/proc/speak/unavailable)
│   └── response-pipeline.ts          # validate → normalize → strip raw errors → format
├── providers/
│   └── aria-provider.tsx             # thin wrapper that wires managers + <AriaProvider>
├── hooks/
│   └── useAria.ts                    # canonical hook (delegates to store + brain)
├── state/
│   └── aria-store.ts                 # zustand store (moved from ./store.ts)
├── services/
│   └── aria-service.ts               # client → /api/chat transport wrapper
├── types/
│   └── aria.ts                       # canonical types (moved from ./types.ts)
├── index.ts                          # public barrel — same exports as today
├── provider.tsx                      # re-export shim → providers/aria-provider
├── use-aria.ts                       # re-export shim → hooks/useAria
├── store.ts                          # re-export shim → state/aria-store
├── types.ts                          # re-export shim → types/aria
└── README.md                         # updated architecture doc
```

**Import path guarantee:** every existing import (`@/lib/aria-core`, `@/lib/aria-core/use-aria`, `@/lib/aria-core/provider`, `@/lib/aria-core/store`) keeps working via the shim files. Zero call-site changes required in routes/components.

## Brain, Orchestrator, Router — client responsibilities

Even though the actual model call happens on `/api/chat`, the client-side Brain owns request lifecycle, dedupe, cancellation, and pipeline ordering:

```text
useAria().ask(text)
    ↓
ariaBrain.submit({ text, pageContext, locale })
    ↓
ExecutiveAiOrchestrator.run()
    ├─ ConversationManager.beginTurn()       // dedupe, status, cancel token
    ├─ ContextManager.snapshot()             // route/module/locale/page facts
    ├─ MemoryManager.recall() [interface]    // no-op stub in Phase 1
    ├─ AiRouter.selectHint(intent, ctx)      // hint sent to server as `x-aria-route`
    ├─ AriaService.stream(request)           // calls /api/chat via useChat transport
    └─ ResponsePipeline.finalize(streamEnd)  // validate + normalize + format
```

- **ConversationManager** does not own messages (that stays in `useChat`); it owns *turn* metadata: `activeRequestId`, `status`, `AbortController`, greeting-suppression flag.
- **ContextManager** replaces today's ad-hoc `setPageContext` — same public API via `useAria().setPageContext(...)`, backed by richer internal model (`route`, `module`, `screen`, `locale`, `permissions[]`, `pageMeta`).
- **MemoryManager** and **VoiceManager**: exported as interfaces + no-op implementations. Voice interface exposes `state: "idle"|"listening"|"processing"|"speaking"|"unavailable"`. No real STT/TTS wired in this phase (the existing `speechSynthesis` TTS in `provider.tsx` stays, but calls the voice manager's state setter).
- **ResponsePipeline**: transforms the streamed text before it lands in UI — trims raw provider prefixes like `Error: 429 …`, normalizes newlines, keeps Arabic-first ordering.

## AI Router — routing table

Router runs on the **server** in `chat.ts` and picks the concrete model. Client sends an intent hint (`general` | `executive` | `long-context` | `writing` | `engineering` | `unknown`) via header `x-aria-intent`.

| Intent hint | Primary | Fallback (on 4xx/5xx from primary) |
|---|---|---|
| `general` | `openai/gpt-5-mini` (Lovable Gateway) | `openai/gpt-5-nano` |
| `executive` | `openai/gpt-5` | `openai/gpt-5-mini` |
| `long-context` | `anthropic/claude-sonnet-4.5` (OpenRouter) | `openai/gpt-5` |
| `writing` | `anthropic/claude-sonnet-4.5` | `openai/gpt-5` |
| `engineering` | `anthropic/claude-sonnet-4.5` | `openai/gpt-5` |
| `unknown` | current default (`openai/gpt-5`) | `openai/gpt-5-mini` |

Retry once on primary failure, then surface a clean pipeline error. Model names are **never** returned to the client UI — only intent + a boolean `fallbackUsed`.

Claude access requires `OPENROUTER_API_KEY` (already present in secrets). If OpenRouter is unavailable, router downgrades Claude intents to OpenAI transparently.

## Files created

1. `src/lib/aria-core/types/aria.ts`
2. `src/lib/aria-core/state/aria-store.ts`
3. `src/lib/aria-core/services/aria-service.ts`
4. `src/lib/aria-core/core/aria-brain.ts`
5. `src/lib/aria-core/core/executive-ai-orchestrator.ts`
6. `src/lib/aria-core/core/ai-router.ts` *(client-side hint selector)*
7. `src/lib/aria-core/core/conversation-manager.ts`
8. `src/lib/aria-core/core/context-manager.ts`
9. `src/lib/aria-core/core/memory-manager.ts` *(interface + no-op)*
10. `src/lib/aria-core/core/voice-manager.ts` *(interface + no-op)*
11. `src/lib/aria-core/core/response-pipeline.ts`
12. `src/lib/aria-core/providers/aria-provider.tsx`
13. `src/lib/aria-core/hooks/useAria.ts`
14. `src/lib/aria-core/server/ai-router.server.ts` *(server-side model selector)*

## Files modified

- `src/lib/aria-core/index.ts` — re-point exports to new paths; keep same public surface.
- `src/lib/aria-core/provider.tsx` — becomes a 1-line shim `export * from "./providers/aria-provider"`.
- `src/lib/aria-core/use-aria.ts` — shim → `hooks/useAria`.
- `src/lib/aria-core/store.ts` — shim → `state/aria-store`.
- `src/lib/aria-core/types.ts` — shim → `types/aria`.
- `src/lib/aria-core/README.md` — replaces the Turn 2 migration section with Phase 1 brain architecture.
- `src/routes/api/chat.ts` — replace inline model-id resolution with `resolveModel(intentHint)` from the new server router; add retry-once-with-fallback around `streamText` startup. RAG/tools/thread-persistence blocks left untouched.

## Non-goals (explicitly deferred to later phases)

RAG, tool calling, persistent memory, real voice (STT + streaming TTS), SAP/Outlook/Teams/M365, digital twin, holograms, avatar motion, live monitoring, executive news, self-learning.

## Validation before finish

- `tsgo --noEmit` clean.
- `bun run build` clean.
- Grep audit: no `AriaProvider`, `useAria`, or `useAriaStore` defined outside `src/lib/aria-core/`.
- Grep audit: no client component imports `@ai-sdk/openai`, `@anthropic-ai/sdk`, or calls `fetch("https://api.openai.com" | "https://api.anthropic.com")`.
- Smoke: open `/`, `/os`, `/_authenticated/sec`, open ARIA dock, send one message → response streams and renders.
- Console clean during smoke.

## Deliverable at end

The full 11-point report requested in the prompt (files, architecture, dep graph, singleton verification, AI routing verification, useAria integration, TypeScript, build, risks, Phase 1 readiness score).

## Risk register

- Claude via OpenRouter depends on `OPENROUTER_API_KEY` being valid at runtime; router degrades gracefully to OpenAI if not.
- Existing `useChat` message shape stays; the pipeline post-processes text without altering `parts` structure. Low risk to RAG citations metadata.
- Shim files (`provider.tsx`, `store.ts`, etc.) preserve all existing imports; no route/component edits required.

Stops at end of Phase 1. Does not begin Phase 2.
