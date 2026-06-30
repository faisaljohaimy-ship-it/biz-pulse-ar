# NEXIOS AI OS — AI Architecture

## Charter v10.0 (Enforced)
1. **No fabrication.** Every operational statement must trace back to a tool result.
2. **Bilingual AR/EN.** Output language matches request locale, with RTL-safe formatting.
3. **Forensic traceability.** Every step writes `audit_logs`, `tool_executions`, `enterprise_events`, `workflow_step_runs`, all linked by `correlation_id`.
4. **Schema-aware.** Tool inputs validated against `z.enum` table allowlists and per-table column whitelists; a malformed call cannot reach the database.
5. **Human-in-the-loop for critical actions.** Tools with `needsApproval: true` (incident escalation, emergency dispatch, irreversible deletes) require explicit approval before execution.

## Gateway
- **Provider**: Lovable AI Gateway (OpenAI-compatible).
- **Helper**: `src/lib/ai-gateway.server.ts` — uses `@ai-sdk/openai-compatible`.
- **Default model**: `openai/gpt-5` (Charter v10.0 prompts omit `temperature` for gpt-5 family).
- **Fallback**: `google/gemini-1.5-flash` when payload size or cost dictates.

## Agent Runtime
- Entry: `POST /api/public/hooks/run-agent` (Zod-validated, hook-secret-gated).
- Engine: `src/lib/exec/agent-runtime.server.ts`.
- Uses `supabaseAdmin` for orchestration writes (RLS would block service-internal bookkeeping otherwise).
- Step loop: model call → tool selection → tool execution (registry-bounded) → write step_run + tool_execution + event + audit_log → repeat until `stopWhen` or terminal state.
- Final: writes `aria_reports` row + emits final `enterprise_event`.

## Tool Registry
`src/lib/exec/tool-registry.server.ts` — every tool is a `tool({ description, inputSchema, execute })`:
- `sql.read` — read-only, `z.enum` of allowed `sec_*` tables, per-table column whitelist.
- `kb.search` — HNSW vector search over `sec_knowledge_articles`.
- `incident.create` / `patrol.assign` / `permit.issue` — mutation tools, all with `needsApproval`.
- `m365.outlook.send`, `m365.sharepoint.upload`, `m365.teams.post_message` — credentialed integrations.

## Memory & RAG
- **Short-term**: `aria_memory` (per-user, RLS-scoped) — last N turns, JSON facts.
- **Long-term**: `pulse_memory` — operational state cache refreshed by Pulse Engine.
- **RAG**: `aria_documents` + `aria_document_chunks` (1536-dim embeddings, HNSW) for SOP/policy retrieval; `sec_knowledge_articles` for the Industrial Security Repository.
- **Ingest hook**: `POST /api/public/hooks/aria-docs-ingest` — bilingual chunking with overlap, embedding via gateway.

## Multi-Agent Orchestration
14 seeded agents in `agent_definitions` (Executive Briefer, CCTV Analyst, Compliance Officer, Asset Health Inspector, Emergency Coordinator, etc.). Each agent:
- Has a charter-v10.0-compliant system prompt
- Declares its tool allowlist
- Routes through the unified `/api/public/hooks/run-agent` endpoint
- Produces correlation-id-linked artifacts

## Pulse Engine
`src/lib/pulse.functions.ts` — 6-second cycle aggregating live KPIs from `sec_*` tables into `pulse_kpis`, `pulse_crises`, `pulse_execution`. Powers the dashboard cockpit + Living Narrator.

## Voice
- **TTS**: ElevenLabs via `/api/tts` (Zod-validated, rate-limited).
- **STT**: ElevenLabs via `/api/voice-token` + browser SDK.

## Avatar
- **Default**: R3F procedural bust (`AriaScene.tsx`) — gaze tracking, audio-driven lip-sync, hijab + executive identity. No external credentials.
- **Optional**: HeyGen LiveAvatar (`HeygenAvatarProvider.tsx`) — gated on `HEYGEN_API_KEY`. Currently returns 401/410 against legacy endpoints; see `KNOWN_EXTERNAL_DEPENDENCIES.md`.

## Anti-Patterns Explicitly Banned
- Prompt-only "must use tool X" rules. Tool requirements are enforced in code via `z.enum` input schemas — model cannot route around them.
- Hidden retry/repair LLM passes that mutate the answer.
- Distillation that re-enters memory as pseudo-facts.
- `service_role` for routine application reads.
