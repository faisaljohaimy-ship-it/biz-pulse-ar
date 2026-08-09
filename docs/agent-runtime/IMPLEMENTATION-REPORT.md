# Agent Runtime Foundation Phase 6 — Implementation Report · تقرير التنفيذ

**v1.0 · `src/sadeed/adaptive-shell/agent-runtime/`**

---

## Delivered

| Section | Deliverable                                                                                                        | Where                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 01      | Agent registry (13 governed fields + modes, queries, gate-protected store)                                         | `registry.ts` + `records.ts` |
| 02      | Runtime manifest wrapping the frozen Phase-1 agent manifest (skills/knowledge/tools refs, IO, contract, policies)  | `records.ts`                 |
| 03      | 10-state lifecycle; operational states protocol-only                                                               | `lifecycle.ts`               |
| 04      | Execution model: single/sequential/parallel/pipeline/broadcast/event-driven/approval-driven over one governed core | `execution.ts`               |
| 05      | Health (reused 5-state model, worst-of aggregation, failure degradation)                                           | population `HealthModel`     |
| 06      | 8-event journaled bus, handler-isolated                                                                            | `events.ts`                  |
| 07      | Execution context: identity/session/hierarchical memory/permission view/correlation/trace/audit ids, child chains  | `execution-context.ts`       |
| 08      | Observability: monotonic trace spans, per-agent metrics + latency, structured logs                                 | `observability.ts`           |
| 09      | Security: deny-by-default authorization, policy decisions, approval hooks with veto, append-only audit trail       | `security.ts`                |
| 10      | This documentation set (architecture, execution flow, lifecycle, registry, observability, event flow)              | `docs/agent-runtime/`        |

## Mandate compliance

- **No real agents / no skills imported / no STARK** — the runtime ships
  with NO invoker; execution fails honestly until a later phase installs
  one (once, replacement refused). Test fixtures are generic
  (`agent.alpha`, `agent.reactor`).
- **Core frozen** — imports resolve only within the Adaptive Shell
  (Phase-1 schemas, population primitives); zero imports from
  `src/sadeed/runtime` or any Core layer. The only pre-existing file touched
  is the shell's own index (one additive export line).
- **Generic · composable · observable · scalable · extensible** — records
  are schema-driven; primitives are reused not duplicated (one definition
  per concept); every invocation is traced/metered/journaled/audited;
  stores are Map-based with no hardcoded lists; closed vocabularies extend
  by amendment.
- **Everything versioned** — agents live on the shared `VersionTimeline`
  (minor/patch self-service, major behind approval, held-versions-only
  rollback).
- **Deterministic** — `Clock`, `Monotonic` and `IdFactory` all injected;
  zero wall-time reads.

## Governance guarantees (tested)

1. `transition(id, "running"|"paused")` is refused — the `OperationalGate`
   is created via static factory with private-method access and handed only
   to the coordinator inside `createAgentRuntime` (the population layer's
   B1 lesson applied from birth).
2. Approval-driven plans and blocking-policy agents cannot `execute()`
   directly — request → approve (`approval` permission per agent) → run.
   Request state is sealed: the live record is coordinator-private, callers
   get frozen snapshots, and plans are structurally cloned at filing/binding
   time — neither a status flip nor a post-filing agent swap is possible.
3. Event-driven bindings only FILE pending requests.
4. Approval hooks can veto any run; vetoes are audited and evented.
5. Only `ready`, non-critical agents run; failures degrade health and
   return the agent to `ready` — no stuck states.

## Verification

19 new tests (`agent-runtime.test.ts`): lifecycle walk + refusals,
admission (valid/malformed/identity/contract/category/duplicates/
capability-resolver wiring), context semantics (memory shadowing, id
chains, permission view), the honest no-invoker refusal, all seven modes'
semantics (fail-fast, chaining, fan-out, shared input), the full approval
protocol + rejection finality, hook veto + release, event-trigger
request-only behavior, gate-guarded pause/resume, per-agent mode
enforcement, and span/metric assertions. Full battery green (tsc, eslint,
suite, build, budget — the layer ships in no route: zero bundle impact).

## Honest boundaries (next phases)

1. The `AgentInvoker` is the seam where real agents arrive; nothing is
   installed here by mandate.
2. Required skills/knowledge/tools references are shape-validated and
   recorded; resolution against live registries lands when content does.
3. Auto-approval policies for event-driven bindings (if ever wanted) must
   go through the same approval API — the seam exists, the decision is
   deferred to governance.
4. Metric/trace exporters (OTLP…) are adapter work over the in-memory
   collectors.
