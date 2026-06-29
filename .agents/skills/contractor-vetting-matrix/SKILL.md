---
name: contractor-vetting-matrix
description: Classify sec_contractors into eligibility tiers (Critical/High/Standard) by document completeness and expiry windows.
---

# Contractor Vetting Matrix

## Required Documents (KSA Industrial)
1. Commercial Registration (CR) — valid, matches contractor.company_name
2. Insurance — `insurance_expiry > today + 30d`
3. GOSI certificate — current month
4. Saudization (Nitaqat) — Green band or higher for HSE-critical work
5. HSE Safety cert — `safety_cert_valid = true` AND `safety_cert_expiry > today`
6. Aramco/SABIC vendor approval — for tier-1 hot work

## Tier Eligibility
| Tier | Allowed Work | Required Docs |
|---|---|---|
| Critical | Hot work, height, confined space | All 6 + on-site supervisor cert |
| High | Restricted area, electrical | 5 of 6 (Aramco optional) |
| Standard | General services | CR + Insurance + GOSI |

## Output
```
{
  contractor_id, company_name,
  eligible_tier: "critical" | "high" | "standard" | "blocked",
  missing: [doc_name],
  expires_within_30d: [doc_name],
  blocked: bool,
  blocked_reason?: string
}
```

## Constraints
Reject if any doc forged/mismatched — escalate to compliance officer.
