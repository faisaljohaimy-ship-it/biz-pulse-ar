---
name: cctv-alert-correlator
description: Correlate sec_cctv_alerts with sec_incidents, sec_assets, and sec_activity_events to suppress false positives and surface real threats. Use when triaging CCTV alert storms.
---

# CCTV Alert Correlator

## Correlation Rules
1. Alert + open incident on same `building_id` within 10 min → attach to incident, suppress duplicate.
2. Alert + scheduled `sec_permits` (e.g., maintenance) on same asset → mark `false_positive_likely`.
3. Alert + after-hours + no permit + restricted zone → escalate P1.
4. Repeated alerts (>5/hour) on same camera → flag camera health, notify `integration_health` agent.

## Suppression Filters
- Daylight motion in public courtyards → low confidence.
- Vehicle alerts at registered `sec_vehicles.last_seen_gate` within 5 min → suppress.

## Output
`{ alert_id, action: attach|suppress|escalate, incident_id?, confidence, reason_ar }`
