# SADEED Brain Core

SADEED is the single governed intelligence surface in SADEED. Page commands pass through the brain and orchestrator; the copilot composer currently calls the shared provider's `chat.sendMessage` directly. Both use the same `/api/chat` transport and server output validator.

## Runtime flow

```text
User → useSadeed().ask()
     → sadeedBrain.submit()
     → context + intent + conversation governance
     → /api/chat
     → native Google Gemini (gemini-3.6-flash)
     → governed tools / evidence-gated RAG
     → validated stream → SADEED UI
```

The intent header changes instructions and permitted tools; it cannot select a different vendor or arbitrary model. The server allowlist resolves every intelligence request to Google Gemini.

## Singleton guarantees

| Concern                  | Sole owner                               |
| ------------------------ | ---------------------------------------- |
| UI provider              | `SadeedProvider` in the app root         |
| Client brain             | `sadeedBrain`                            |
| Conversation lifecycle   | `conversationManager`                    |
| Server model policy      | `server/ai-router.server.ts`             |
| Intelligence provider    | native `@ai-sdk/google` adapter          |
| Specialist orchestration | SADEED Chief + canonical Council of Ten  |
| Knowledge                | tenant-scoped hybrid RAG + Evidence Gate |
| Transport                | `/api/chat`                              |

## Model policy

- Intelligence and transcription: `gemini-3.6-flash`.
- Chat has an existing Gemini gateway backup (`google/gemini-3-flash-preview`) when `LOVABLE_API_KEY` is configured. Temporary primary failures and unsupported primary models can select it; explicit 400/401/402/403 errors cannot. Backup availability is not established by a primary-provider smoke test.
- Embeddings: `gemini-embedding-2`, normalized to 1536 dimensions for the current index.
- Speech output: ElevenLabs only; it never performs reasoning or retrieval.
- No client-controlled model IDs, cross-vendor fallback, or direct provider calls from components.

## Governed learning

SADEED does not retrain foundation-model weights. It may remember allowlisted user presentation preferences and propose new RAG candidates. Model-generated candidates stay unverified and are excluded from retrieval until an authorized human approves them. Retrieval is tenant-isolated and fails closed when evidence or organization context is insufficient.

## Forbidden

- A second SADEED provider, brain, transport, or conversation store.
- Direct provider SDK calls from browser components.
- Treating model output as verified knowledge.
- Auto-approving generated RAG content.
- Executing consequential tools without policy and approval checks.
- Exposing provider errors, hidden reasoning, secrets, or cross-tenant data to users.
