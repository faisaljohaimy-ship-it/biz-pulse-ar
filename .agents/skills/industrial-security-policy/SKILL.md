---
name: industrial-security-policy
description: Authoritative Industrial Security Policy v1.0 for NEXUS AI OS — Western Region. Covers 12 control sections (IS-001…IS-012), KPI definitions, AI decision authority, entity taxonomy, and core workflows. Load whenever an agent reasons about site security, gates, visitors, contractors, patrols, incidents, emergency response, CCTV, key/badge management, asset protection, risk assessment, or executive security reporting.
---

# Industrial Security Policy — v1.0

Canonical operating doctrine for ARIA and all NEXUS security agents. Every decision, briefing, and tool call MUST cite the relevant `IS-###` section when relevant. No fabrication — if a data point isn't in `sec_*` tables, respond "البيانات غير متوفرة / Data unavailable".

## Control Sections

### IS-001 — الأمن العام للموقع (Site General Security)
Protect facilities, people, assets, information from all threats.
**Controls**: access control · identity verification · entry monitoring · visitor logging · sensitive-area hardening.
**Data**: `sec_sites`, `sec_buildings`, `sec_gates`, `sec_sections`.

### IS-002 — إدارة البوابات (Gate Management)
**Controls**: entry/exit logging · vehicle inspection · permit matching · unauthorized-entry denial · record retention.
**Data**: `sec_gates`, `sec_vehicles`, `sec_permits`, `sec_activity_events`.

### IS-003 — الزوار (Visitors)
**Controls**: ID registration · visitor badge issuance · host designation · escort when required · in/out timestamps.
**Data**: `sec_visitors` (status: pending/checked_in/checked_out).

### IS-004 — المقاولون (Contractors)
**Controls**: permit verification · insurance validity · mandatory training · PPE · risk assessment.
**Data**: `sec_contractors`, `sec_permits`. Use `contractor-compliance` skill for vetting tier.

### IS-005 — الدوريات الأمنية (Security Patrols)
**Controls**: scheduled rounds · checkpoints · observation logging · immediate reporting · remediation tracking.
**Data**: `sec_patrols`, `sec_patrol_teams`. KPI target: Patrol Compliance ≥ 95%.

### IS-006 — الحوادث الأمنية (Security Incidents)
**Severity**: Low → Medium → High → Critical.
**Workflow**: Detection → Classification → Notification → Response → Investigation → Closure.
**Data**: `sec_incidents`, `sec_work_orders`. Critical incidents trigger executive escalation.

### IS-007 — الاستجابة للطوارئ (Emergency Response)
**Controls**: alarm · evacuation · muster points · authority notification · documentation.
**Data**: `sec_incidents` (severity=critical), `enterprise_events` (topic=`sec.emergency.*`).

### IS-008 — أنظمة المراقبة (Surveillance Systems)
**Controls**: CCTV cameras · recording · retention · view authorization · readiness checks.
**Data**: `sec_cameras`, `sec_cctv_alerts`. KPI: CCTV Availability ≥ 98%.

### IS-009 — إدارة المفاتيح والبطاقات (Keys & Access Cards)
**Controls**: issuance · return · revocation · loss handling · usage log.
**Data**: `sec_activity_events` (action=`access_*`).

### IS-010 — حماية الأصول (Asset Protection)
**Controls**: inventory · tracking · theft prevention · inspection · investigation.
**Data**: `sec_assets`.

### IS-011 — تقييم المخاطر (Risk Assessment)
**Process**: Identify → Analyze → Evaluate → Mitigate → Monitor.
**Data**: derived from `sec_incidents` + `sec_cctv_alerts` + `sec_sensors`.

### IS-012 — التقارير التنفيذية (Executive Reports)
**Outputs**: Daily Brief · Weekly Report · Monthly Dashboard · Executive Summary · Incident Analytics.
**Data**: `aria_reports`, `executive_briefings`, `hajj_kpi_snapshots`.

## KPIs (canonical names — use verbatim in reports)

| KPI | Source | Target |
|---|---|---|
| Incident Response Time | `sec_incidents.responded_at − created_at` | ≤ 15 min (High/Critical) |
| Patrol Compliance | `sec_patrols` completed/scheduled | ≥ 95% |
| Visitor Compliance | `sec_visitors` with valid host+badge | ≥ 98% |
| Contractor Compliance | `sec_contractors` tier_eligible | ≥ 90% |
| CCTV Availability | `sec_cameras.status='online'` | ≥ 98% |
| Access Violations | `sec_activity_events` action=`access_denied` | ≤ 5/day |
| Emergency Readiness | drills + muster verification | ≥ 90% |
| Open Incidents | `sec_incidents.status != 'closed'` | trend ↓ |
| Critical Incidents | `severity='critical'` 24h | 0 target |
| Security Score | composite weighted of above | ≥ 85/100 |

## AI Decision Authority (ARIA)
ARIA MAY: recommend escalation · detect abnormal patterns · predict risk · prioritize incidents · generate executive briefings · suggest corrective actions.
ARIA MUST NOT: close incidents · approve permits · grant access · dispatch responders without human approval (`needsApproval`).

## Entity Taxonomy
Site · Facility · Gate · Visitor · Contractor · Employee · Patrol · Camera · Incident · Work Order · Permit · Asset · Vehicle · Access Card → all live under `sec_*` schema.

## Core Workflows
1. **Visitor Check-in** → `sec_visitors` insert + badge issue + host notify
2. **Visitor Check-out** → status=checked_out + badge return
3. **Contractor Approval** → vetting matrix → `sec_contractors.status=active`
4. **Permit Approval** → `sec_permits.status` transitions (draft→pending→approved)
5. **Incident Response** → IS-006 workflow + work order generation
6. **Patrol Monitoring** → `sec_patrols` checkpoint log + deviation alert
7. **Asset Inspection** → `sec_assets.last_inspected_at` update
8. **Emergency Escalation** → IS-007 + `enterprise_events` critical topic
9. **Executive Briefing** → `executive_briefer` agent → `aria_reports`
10. **Daily Security Report** → scheduled via pg_cron → Outlook delivery

## Output Discipline
- Bilingual AR (primary) + EN (secondary).
- Every claim cites table + filter (e.g. `sec_incidents WHERE severity='critical' AND created_at > now()-interval '24h'`).
- Reference `IS-###` for every recommendation.
- Missing data → "البيانات غير متوفرة" — never invent.
