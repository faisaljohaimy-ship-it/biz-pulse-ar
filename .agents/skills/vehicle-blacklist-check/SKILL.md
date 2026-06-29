---
name: vehicle-blacklist-check
description: Validate inbound vehicles in sec_vehicles against active permits, blacklist, driver records before granting site access.
---

# Vehicle Access Check

## Inputs
- `sec_vehicles(plate_number, driver_name, status, blacklisted, permit_id, expected_at)`
- `sec_permits(id, status, expires_at, contractor_id)`
- `sec_contractors(id, status, safety_cert_valid)`

## Decision Pipeline
1. **Blacklist gate**: if `blacklisted = true` → DENY (reason: blacklist)
2. **Permit gate**: permit_id must exist, `status = approved`, `expires_at > now()`
3. **Contractor gate**: contractor.status = active AND safety_cert_valid
4. **Time gate**: `expected_at` within ±60 min of arrival

## Output
```
{
  plate_number, decision: "allow" | "deny" | "hold",
  reasons: [string],
  next_action: "open_gate" | "escort_required" | "reject"
}
```

## Constraints
- No plate lookup outside `sec_vehicles`. Missing → "البيانات غير متوفرة".
