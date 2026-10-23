# SADEED — AI Architecture

> هذه الوثيقة تصف **ما يفعله الكود فعلًا** (قِيس ٢٠٢٦/١٠/١٨). النسخة السابقة كانت
> تقول «Lovable AI Gateway، الافتراض `openai/gpt-5`، والاحتياط `gemini-1.5-flash`» —
> ولم يكن شيء من ذلك صحيحًا: لم يوجد أيّ مسار إلى OpenAI، والمزوّد كان Gemini مباشرةً.

## Charter v10.0 (Enforced)

1. **No fabrication.** Every operational statement must trace back to a tool result or a bundled production dataset.
2. **Bilingual AR/EN.** Output language matches request locale, with RTL-safe formatting.
3. **Forensic traceability.** Agent steps write `tool_executions`, `workflow_step_runs`, `enterprise_events`, `audit_logs`, linked by `correlation_id`.
4. **Schema-aware.** Tool inputs are validated with zod; `sql.read` uses a table allowlist, a per-table column whitelist, and an `org_id` filter.
5. **Human-in-the-loop for writes.** Chat write tools write nothing on the first call and execute once only after the user's next message explicitly confirms (server-sealed proposal); agent tools flagged `tool_registry.requires_approval` wait for an admin decision on `/exec`.

## 1. Zero-cost first (owner order 2026/10/18)

The assistant's core answers do **not** depend on a paid model. `/api/chat` answers these deterministically, with no model call and no AI-quota spend:

| Layer            | Source                                          | Example                                                           |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Scope guard      | `src/lib/sadeed/response-contract.ts`           | out-of-scope question → one fixed line                            |
| Fast recall      | `matchFastRecall`                               | identity questions                                                |
| Instant data     | `src/lib/sadeed/instant-data-answers.server.ts` | «كم عدد المشاريع؟» — counted from the bundled production datasets |
| Zero-cost router | `src/lib/sadeed/llm/zero-cost-router.server.ts` | help/commands, English counts, "open the maintenance page"        |

These layers run even when no model is configured and when the rate-limit store is down under the `closed` policy. A request that genuinely needs language reasoning gets an honest reply saying the analysis engine is not enabled, plus examples of supported commands — never a guessed answer.

Deterministic answers are **not** AI reasoning and are not presented as such.

## 2. Provider plan — one explicit choice, no silent switching

`src/lib/sadeed/llm/provider-plan.server.ts` resolves the model for `/api/chat`:

| `SADEED_LLM_PROVIDER`                            | Requires                                                                                                | Result                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| unset / `gemini`                                 | `GEMINI_API_KEY` (or `GOOGLE_GENERATIVE_AI_API_KEY`)                                                    | Google Gemini direct (`src/lib/ai-gateway.server.ts`, allowlisted model) |
| `openai`                                         | `OPENAI_API_KEY` **and** `SADEED_OPENAI_ENABLED=true`; optional `SADEED_OPENAI_MODEL` from an allowlist | OpenAI via `@ai-sdk/openai` (server only)                                |
| `none`                                           | —                                                                                                       | zero-cost mode: deterministic layers only                                |
| anything else / selected provider not configured | —                                                                                                       | zero-cost mode (never another vendor)                                    |

- **Optional backup** (Lovable AI Gateway, Gemini model): only when `SADEED_BACKUP_PROVIDER=lovable` and `LOVABLE_API_KEY` are set. It is metered, so it is off by default — no silent fallback to a paid path.
- The vendor and model that actually produced an answer are logged and persisted; the reply carries `X-SADEED-Reply-Source` (`model`, `model-backup`, `instant-data`, `zero-cost`, …).
- **GPT is not active** until the owner supplies a key and both flags. No test or deployment calls a paid API.

Other AI surfaces (executive briefing, agent runtime, MCP `ask_sadeed`, transcription, embeddings) still use Gemini directly through `resolveSadeedGeminiRuntime(s)`. Voice stays exclusive (ElevenLabs server TTS); embeddings stay on Gemini (1536-dim index) — changing them would require re-indexing.

## 3. Agent runtime

- Entry: `POST /api/public/hooks/run-agent` (cron secret, or org manager+ bearer) and the `/agents` / `/exec` server functions.
- Engine: `src/lib/exec/agent-runtime.server.ts`: model loop with a step cap and an overall deadline; stops when the run is cancelled.
- Tools: `src/lib/exec/tool-registry.server.ts` through `tool-orchestrator.server.ts` (timeouts; retries only for idempotent tools; approval gate from `tool_registry.requires_approval`).
- An approved action runs once, on the same `tool_executions` row; a run with pending approvals leaves its workflow `waiting_approval`.
- The chat assistant reads this state read-only (`execution_status` tool, `src/lib/exec/execution-status.server.ts`) instead of keeping its own.

## 4. Memory & RAG

- Tenant knowledge: `finn_*` tables, retrieved by `gatherRagContext` for signed-in users, injected as untrusted data.
- The `20260728*` RAG migrations are **not applied** in production (see CLAUDE.md); no recall or citation figure exists.

## 5. Voice

- **TTS**: ElevenLabs via `/api/sadeed/tts` → `/api/public/sadeed-tts` (male SADEED voice only; `speechSynthesis` banned).
- **STT**: `/api/sadeed/transcribe` → `/api/public/sadeed-transcribe`.

## Anti-Patterns Explicitly Banned

- Prompt-only "must use tool X" rules — enforced in code via schemas.
- Silent provider switching across cost classes.
- Claiming an action happened without `executed: true` from the backend.
- `service_role` reads for routine user requests without an explicit `org_id` filter.
