# Stage 3 — Enterprise Execution Engine

Build the execution layer underneath ARIA. The pipeline brain (Stage 2) already does Intent → Memory → RAG → KPI → Risk → Decision → Reasoning → Reports. This stage adds **real execution**: tools that actually run, workflows that orchestrate them, agents that delegate, events that propagate, predictions, and full observability.

Existing foundations to reuse (do **not** rebuild):
- `sec_activity_events` (audit trail), `audit_logs` (cross-cutting audit), `aria_decisions`, `aria_memory`, `aria_knowledge` (pgvector), `aria_reports`, `user_roles` + `has_role`, RLS on every `sec_*` table.
- Existing tools in `src/lib/aria-tools.server.ts` (sec_*, create_task, etc.).
- Existing connector wrappers: `src/lib/sharepoint.functions.ts`, `outlook.functions.ts`, `teams.functions.ts` + the `MICROSOFT_*` connector keys.

This scope is multi-day. I'll ship in **3 incremental phases**; each phase ends with passing tests and a usable surface. Confirm phase order or stop me mid-way.

---

## Phase A — Foundation (Tool Orchestrator + Audit + Workflow Engine)

Everything else depends on this. Ship first.

### Data layer (one migration)
- `tool_registry` — declarative tool catalog: `id`, `category` (sap/m365/outlook/teams/sharepoint/azure_ad/oracle/rest/graph/n8n/webhook/sql/edge/internal), `schema_json`, `permissions text[]`, `requires_approval`, `rollback_kind` (none/inverse/compensating), `rollback_tool_id`, `enabled`, `version`.
- `tool_executions` — every invocation: `tool_id`, `actor_id`, `workflow_run_id?`, `input_json`, `output_json`, `status` (queued/running/succeeded/failed/rolled_back), `duration_ms`, `error`, `correlation_id`, `started_at`, `finished_at`.
- `workflows` — definition: `id`, `name`, `description`, `definition_json` (steps DAG), `version`, `enabled`, `owner_id`.
- `workflow_runs` — execution: `workflow_id`, `status`, `triggered_by`, `trigger_event`, `context_json`, `current_step`, `error`, timing.
- `workflow_step_runs` — per-step: `run_id`, `step_id`, `kind` (tool/condition/loop/approval/parallel/wait), `status`, `attempt`, `input/output_json`, `error`, timing.
- `enterprise_events` — event bus: `id`, `topic`, `payload_json`, `source`, `correlation_id`, `occurred_at`, `processed_at`, `status` (pending/processed/dead).
- `agent_definitions` — `id`, `name`, `goal`, `system_prompt`, `permissions text[]`, `tool_allowlist text[]`, `memory_scope`, `owner_id`, `enabled`.
- `agent_runs` — `agent_id`, `triggered_by`, `goal_override`, `context_json`, `status`, `summary`, timing, `audit_json`.

All tables: GRANTs, RLS scoped to admin/owner via `has_role`, service_role full access. `enterprise_events` and `tool_executions` enabled for Supabase Realtime.

### Code (`src/lib/exec/`)
- `tool-registry.server.ts` — typed registry. Each entry: `permission` check (via `has_role` + ABAC predicate), `execute(input, ctx)`, optional `rollback(execId, ctx)`. Wraps existing ARIA tools + adds first-class connector tools:
  - `m365.outlook.send_mail`, `m365.teams.post_message`, `m365.sharepoint.upload_file`, `m365.graph.get_user` (via gateway, real).
  - `rest.http` (signed/allowlisted), `webhook.dispatch`, `sql.exec` (read-only by default, write requires admin role + approval).
  - `supabase.invoke_edge_function`.
  - SAP / Oracle / Azure AD: stub entries with `enabled: false` + clear "connector required" doc strings (production-honest, no fake calls).
- `tool-orchestrator.server.ts` — `executeTool({toolId, input, actor, workflowRunId?})`: validate input via Zod schema from registry, check permissions, queue audit row, run with timeout + retry, persist output, emit `enterprise_event`, return execution id. Approval gate: if `requires_approval` and not pre-approved, return `pending_approval` and create `aria_decisions` row.
- `workflow-engine.server.ts` — interprets `definition_json` (steps DAG with kinds: `tool`, `parallel`, `condition`, `loop`, `approval`, `wait`, `subworkflow`). Executes step-by-step with `workflow_step_runs` persistence, retries with exponential backoff, rollback on failure (compensating action chain), pause/resume on approvals.
- `event-bus.server.ts` — `publish(topic, payload, correlationId?)`. Insert + Supabase Realtime channel `enterprise_events`. `subscribe(topic, handler)` server-side for workflow triggers; client side reads via Realtime for live observability.
- `audit.server.ts` — single `audit(...)` helper writing to `audit_logs` with actor, action, resource, before/after.

