---
name: data-quality-audit
description: Detect data quality issues in sec_* tables — nulls in required fields, stale rows, broken FK orphans.
---

# Data Quality Audit

## Checks
### A. Null Required Fields
Tables and required columns:
- `sec_incidents`: severity, status, site_id, reported_by
- `sec_work_orders`: priority, status, source_incident_id (if linked)
- `sec_permits`: status, requested_by, expires_at
- `sec_visitors`: host_employee, status
- `sec_assets`: criticality, site_id

### B. Staleness
Rows with `updated_at < now() - interval '30 days'` AND status='open' → flag.

### C. Orphans (FK probes)
- `sec_work_orders.source_incident_id NOT IN (SELECT id FROM sec_incidents)`
- `sec_sensors.asset_id NOT IN (SELECT id FROM sec_assets)`
- `sec_cctv_alerts.camera_id NOT IN (SELECT id FROM sec_cameras)`

## Output Table
| table | check | count | sample_ids |
|---|---|---|---|

## Constraints
- Counts from real SQL; never estimate.
- If RLS blocks a table, report it as "access denied" not "0 issues".
