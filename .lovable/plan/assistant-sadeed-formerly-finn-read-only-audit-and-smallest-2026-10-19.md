# Assistant (SADEED, formerly FINN) — read-only audit and smallest safe fixes

No files, settings, secrets, or database were changed during the audit. Tests were read, not run.

## 1. How the assistant is wired (verified)

- One provider and one chat panel, mounted at the root: `src/routes/__root.tsx:38-40, 500-576`; provider `src/lib/sadeed-core/providers/sadeed-provider.tsx:42-63` (`useChat` id `sadeed-singleton`).
- `/sadeed`, `/assistant/`, `/assistant/$threadId` all render `src/components/sadeed-core/CanonicalSadeedRoute.tsx:11-23`, which only opens the panel (thread id is ignored).
- Composer sends via `chat.sendMessage()` directly: `src/components/sadeed-core/SadeedCopilot.tsx:1329-1343` (bypasses `sadeedBrain.submit` despite comments requiring it).
- Client transport: `src/lib/sadeed-core/services/sadeed-service.ts:76-169` (Bearer from session, one anonymous retry on 401/403, `/api/chat`), history window 20 msgs `services/chat-window.ts:18-80`.
- Server: `src/routes/api/chat.ts`. Model allow-list only `gemini-3.6-flash` (`src/lib/ai-gateway.server.ts:9-25`); router always Google (`src/lib/sadeed-core/server/ai-router.server.ts:32-38`); backup via Lovable Gateway `google/gemini-3-flash-preview` when `LOVABLE_API_KEY` exists (`src/lib/sadeed/backup-provider.server.ts:10-33`, `chat.ts:1075-1117`).
- Persistence: `threads` / `messages` (`chat.ts:1214-1256`), `finn_interactions`, `finn_adaptive_preferences`, `finn_memory` (`chat.ts:175-203, 1193-1266`). Uses caller-scoped client, so RLS applies. Write failures are logged only.

## 2. Environment variable names (no values)

`GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`, `LOVABLE_API_KEY` (backup), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (rate-limit store), `SADEED_GATE_DEGRADED_MODE`, `SADEED_CHAT_MAX_INFLIGHT`.

## 3. Verified reasons the assistant may not answer

1. No Gemini key: a local canned stream is returned instead of an AI answer (`chat.ts:334-388`).
2. Missing `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`: 503 (`chat.ts:405-420`).
3. Rate-limit store unreachable (database slow/paused): default policy is "closed", so every question gets a local fallback, no model call (`src/lib/governance/rate-limit.server.ts:145-250`, `chat.ts:620-655`).
4. Same text twice in flight: 429 `duplicate_request` (`chat.ts:681-692`); client drops repeats within 800 ms (`core/conversation-manager.ts:25-81`).
5. Concurrency cap (default 8): 503 `busy` (`request-guards.server.ts:17,64-65`, `chat.ts:1057-1070`).
6. Questions sent before the provider mounts are silently dropped (`core/sadeed-brain.ts:50-60`).
7. Client 30 s timeout does not cover session lookup and is overridden when the SDK passes its own signal (`sadeed-service.ts:77-87`), so a hang can appear as "thinking forever".
8. `/api/chat/health` reports `ok: true` even when key or gate is broken (`chat.health.ts:15-50`), and `pingChat()` ignores `gate`.

## 4. Hypotheses (not confirmed)

- Production database still slow/paused, triggering item 3.
- `gemini-3.6-flash` unavailable for the configured key (would surface as 404 → no backup, since backup skips 404).
- Mount timing actually losing user questions; SDK signal causing real hangs.
- Current preview logs are empty, so no live failure was captured.

## 5. Smallest safe fixes (proposed, in order)

1. Diagnose first (read-only): check which keys exist by name, database health, and one live `/api/chat` question in the preview; confirm whether item 3 or a model 404 is the actual cause.
2. Health honesty: include key presence and gate state in `ok` and have `pingChat()` read `gate`. No behavior change to answers.
3. Timeout: start the 30 s timer before session lookup and combine the SDK signal with ours (`AbortSignal.any`).
4. Pre-mount queue: hold one pending question in `sadeedBrain` until the sender binds, instead of dropping it.
5. Backup on model 404: allow the existing backup path for "model not found" only.
6. Item 3 policy (closed vs bounded) stays as is — it is a billing decision for the owner; only flag it.

Each fix gets a small test next to existing ones (`src/routes/api/chat-*.test.ts`, `services/sadeed-service.retry.test.ts`). No changes to roles, permissions, database schema, workflows, navigation, or UI.
