---
name: patrol-route-planner
description: Build optimized patrol routes from sec_patrol_teams across sec_buildings/sec_gates weighted by recent sec_incidents. Use for shift planning, surge coverage, and post-incident re-routing.
---

# Patrol Route Planner

## Algorithm
1. Pull last 14 days of `sec_incidents` grouped by `building_id` → compute risk score = `severity_weight × recency_decay`.
2. For each active `sec_patrol_team`, build route covering top-N buildings (N = team capacity).
3. Anchor route start/end at team's `home_gate_id`.
4. Insert checkpoint dwell time: critical = 8min, high = 5min, normal = 3min.
5. Avoid overlap: same building not patrolled by 2 teams within 30 min.

## Surge Conditions
- Active P0/P1 incident → divert nearest free team within 15 min radius.
- Hajj season → enforce minimum coverage on `hajj_stations` regardless of incident history.

## Output
JSON route per team: `{ team_id, stops: [{ building_id, eta, dwell_min, reason }], total_min }`
