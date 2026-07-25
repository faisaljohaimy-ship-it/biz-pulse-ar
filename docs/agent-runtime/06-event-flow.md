# 06 — Event Flow · تدفق الأحداث

**Section 06 implementation — the eight runtime events and who emits them.**

---

## Vocabulary & emitters

| Event | Emitted when | Detail payload |
|---|---|---|
| `execution-requested` | a plan is filed (protocol or event-trigger) | mode, agents, filedBy |
| `execution-approved` | an approver with the `approval` permission approves | approver |
| `execution-rejected` | approver rejects, OR an approval hook vetoes | approver+reason / veto |
| `agent-started` | invocation enters running | traceId |
| `agent-finished` | invocation succeeds | traceId, latency |
| `agent-failed` | invoker throws | traceId, error |
| `agent-paused` | coordinator pause | by |
| `agent-resumed` | coordinator resume | by |

## Flow

```mermaid
sequenceDiagram
    participant Op as principal
    participant Co as coordinator
    participant Bus as event bus
    participant Ag as agent (future)
    Op->>Co: request(plan)
    Co->>Bus: execution-requested
    Op->>Co: approve(requestId) [approval permission]
    Co->>Bus: execution-approved
    Op->>Co: run(requestId)
    Co->>Bus: agent-started
    Co->>Ag: invoker(agentId, input, context)
    alt success
        Co->>Bus: agent-finished (latency)
    else failure
        Co->>Bus: agent-failed (error)
    end
    Note over Bus: every emission journaled;<br/>throwing listeners isolated
```

## Event-driven execution (the safe kind)

`bindEventTrigger(event, plan, bindingContext)` subscribes the coordinator
to a bus event. When it fires, the coordinator **files a pending request**
(child context of the binding, `execution-requested` emitted, logged) —
it never runs anything. The human gate stays intact even for reactive
automation; a later phase may auto-approve specific bindings *through the
same approval API*, leaving the audit trail whole.

## Guarantees

- Unknown event names are refusals (closed vocabulary).
- The journal, not any listener, is the audit authority; a throwing
  handler never breaks the runtime.
- Every protocol emission is mirrored into the `AuditTrail` with actor
  attribution — events tell what happened, audit tells who did it.
