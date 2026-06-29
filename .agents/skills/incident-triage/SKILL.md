---
name: incident-triage
description: Triage and prioritize industrial security incidents from sec_incidents using a severity matrix. Use when classifying new incidents, escalating, or generating shift handover lists.
---

# Incident Triage

## Severity Matrix (NEXUS Industrial Security)

| Impact \ Likelihood | Low | Medium | High |
|---|---|---|---|
| Life Safety | P2 | P1 | P0 |
| Asset Damage | P3 | P2 | P1 |
| Operational | P4 | P3 | P2 |
| Reputational | P4 | P3 | P2 |

## Inputs (from `sec_incidents`)
- `severity`, `category`, `site_id`, `building_id`, `status`, `reported_at`, `description_ar`

## Rules
1. P0/P1 → escalate to `incident_commander` agent within 5 min, notify on-call via `m365.teams.post_message`.
2. P2 → assign to nearest patrol team via `oms.assign_patrol`.
3. P3/P4 → batch into shift report.
4. If incident references `hajj_site_id` during Hajj season → auto-flag for `hajj_ops_director`.
5. Output bilingual (AR primary, EN secondary).

## Anti-Patterns
- Never lower severity without documented justification in `sec_incidents.notes`.
- Never close P0/P1 without `aria_reports` evidence chain.
