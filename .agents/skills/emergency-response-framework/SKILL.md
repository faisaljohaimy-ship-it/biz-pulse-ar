---
name: emergency-response-framework
description: Standardized 13-step emergency response framework for industrial security operations — covers 20 emergency classes (fire, explosion, gas leak, oil/chemical release, medical, bomb threat, active shooter, terrorism, natural disasters, power/comms/cyber outage, confined-space and height rescue, vehicle accidents, Hajj crowd surge). Load when ARIA or any operational agent must detect, classify, dispatch, coordinate, or report on an active or potential emergency, or when generating situation reports, executive briefs, lessons-learned, or root-cause analyses for emergency events.
---

# Emergency Response Framework — v1.0

Authoritative emergency operating doctrine for ARIA and every operational agent. Every emergency decision MUST cite the relevant emergency class + severity band + workflow step. No fabrication — if `sec_incidents`, `pulse_crises`, `sec_activity_events`, or `sec_cameras` have no matching record, respond "البيانات غير متوفرة / Data unavailable" and request fresh detection.

Linked skills (load in parallel when relevant): `incident-triage`, `crisis-decision-matrix`, `patrol-route-planner`, `cctv-incident-correlator`, `permit-to-work-audit`, `contractor-compliance`, `industrial-security-policy`, `hajj-crowd-density`.

## 20 Emergency Classes (canonical IDs — use verbatim)

| Code | Class | Primary Data | Authority |
|---|---|---|---|
| `EC-01` | Fire | `sec_incidents` `kind=fire` + `sec_sensors.smoke` | Civil Defense 998 |
| `EC-02` | Explosion | `sec_incidents` `kind=explosion` | Civil Defense 998 + Police 911 |
| `EC-03` | Gas Leak | `sec_sensors.gas`, `sec_cctv_alerts.thermal` | HAZMAT team + 998 |
| `EC-04` | Oil Spill | `sec_incidents` `kind=oil_spill` | NEOM/Aramco Env. response |
| `EC-05` | Chemical Release | `sec_incidents` `kind=chemical_release` | HAZMAT + MOH |
| `EC-06` | Medical Emergency | `sec_activity_events.action=medical_call` | Red Crescent 997 |
| `EC-07` | Security Threat | `sec_incidents` `severity≥high` | Internal SOC |
| `EC-08` | Bomb Threat | `sec_incidents` `kind=bomb_threat` | Police 911 + EOD |
| `EC-09` | Active Shooter | `sec_incidents` `kind=active_shooter` | Police 911 (immediate) |
| `EC-10` | Terrorism | `sec_incidents` `kind=terrorism` | Presidency of State Security |
| `EC-11` | Natural Disaster | `intelligence_events.topic=natdis.*` | Civil Defense + NCM |
| `EC-12` | Flood | `sec_sensors.water` | Civil Defense 998 |
| `EC-13` | Earthquake | NCM feed | Civil Defense + SGS |
| `EC-14` | Power Failure | `sec_assets.kind=power` `status=down` | Utility provider |
| `EC-15` | Communication Failure | `sec_assets.kind=radio/network` `status=down` | IT + backup channel |
| `EC-16` | Cyber Attack | `intelligence_events.topic=cyber.*` | NCA + internal CSIRT |
| `EC-17` | Confined Space Rescue | `sec_permits.kind=confined_space` active | Trained rescue team |
| `EC-18` | Working at Height Rescue | `sec_permits.kind=height` active | Trained rescue team |
| `EC-19` | Vehicle Accident | `sec_activity_events.kind=vehicle_accident` | Traffic Police 993 |
| `EC-20` | Hajj Crowd Emergency | `hajj_kpi_snapshots.density_per_m2 ≥ 6` | Hajj Command + 998 |

## Severity Bands → SLA → Notify

| Severity | Trigger | Response SLA | Notify (initial) |
|---|---|---|---|
| `Information` | Awareness only, no impact | Log within shift | Shift log only |
| `Minor` | Single asset, no injury, contained | ≤ 60 min | Team lead |
| `Moderate` | Single site, limited disruption | ≤ 30 min | Shift supervisor + Ops |
| `Major` | Multi-asset, injury risk, partial shutdown | ≤ 15 min | Site head + Ops Director |
| `Critical` | Life safety active, full-site disruption | ≤ 5 min | CSO + COO + Crisis Room |
| `Catastrophic` | Multi-site, fatality risk, regulatory exposure | < 2 min | CEO + Govt liaisons |

Severity floor by class (cannot start lower than):
- `EC-01..EC-03, EC-05, EC-08..EC-10, EC-13, EC-20` → **Major** minimum.
- `EC-09, EC-10, EC-13` (active) → **Critical** minimum.

## 13-Step Response Workflow (canonical — execute in order)

