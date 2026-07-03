# ARIA Brain Core — Architecture

> The ONE ARIA. Every request routes through the Brain. Do not create a second one.

## Phase 1 — Foundation (this document)

Phase 1 introduces the permanent **Brain Core** — the architecture every future
ARIA capability (RAG, tools, persistent memory, voice, digital twin, avatar
motion) will plug into. Phase 1 explicitly does NOT implement any of those
features; it only builds the seams.

## Directory Layout

```
src/lib/aria-core/
├── core/                              # brain-internal managers
│   ├── aria-brain.ts                  # single request entry point + lifecycle
│   ├── executive-ai-orchestrator.ts   # pipeline: intent → context → route → validate
│   ├── ai-router.ts                   # client-side intent hint selector
│   ├── conversation-manager.ts        # turn lifecycle, dedupe, cancel
│   ├── context-manager.ts             # route/module/screen/locale/permissions
│   ├── memory-manager.ts              # INTERFACE only (Phase 2)
│   ├── voice-manager.ts               # INTERFACE only (Phase 2)
│   └── response-pipeline.ts           # validate + normalize + scrub + format
├── providers/aria-provider.tsx        # ONE provider, mounted in __root.tsx
├── hooks/useAria.ts                   # the ONE hook
├── state/aria-store.ts                # zustand — mode, voice, context, turn
├── services/aria-service.ts           # the ONLY transport to /api/chat
├── server/ai-router.server.ts         # server-side model selection + fallback
├── types/aria.ts                      # canonical types
├── index.ts                           # public barrel
└── {provider,use-aria,store,types}.ts # legacy import-path shims (keep working)
```

## Execution Flow

```
User
  ↓
useAria().ask(text)
  ↓
ariaBrain.submit(text)
  ↓
ExecutiveAiOrchestrator.prepare()
  ├─ ConversationManager.beginTurn()      // dedupe + cancel + status
  ├─ ContextManager.snapshot()            // route/module/screen/locale
  ├─ MemoryManager.recall()               // no-op in Phase 1
  └─ AiRouter.selectHint()                // publishes x-aria-intent
  ↓
AriaService (transport → /api/chat)
  ↓
server/ai-router.server.ts               // OpenAI or Claude, retry+fallback
  ↓
OpenAI (Lovable Gateway) / Claude (OpenRouter)
  ↓
Stream → provider → ariaBrain.reportCompletion()
  ↓
ResponsePipeline.finalize()
  ↓
UI
```

## Singleton Guarantees

| Concern                  | Owner (exactly one)                                    |
| ------------------------ | ------------------------------------------------------ |
| ARIA Provider            | `<AriaProvider>` mounted in `src/routes/__root.tsx`    |
| ARIA Brain               | `ariaBrain` (module singleton)                         |
| Executive AI Orchestrator| `executiveAiOrchestrator` (module singleton)           |
| AI Router (client hint)  | `aiRouter` (module singleton)                          |
| AI Router (server select)| `resolveModel()` in `server/ai-router.server.ts`       |
| Conversation Manager     | `conversationManager` (module singleton)               |
| Context Manager          | `contextManager` (module singleton)                    |
| Memory Interface         | `memoryManager` (Phase 1 no-op)                        |
| Voice Interface          | `voiceManager` (Phase 1 state-only)                    |
| Response Pipeline        | `responsePipeline` (module singleton)                  |
| Transport                | `createAriaTransport()` (one instance per provider)    |
| Conversation             | `useChat` inside `<AriaProvider>` (one app-wide)       |
| Store                    | `useAriaStore` (zustand)                               |
| Event bus                | store command queue + `ariaBrain.onTelemetry`          |

## AI Router — Routing Table (server)

| Intent hint     | Primary model                           | Fallback                     |
| --------------- | --------------------------------------- | ---------------------------- |
| `general`       | `openai/gpt-5-mini` (Lovable)           | `openai/gpt-5-nano`          |
| `executive`     | `openai/gpt-5` (Lovable)                | `openai/gpt-5-mini`          |
| `long-context`  | `anthropic/claude-3.5-sonnet` (OpenRtr) | `openai/gpt-5`               |
| `writing`       | `anthropic/claude-3.5-sonnet` (OpenRtr) | `openai/gpt-5`               |
| `engineering`   | `anthropic/claude-3.5-sonnet` (OpenRtr) | `openai/gpt-5`               |
| `unknown`       | `openai/gpt-5` (Lovable)                | `openai/gpt-5-mini`          |

Rules:
- Client never sees model names — only intent + `fallbackUsed` boolean.
- Client never picks a model. It sends an intent hint via `x-aria-intent`.
- If OpenRouter is unavailable, Claude intents transparently degrade to OpenAI.
- Retry once on primary failure, then surface a clean pipeline error.

## Forbidden

- Direct OpenAI / Claude / OpenRouter SDK calls from any component or route.
- Direct `fetch("/api/chat", ...)` from any component.
- A second `<AriaProvider>`, `useAriaStore`, `ariaBrain`, or transport.
- Local per-page conversation, memory, voice, or context state.
- Exposing raw provider error strings in the UI.

## Adapter Pattern for Routes

```tsx
import { useAria, setAriaPageContext } from "@/lib/aria-core/use-aria";

function IncidentsPage() {
  const aria = useAria();
  useEffect(() => {
    setAriaPageContext({
      pathname: "/sec/incidents",
      label: "Sec · Incidents",
      locale: "en",
      facts: { openIncidents },
    });
  }, [openIncidents]);
  // aria.ask("...") | aria.open() | aria.close() | aria.focus()
}
```

## Non-Goals (deferred to later phases)

RAG · Tool Calling · SAP · Outlook · Teams · Microsoft 365 · Digital Twin ·
Holograms · Avatar Motion · Live Monitoring · Executive News · Self Learning ·
Persistent Memory · Full Voice (STT + streaming TTS).
