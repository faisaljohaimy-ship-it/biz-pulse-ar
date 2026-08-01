# FINN Brain Core

FINN is the single governed intelligence surface in SADEED. Every UI request passes through the shared provider, brain, orchestrator, response validator, and `/api/chat` transport.

## Runtime flow

```text
User → useFinn().ask()
     → finnBrain.submit()
     → context + intent + conversation governance
     → /api/chat
     → native Google Gemini (gemini-3.6-flash)
     → governed tools / evidence-gated RAG
     → validated stream → FINN UI
```

The intent header changes instructions and permitted tools; it cannot select a different vendor or arbitrary model. The server allowlist resolves every intelligence request to Google Gemini.

## Singleton guarantees

| Concern | Sole owner |
| --- | --- |
| UI provider | `FinnProvider` in the app root |
| Client brain | `finnBrain` |
| Conversation lifecycle | `conversationManager` |
| Server model policy | `server/ai-router.server.ts` |
| Intelligence provider | native `@ai-sdk/google` adapter |
| Specialist orchestration | FINN Chief + canonical Council of Ten |
| Knowledge | tenant-scoped hybrid RAG + Evidence Gate |
| Transport | `/api/chat` |

## Model policy

- Intelligence and transcription: `gemini-3.6-flash`.
- Embeddings: `gemini-embedding-2`, normalized to 1536 dimensions for the current index.
- Speech output: ElevenLabs only; it never performs reasoning or retrieval.
- No client-controlled model IDs, cross-vendor fallback, or direct provider calls from components.

## Governed learning

FINN does not retrain foundation-model weights. It may remember allowlisted user presentation preferences and propose new RAG candidates. Model-generated candidates stay unverified and are excluded from retrieval until an authorized human approves them. Retrieval is tenant-isolated and fails closed when evidence or organization context is insufficient.

## Forbidden

- A second FINN provider, brain, transport, or conversation store.
- Direct provider SDK calls from browser components.
- Treating model output as verified knowledge.
- Auto-approving generated RAG content.
- Executing consequential tools without policy and approval checks.
- Exposing provider errors, hidden reasoning, secrets, or cross-tenant data to users.
