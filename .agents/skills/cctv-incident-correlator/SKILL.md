---
name: cctv-incident-correlator
description: Correlate sec_cctv_alerts with open sec_incidents by site_id/camera_id/time window and recommend escalate/dismiss/open-ticket.
---

# CCTV ↔ Incident Correlator

## Inputs
- `sec_cctv_alerts(id, camera_id, site_id, alert_type, severity, detected_at, status)`
- `sec_incidents(id, site_id, severity, status, occurred_at)`
- `sec_cameras(id, site_id, zone)`

## Correlation Rules
1. **Match window**: alert.detected_at ± 15 min around incident.occurred_at
2. **Spatial match**: alert.site_id = incident.site_id (zone match boosts confidence)
3. **Severity gate**: critical/high alerts always trigger correlation pass

## Decision Matrix
| Match | Severity | Action |
|---|---|---|
| Yes | critical/high | Escalate → link alert to incident, notify shift |
| Yes | medium | Open ticket, attach to existing incident |
| No  | critical | Open new incident (sec.create_incident) |
| No  | low/medium | Mark alert as `dismissed` with reason |

## Output Shape
`{ alert_id, matched_incident_id|null, confidence: 0-1, action, reason }`

## Constraints
- Never fabricate camera_id or site_id; if missing data, report "البيانات غير متوفرة".
