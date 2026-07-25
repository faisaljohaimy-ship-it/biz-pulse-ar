# 05 — Observability Guide · دليل الرصد

**Section 08 implementation — tracing, metrics, logs, events, health,
latency and execution time. Everything measured from an injected monotonic
tick source; the runtime never reads wall time.**

---

## Tracing (`TraceCollector`)

- One span per agent invocation, named `agent-invocation`, parented to the
  caller's context trace (`parentTraceId`) — composite executions read as
  one tree under one `correlationId`.
- `start / end(status ok|error)` with double-end protection;
  `durationOf(traceId)` = execution time in monotonic ticks;
  `childrenOf(traceId)` walks the tree.

## Metrics (`MetricsRegistry`)

Per-agent counters and latency series:

| Field | Meaning |
|---|---|
| `started / finished / failed` | invocation counters |
| `latencies` | every measured invocation duration |
| `meanLatency` / `maxLatency` | derived at snapshot time |

Failures record latency too — a slow failure is still a measured failure.

## Logs (`LogJournal`)

Structured entries `{level, subjectId, message, at, traceId?, fields}` with
level/subject filtering. The coordinator writes an `error` entry for every
failed invocation, tied to the failing span.

## Events & health

- The 8-event `AgentEventBus` journal is itself an observability surface:
  `logFor(agentId)` reconstructs an agent's operational story
  (started → finished/failed, paused/resumed, request lifecycle).
- Health lives in the shared `HealthModel` (worst-of aggregation); the
  runtime degrades an agent to `warning` on invocation failure with the
  error noted, and refuses to run `critical`/`offline` agents.

## Correlation model (Section 07 tie-in)

| Id | Scope | Purpose |
|---|---|---|
| `correlationId` | whole execution chain | one story across all children |
| `traceId` | one context / one span | timing + tree structure |
| `auditId` | one context | joins the audit trail |

Exporters (OTLP etc.) are later-phase adapters over these in-memory
collectors — the shapes are already exporter-friendly.
