# ARIA Singleton — Architecture

> The ONE ARIA. Do not create a second one.

## Rules

1. **One provider.** `<AriaProvider>` is mounted exactly once in
   `src/routes/__root.tsx`, above `<Outlet />`. It never unmounts during
   navigation, so conversation, voice, memory, and context persist.
2. **One UI.** `<AriaCopilot />` (dock + composer) and `<AriaLauncher />`
   (FAB) are the ONLY chrome. No route may render its own ARIA UI.
3. **One backend.** All ARIA traffic goes to `/api/chat` (already prod:
   auth, RAG, tools, memory, rate-limiting, threads). No other endpoint
   is spoken to by the singleton.
4. **One store.** `useAriaStore` (Zustand) owns UI/voice/page-context.
   Messages live in the singleton `useChat` inside the provider — never
   duplicated in the store.
5. **One hook.** Routes and components use `useAria()` from
   `@/lib/aria-core/use-aria`. Legacy hooks are deprecated.

## Migration Kill-List (Turn 2+)

These modules exist in the codebase and duplicate the singleton. They
must be migrated to `useAria()` and then deleted:

| Legacy | Replaces with |
|---|---|
| `src/components/executive/GlobalAriaCopilot.tsx` (1166 LOC) | `<AriaCopilot />` |
| `src/components/executive/AriaLiveBriefing.tsx` (425 LOC) | `useAria().open({ draft })` |
| `src/components/executive/DeveloperBrainToggle.tsx` | dev flag on `useAriaStore` |
| `src/components/executive/DemoAriaPresenter.tsx` | demo controller → `useAria().ask()` |
| `src/components/executive/DemoModeHUD.tsx` | move to demo route only |
| `src/components/executive/presentation/PresentationLayer.tsx` | move to demo route only |
| `src/lib/demo/motion-director.tsx` (`DemoMotionOverlay`) | move to demo route only |
| `src/components/executive-overlay.tsx` (1213 LOC, in `app-shell`) | remove; replaced by `<AriaCopilot />` |
| `src/components/aria-command-bar.tsx` (333 LOC) | `useAria().open({ focus: true })` |
| `src/lib/aria/context-engine.tsx` (`AriaContextProvider`) | `useAriaStore` |
| `src/lib/aria/session-memory.ts` | server thread on `/api/chat` |
| Various duplicate voice modules under `src/lib/aria/**` | one pipeline in `<AriaProvider>` |

**Do not delete any of these until every consumer is migrated and validated.**
