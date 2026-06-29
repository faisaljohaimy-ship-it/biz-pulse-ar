---
name: nca-controls-mapper
description: Map NEXUS features to Saudi NCA Essential Cybersecurity Controls (ECC-1:2018) and Critical Systems Controls. Use for compliance evidence and gap analysis.
---

# NCA Controls Mapper

## Primary Frameworks
- **ECC-1:2018** — Essential Cybersecurity Controls (mandatory for govt + critical infra)
- **CSCC-1:2019** — Critical Systems Cybersecurity Controls
- **CCC-1:2020** — Cloud Cybersecurity Controls

## High-Priority Mappings (NEXUS surface area)
| Control | Domain | NEXUS Implementation |
|---|---|---|
| 1-1 | Cybersecurity Strategy | `governance_policies` table |
| 1-3 | Risk Management | `intelligence_events` + risk scoring |
| 2-2 | Identity & Access | Supabase Auth + `user_roles` + RLS |
| 2-3 | IAM Privileged Access | `has_role('admin')` + audit_logs |
| 2-7 | Data Protection | Encryption-at-rest + PDPL classifier |
| 2-8 | Cryptography | TLS 1.2+, Supabase managed keys |
| 2-13 | Logging & Monitoring | `audit_logs` + `enterprise_events` + observability dashboard |
| 4-1 | Third Party | `sec_contractors` + compliance skill |
| 4-2 | Cloud | Lovable Cloud (Cloudflare + Supabase) CCC mapping |

## Output
`{ control_id, status: implemented|partial|gap, evidence_refs: [], remediation }`
