# ARIA Singleton — Architecture

> The ONE ARIA. Do not create a second one.

## Rules

1. **One provider.** `<AriaProvider>` is mounted exactly once in
   `src/routes/__root.tsx`, above `<Outlet />`. It never unmounts during
   navigation, so conversation, voice, memory, and context persist across
   every route change — same instance, same session, same audio pipeline.
2. **One UI.** `<AriaCopilot />` (dock + composer + launcher) is the ONLY
   ARIA chrome in the app. No route may render its own copilot, overlay,
   or command bar.
3. **One backend.** All ARIA traffic goes to `/api/chat` (auth, RAG,
   tools, memory, rate-limiting, threads). No other endpoint is spoken
   to by the singleton.
4. **One store.** `useAriaStore` (Zustand) owns UI/voice/page-context.
   Messages live in the singleton `useChat` inside the provider — never
   duplicated in the store.
5. **One hook.** Routes and components use `useAria()` from
   `@/lib/aria-core/use-aria`. There are no other entry points.

## Enterprise Singleton Guarantees

| Concern           | Owner                                                      |
| ----------------- | ---------------------------------------------------------- |
| Conversation      | `useChat` inside `<AriaProvider>` (one instance, app-wide) |
| Voice pipeline    | `<AriaProvider>` (one MediaRecorder, one audio session)    |
| Memory            | `/api/chat` server thread (one persistent thread per user) |
| Context           | `useAriaStore.pageContext` (updated by route adapters)     |
| Reasoning         | Server-side agent loop on `/api/chat`                      |
| Execution         | Server-side tool router on `/api/chat`                     |
| Event bus         | `useAriaStore` command queue (Zustand)                     |
| WebSocket / SSE   | The `useChat` stream from `<AriaProvider>` only            |

## Migration — Turn 2 Complete

All legacy ARIA duplicates have been removed. The following files no
longer exist in the codebase:

- `src/components/executive/GlobalAriaCopilot.tsx`
- `src/components/executive/AriaLiveBriefing.tsx`
- `src/components/executive/DeveloperBrainToggle.tsx`
- `src/components/executive/DemoAriaPresenter.tsx`
- `src/components/executive-overlay.tsx`
- `src/components/aria-command-bar.tsx`
- `src/lib/aria/context-engine.tsx` (`AriaContextProvider`, `useAriaContext`)
- `src/lib/aria/session-memory.ts` (client-side memory duplicate)
- `src/lib/aria/use-auto-scan.ts`
- `src/lib/aria/index.ts` (legacy barrel)

The remaining `src/lib/aria/**` tree contains server functions,
domain-specific logic, and avatar/motion helpers — not ARIA runtime
state. Those are safe to keep.

## Adapter Pattern for Routes

A route that needs to give ARIA page-specific context uses the singleton
hook, never its own state:

```tsx
import { useAria } from "@/lib/aria-core/use-aria";

function IncidentsPage() {
  const aria = useAria();
  useEffect(() => {
    aria.setPageContext({
      section: "security.incidents",
      title: "Incidents",
      kpis: [{ id: "open", label: "Open Incidents", value: open }],
    });
  }, [open]);
  // ...
}
```

Route adapters may only:
- read from `useAria()`
- call `aria.setPageContext(...)`, `aria.ask(...)`, `aria.open(...)`

They may NOT own conversation state, voice state, memory, or a second
copilot component.