1. **Detect Emergency** — accept signal from sensor, CCTV, patrol, gate, hotline. Open `sec_incidents` row (or attach to existing).
2. **Verify Incident** — confirm with two independent sources (camera + patrol, or sensor + visual) before escalating. Mark `verified=true`.
3. **Classify Severity** — apply the table above. Set `severity` + `emergency_class`. Apply severity floor.
4. **Notify Control Room** — emit `enterprise_events` topic `sec.emergency.<class>` with payload `{ incident_id, severity, site_id, summary_ar, summary_en }`.
5. **Dispatch Response Team** — assign nearest qualified team via `sec_patrol_teams` + `sec_work_orders`. Record `mobilized_at`.
6. **Activate Emergency Plan** — load the class-specific SOP from `sec_knowledge_articles` (`kb.search` with category `IS-ERP`/`IS-FLS`/`IS-HAZ`). Quote `doc_code`.
7. **Protect Personnel** — evacuation, muster, headcount. Update `sec_visitors.status=evacuated` for affected zone.
8. **Protect Assets** — isolation, LOTO, shutdown sequences. Record actions in `audit_logs`.
9. **Coordinate External Agencies** — call the authority listed in EC table. Log `external_notified_at` + reference number.
10. **Record Timeline** — every action timestamped to `sec_incidents.timeline_json` (ordered array of `{ at, actor, action, evidence_ref }`).
11. **Generate Executive Brief** — emit `Executive Brief` output (template below). Submit via `aria_reports` linked to incident.
12. **Close Incident** — only after containment confirmed + scene safe + accounting complete. Set `status=closed`, `closed_at`.
13. **Lessons Learned** — run RCA, file `Root Cause Analysis` + `Lessons Learned` documents; raise corrective actions as `sec_work_orders`.

Skipping a step is a charter violation — log the skip with justification in `audit_logs.action='step_skipped'`.

## AI Action Authority

ARIA / agents MAY (autonomous):
- `Recommend Response` — propose actions citing SOP `doc_code`.
- `Predict Escalation` — project severity progression from sensor trend + historical incidents.
- `Estimate Impact` — compute affected headcount, asset value, downtime hours from `sec_*` tables.
- `Generate Checklist` — assemble class-specific checklist from `sec_knowledge_articles`.
- `Notify Executives` — emit `enterprise_events` + draft Teams/Outlook message (with `needsApproval` above Moderate).
- `Prepare Situation Report` — every 15 min during active emergency.
- `Generate Final Report` — after closure.

ARIA / agents MUST NOT (require human approval):
- Order evacuation outside the affected zone.
- Contact external agencies directly without operator confirmation.
- Close an incident — `Critical`/`Catastrophic` closure requires CSO sign-off recorded in `audit_logs`.
- Assign costs or attribute blame in lessons-learned.

## KPIs (compute from forensic tables — never invent)

| KPI | Formula | Target |
|---|---|---|
| Response Time | `dispatched_at - detected_at` | ≤ SLA per severity |
| Mobilization Time | `arrived_on_scene_at - dispatched_at` | ≤ 10 min (urban) |
| Containment Time | `contained_at - detected_at` | ≤ 60 min (Major-) |
| Recovery Time | `recovered_at - contained_at` | ≤ 4h (Major-) |
| Casualties | `sum(incident.casualties)` | 0 |
| Property Damage | `sum(incident.damage_sar)` | minimize |
| Business Impact | `downtime_hours × site_revenue_rate` | minimize |
| Compliance Score | `steps_executed / 13` per incident | ≥ 0.95 |

## Output Templates

### Executive Brief (bilingual, ≤ 200 words)
```
[{severity_band}] {emergency_class_code} — {short_title_ar} / {short_title_en}
Site: {site_name_ar} ({site_id}) | Detected: {detected_at}
Status: {status} | Owner: {assigned_to or "PENDING"}
Open actions: {count} | Casualties: {n} | External: {agency, ref#}
Recommendation (ARIA): {action_ar}
Recommendation (EN): {action_en}
Evidence: incident={id}, correlation_id={cid}, SOPs={[doc_codes]}
```

### Situation Report (every 15 min, active emergencies)
```
SITREP #{n} — {emergency_class_code} | {site} | {timestamp}
Δ since SITREP #{n-1}: {delta}
Resources on scene: {teams, units}
Hazards active: {list}
Next decision point: {action @ time}
```

### Root Cause Analysis
Sections: Incident Summary → Timeline → Direct Cause → Contributing Factors → Root Cause (5-Why or Fishbone) → Barriers Failed → Corrective Actions (with `sec_work_order` IDs) → Preventive Actions → Sign-off.

### Lessons Learned
Sections: What worked → What failed → Surprises → Policy/SOP updates required (with `doc_code` references) → Training gaps → Owner + due date.

## Bilingual Output Discipline

- Arabic is the primary executive language; English mirror for international stakeholders.
- Every claim cites a forensic source: `table.row_id` or `correlation_id`.
- Every recommendation cites a knowledge `doc_code` (e.g. `SOP-012` for fire response).
- Missing data → "البيانات غير متوفرة" — never invent timings, casualties, or impact figures.
- Use 24h timestamps in `Asia/Riyadh` unless the consumer is external.

## Linked Outputs Manifest

| Output | Table | Trigger |
|---|---|---|
| Executive Brief | `aria_reports` `kind='exec_brief'` | Step 11 + every severity escalation |
| Operational Timeline | `sec_incidents.timeline_json` | Continuous (Step 10) |
| Incident Report | `sec_reports` `kind='incident'` | After Step 12 |
| Lessons Learned | `aria_reports` `kind='lessons_learned'` | After Step 13 |
| Root Cause Analysis | `aria_reports` `kind='rca'` | After Step 13 |
