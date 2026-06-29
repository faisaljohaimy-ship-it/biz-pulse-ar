---
name: visitor-screening
description: Screen sec_visitors entries against denial lists, host validation, and document expiry. Use at gate check-in or pre-approval.
---

# Visitor Screening

## Checks
1. **ID validity** — `id_number` matches `id_type` format; `id_expiry > visit_end_at`.
2. **Host validation** — `host_user_id` exists and belongs to same `org_id`.
3. **Denial list** — cross-reference name + national_id against `sec_visitors` history where `status = 'denied'` or `flagged = true`.
4. **Vehicle** — if `vehicle_plate` provided, check against `sec_vehicles.blacklisted`.
5. **Purpose plausibility** — `purpose` not empty, matches host's department.

## Decision
- All pass → APPROVE, log `checked_in_at`.
- 1 soft fail (e.g., expired ID) → HOLD, notify host.
- Any hard fail (denial list, blacklisted vehicle) → DENY, alert `visitor_gatekeeper` + log audit.

## Output (bilingual)
`{ visitor_id, decision, fails: [], requires_escort: bool }`