### API (server functions)
- `runTool({toolId, input})` — uses the orchestrator.
- `approveToolExecution({executionId, decision})`.
- `createWorkflow`, `updateWorkflow`, `enableWorkflow`, `triggerWorkflow({workflowId, payload})`.
- `listToolRegistry`, `listToolExecutions`, `listWorkflowRuns`.

### UI (light, one new route)
`/_authenticated/exec` — Operations Console:
- Left: tool registry (filter by category) with run button + permission badge.
- Center: live execution feed (Realtime), expandable to input/output/audit.
- Right: workflows list with trigger / pause / step-by-step view of latest run.

ARIA's command bar gains a "تنفيذ" tab that lists pending approvals.

### Tests
- Vitest: tool-orchestrator permission checks, retry/rollback, workflow engine (condition + parallel + approval pause/resume), event bus publish/subscribe contract.

---

## Phase B — Agent Runtime + Predictive Engine

Depends on Phase A.

### Data
- `agent_messages` — per-run trace (role, content, tool_calls JSON).
- `predictions` — `id`, `kind` (kpi/incident/asset/maintenance/risk/project_delay), `subject_id`, `subject_type`, `horizon_hours`, `forecast_json`, `confidence`, `generated_at`, `model_id`.

### Code (`src/lib/exec/`)
- `agent-runtime.server.ts` — spawn agent run: load identity (system prompt + tool allowlist + memory scope), inject ARIA pipeline context + recalled memory, run AI SDK agent loop (`stopWhen: stepCountIs(50)`) where each tool call goes through `tool-orchestrator` (so audit/permission/rollback apply uniformly). Agent uses only its allowlisted tools.
- `predictions.server.ts` — scheduled & on-demand predictors using `openai/gpt-5` + `Output.object` Zod schemas:
  - KPI 24h/7d forecast (uses last 30d of `sec_*` data).
  - Asset failure risk (current health trend + work-order history).
  - Incident escalation likelihood (severity/age/category).
  - Project delay forecast (sec_projects budget/progress).
  Persists to `predictions`. Surfaced inline in `/aria` next-decision panel.

### API & UI
- `spawnAgent`, `getAgentRun`, `listAgents`, `seedDefaultAgents` (Compliance Auditor, Incident Triager, Maintenance Planner, Executive Briefer — all real, scoped, audit-trailed).
- `/agents` route gains a live console.

---

## Phase C — Digital Twin Runtime + Exports + Observability dashboard

### Twin runtime
- Extend `sec_assets`, `sec_cameras`, `sec_gates`, `sec_sensors` with computed runtime view (`twin_objects` view) exposing: state, health, last_telemetry, dependencies (parent site/building), predictions (join), recommended_action (tool_id), executable boolean.
- `twin.execute_action({objectId, action})` — wraps `tool-orchestrator`; logs to twin history view.

### Reports exports
- Markdown ships today. Add XLSX (real `xlsx` package — Worker-compatible), DOCX (`docx` package), HTML→PDF (print-ready route `/_print/reports/$id` user prints to PDF; native PDF generation in Workers is unreliable without external service). PPTX: structured slide JSON export with documented import path (real PPTX generation requires headless conversion service the platform doesn't host).

### Observability
- `/observability` route: live `tool_executions` p50/p95, success rate by tool, top errors, top correlation traces. Driven by Supabase queries on real exec data — no synthetic metrics.

### Security hardening
- `audit_logs` indexed and queryable by admin.
- Rate-limit middleware on `runTool` (per-user sliding window in `enterprise_events`).
- Per-tool ABAC predicates documented and enforced.

---

## Out of scope (call out honestly)
- **SAP / Oracle / Azure AD live calls**: no connectors are linked. Registry entries exist as `enabled: false` with clear "Connect via Settings → Connectors" copy. I will not fake responses.
- **Native PDF/PPTX rendering inside Cloudflare Workers**: not supported reliably. Print-ready HTML + XLSX + DOCX + Markdown will ship; PPTX is a structured outline JSON.
- **n8n MCP**: requires user to enable MCP per workflow in n8n. Webhook dispatch tool will work end-to-end today.

---

## Confirm before I build

1. **Order OK?** Phase A first (foundation), then B, then C — each shippable on its own.
2. **OK to add 8 new tables + enable Realtime on `enterprise_events` and `tool_executions`?**
3. **For SAP/Oracle/Azure AD**, accept the "registered but disabled until connector linked" approach (no fake clients)?
4. **For exports**, accept Markdown + XLSX + DOCX + print-to-PDF now, with PPTX as structured outline?

Say "go" or correct any of the four, and I'll start Phase A in the next turn.
