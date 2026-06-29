---
name: crisis-decision-matrix
description: Classify pulse_crises into P0-P4 priority bands and produce executive Teams brief for P0/P1.
---

# Crisis Decision Matrix

## Priority Bands
| Band | Trigger | Response Time | Notify |
|---|---|---|---|
| P0 | Life safety / multi-site outage | < 5 min | CSO + COO + Teams #crisis |
| P1 | Single critical site, security breach | < 15 min | Site head + Ops Director |
| P2 | Contained high-severity incident | < 60 min | Shift supervisor |
| P3 | Operational degradation | Same shift | Team lead |
| P4 | Informational / near-miss | Next business day | Log only |

## Inputs
- `pulse_crises(id, priority, status, started_at, site_id, summary)`
- `sec_incidents` linked via `source_incident_id`

## Teams Brief Template (P0/P1)
```
[P{n}] {summary}
Site: {site_name} | Started: {started_at}
Open incidents: {count} | Severity mix: {breakdown}
Recommended next action: {action}
Owner: {assigned_to or "PENDING ASSIGNMENT"}
```

## Constraints
- Require teamId + channelId from user before posting; never invent IDs.
- If pulse_crises empty → "لا توجد أزمات نشطة" (do not fabricate).
