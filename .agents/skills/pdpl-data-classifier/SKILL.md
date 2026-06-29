---
name: pdpl-data-classifier
description: Classify data fields per Saudi PDPL (Personal Data Protection Law) categories. Use when designing tables, exporting data, or auditing privacy posture.
---

# PDPL Data Classifier (KSA)

## Categories
| Class | Examples | Handling |
|---|---|---|
| **Sensitive** | National ID, biometrics, health, religious belief | Encrypt at rest, access logged, no export without DSR approval |
| **Personal** | Name, email, phone, photo, vehicle plate | RLS by `auth.uid()` or org membership |
| **Operational** | Site name, KPI counts, building codes | Standard tenant isolation |
| **Public** | Marketing copy, published reports | No restriction |

## NEXUS Field Mapping
- `sec_visitors.id_number` → Sensitive
- `sec_visitors.name`, `phone` → Personal
- `sec_contractors.cr_number` → Personal (business)
- `sec_incidents.description_ar` → Operational (may contain Personal → scrub)
- `profiles.full_name`, `email` → Personal

## Required Controls
- Sensitive fields: column-level encryption or pgsodium where available.
- Cross-border transfer (sensitive data leaving KSA) → requires explicit consent + DPA log.
- Retention: Sensitive ≤ 24 months default, Operational ≤ 7 years.

## Output
`{ table, column, class, controls_present: [], gaps: [] }`
