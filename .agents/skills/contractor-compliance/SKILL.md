---
name: contractor-compliance
description: Verify sec_contractors documentation (insurance, safety certs, GOSI, Saudization) before permit issuance or site access. Use for onboarding and recurring audits.
---

# Contractor Compliance

## Required Documents (KSA Industrial)
- Commercial Registration (CR) — valid, matches contractor name
- Insurance — `insurance_expiry > today + 30d`
- GOSI certificate — current month
- Saudization (Nitaqat) — minimum Green band for HSE-critical work
- HSE safety cert — `safety_cert_valid = true` and `safety_cert_expiry > today`
- ARAMCO/SABIC vendor approval (where applicable)

## Risk Tiers
| Tier | Requirement |
|---|---|
| Critical (hot work, height) | All 6 docs + on-site supervisor cert |
| High | 5 of 6 (Aramco optional) |
| Standard | CR + Insurance + GOSI |

## Output
`{ contractor_id, tier_eligible, missing: [], expires_within_30d: [], blocked: bool }`
