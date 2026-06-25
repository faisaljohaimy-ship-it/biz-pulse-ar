# ARIA Executive Intelligence — Production Pipeline

Scope: upgrade ARIA from a chat surface to a deterministic Executive Intelligence pipeline backed by real Supabase data, persistent memory, RAG, KPI/Risk engines, tool orchestration, and report generation. Build incrementally on the existing stack (TanStack Start + `sec_*` tables + `src/lib/sec.functions.ts` + `src/lib/aria-tools.server.ts` + `src/routes/api/chat.ts`).

This plan does **not** rebuild the UI from scratch. It hardens the brain behind ARIA and exposes it through the existing command bar and a new `/aria` workspace.

---

## Phase 1 — Pipeline Core (deterministic orchestrator)

Create `src/lib/aria/` with one module per pipeline stage. Each stage is a pure async function returning a typed slice; the orchestrator composes them and streams stage events to the UI.

1. `intent.server.ts` — classifier (fast model, JSON schema): `{intent, entities, language, requires_tools, requires_report, confidence}`. Categories: `kpi_query | risk_query | incident_lookup | report_request | tool_action | conversational`.
2. `memory.server.ts` — read/write persistent memory from new `aria_memory` table (semantic key + content + embedding). Auto-recall top-K by embedding similarity + recency.
3. `rag.server.ts` — embed query (`google/gemini-embedding-001`), pgvector search on `aria_knowledge`. Returns chunks + citations.
4. `enterprise-context.server.ts` — loads compact enterprise snapshot from `sec_*` (sites, open incidents, active patrols/permits, asset health) scoped by user role via RLS.
5. `kpi-engine.server.ts` — wraps existing `computeExecKpis` + diff vs prior 24h/7d window; outputs deltas and threshold breaches.
6. `risk-engine.server.ts` — weighted scoring across open incidents (severity, age), permits expiring, asset health <60, cctv offline. Returns ranked risks with reasoning trace.
7. `decision.server.ts` — rule layer: maps risks → recommended actions (tool names + params) with confidence and alternatives.
8. `reasoner.server.ts` — calls `openai/gpt-5` via Lovable Gateway with full assembled context as a structured system block. Streams text + tool calls.
9. `tools.server.ts` — extends `aria-tools.server.ts` registry; adds `needsApproval` for mutations. Tools run after reasoner emits calls; results fed back (AI SDK `stopWhen: stepCountIs(50)`).
10. `reports.server.ts` — generates Executive / Daily / Weekly / Monthly / Incident / Risk / Operations / Board reports as structured JSON → renders to Markdown, HTML, and downloadable XLSX (xlsx) + PDF (via print-ready HTML route).
11. `orchestrator.server.ts` — runs the full pipeline, emits stage events `{stage, status, durationMs, summary}` over SSE.

## Phase 2 — Data layer (migrations)

New tables (all with GRANTs + RLS scoped to `auth.uid()` + admin via `has_role`):

- `aria_threads` (already exists as `threads`; reuse, add `summary`, `pinned`).
- `aria_messages` — add `stage_trace jsonb`, `tool_calls jsonb`, `citations jsonb`, `confidence numeric`, `tokens int`.
- `aria_memory(id, user_id, scope, key, content, embedding vector(768), importance, created_at, last_used_at)`.
- `aria_knowledge(id, title, source, content, embedding vector(768), tags text[], updated_at)` — seeded from `knowledge_docs` + `sec_*` summaries by a server function (not fake data).
- `aria_reports(id, user_id, kind, period_start, period_end, payload jsonb, markdown text, created_at)`.
- `aria_decisions(id, user_id, thread_id, recommendation, rationale, confidence, executed_tool, status)`.

Enable `pgvector`; add IVFFlat indexes on embeddings.

## Phase 3 — API surface

- `src/routes/api/aria.stream.ts` — POST, SSE. Body: `{threadId, message, mode}`. Runs orchestrator, streams `event: stage` + `event: token` + `event: tool` + `event: report` + `event: done`. Uses `requireSupabaseAuth` equivalent via bearer.
- `createServerFn`s in `src/lib/aria/*.functions.ts`: `listThreads`, `getThread`, `pinMemory`, `forgetMemory`, `listReports`, `downloadReport`, `ingestKnowledge`.
- Integration stubs documented disabled: SAP, n8n webhook out, Teams/Outlook/SharePoint (reuse existing connectors).

## Phase 4 — UI (`/aria` workspace + command bar upgrade)

`src/routes/_authenticated/aria.tsx` — three-pane executive console:

- Left: threads + pinned memories.
- Center: message stream with **stage timeline** (Intent → Memory → RAG → Context → KPI → Risk → Decision → Reasoning → Tools → Report), each stage expandable to show trace, citations, tool I/O. Tool approvals inline.
- Right: live KPI + Risk + Decisions panels bound to the same engines (single source of truth).

Reports tab renders generated reports with Download (MD / XLSX / Print-PDF) buttons. No PowerPoint generation server-side — produce a structured slide outline (JSON) that the user can paste/import; documented.

Upgrade `aria-command-bar.tsx` to call the new SSE endpoint and render compact stage chips.

## Phase 5 — Quality gates

- Vitest: orchestrator stage contracts, intent classifier schema, KPI/Risk determinism, report shape (Zod), RAG ranker.
- Playwright: open `/aria`, send a KPI question, assert stage timeline reaches `done`, assert a citation chip rendered.
- Typecheck + `tsgo` clean. No new console errors verified via dev server logs.

---

## Technical notes (for engineers)

- Models: classifier `google/gemini-3-flash-preview`; reasoner `openai/gpt-5` (omit `temperature`); embeddings `google/gemini-embedding-001`.
- All secrets server-only; `supabaseAdmin` only inside handlers via `await import`.
- SSE response uses `withLovableAiGatewayRunIdHeader` to propagate run id.
- Strict Zod contracts at every stage boundary; failures surface as typed pipeline errors, never silent fallbacks.
- No mock data anywhere — empty states render real "no data" UI tied to the underlying query.

---

## Confirm before I build

This is multi-day scope. Please confirm:

1. Build **all five phases** end-to-end, or start with **Phases 1+2+3** (brain + data + API) and ship UI in a follow-up?
2. OK to enable the `pgvector` extension and add the 5 new tables listed above?
3. Reports: ship **Markdown + XLSX + print-ready HTML for PDF** now, defer native PDF/PPTX generation (Workers can't run headless chromium / pptxgen reliably)?
4. Keep existing `/api/chat` route working during migration, then deprecate once `/api/aria.stream` is stable?
