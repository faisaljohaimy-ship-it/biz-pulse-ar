---
name: permit-to-work-audit
description: Audit permit-to-work (PTW) requests in sec_permits for compliance gaps before issuance. Use when reviewing hot work, confined space, working at heights, or electrical permits.
---

# Permit-to-Work Audit

## Mandatory Checks
1. **Contractor compliance** — `sec_contractors.insurance_expiry > permit.start_at` AND `safety_cert_valid = true`.
2. **Conflicting permits** — no overlapping permits on same `building_id` + `permit_type` in (`hot_work`, `confined_space`).
3. **Risk assessment** — `risk_assessment_url` not null for High/Critical risk.
4. **Approver chain** — at least one `approved_by` with role `safety_officer`.
5. **JSA attached** for hot work and confined space.
6. **Gas test** — within 4h of confined space entry; recorded in `permit.metadata.gas_test_at`.

## Output Format
```
PTW-{id} | {type} | Site {site_id}
✅/❌ Contractor | ✅/❌ Conflicts | ✅/❌ RA | ✅/❌ Approver | ✅/❌ JSA | ✅/❌ Gas
Verdict: APPROVE | HOLD | REJECT
Reason (AR): ...
```

## Escalation
- 2+ failed checks → REJECT and notify `permit_officer` agent.
- Hot work with expired contractor cert → automatic 24h block.
