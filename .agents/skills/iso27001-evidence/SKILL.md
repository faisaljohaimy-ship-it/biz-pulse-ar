---
name: iso27001-evidence
description: Collect ISO/IEC 27001:2022 Annex A control evidence from NEXUS runtime tables automatically. Use for audit prep and continuous compliance monitoring.
---

# ISO 27001 Evidence Collector

## Annex A 2022 — Auto-Collectable Controls
| Control | Title | Evidence Source |
|---|---|---|
| A.5.15 | Access control | `user_roles` snapshot + RLS policy diff |
| A.5.16 | Identity management | `auth.users` count + recent provisioning audit |
| A.5.23 | Cloud services | Lovable Cloud config + integration_microsoft logs |
| A.5.30 | ICT readiness | `pulse_execution` uptime + DR runbook |
| A.6.3 | Awareness | Training completion (out of scope — manual) |
| A.8.8 | Vuln mgmt | `security_scan_results` history |
| A.8.15 | Logging | `audit_logs` retention + integrity hash |
| A.8.16 | Monitoring | `enterprise_events` + observability dashboard screenshots |
| A.8.24 | Cryptography | TLS config + key rotation log (`secrets_rotation_log`) |
| A.8.32 | Change management | Migration history + `workflow_runs` |

## Output
Per control: `{ control_id, last_evidence_at, artifact_uri, gap_note }` saved to `aria_reports` with `kind = 'iso27001_evidence'`.

## Cadence
- Daily delta evidence
- Quarterly full pack
- Pre-audit on demand
