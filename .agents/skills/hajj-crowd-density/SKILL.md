---
name: hajj-crowd-density
description: Compute crowd density and hazard index for hajj_sites and hajj_stations using hajj_kpi_snapshots. Use during Hajj/Umrah operations for capacity decisions.
---

# Hajj Crowd Density

## Density Bands (persons/m²)
| Band | Range | Action |
|---|---|---|
| Green | < 2.0 | Normal flow |
| Yellow | 2.0 – 4.0 | Slow gates, monitor |
| Orange | 4.0 – 6.0 | Diversion routes, pre-stage EMS |
| Red | > 6.0 | Stop entry, evacuate downstream |

## Inputs
- `hajj_kpi_snapshots.current_count`, `capacity`, `area_m2`
- `hajj_stations.flow_in_per_min`, `flow_out_per_min`
- Live `sec_cctv_alerts.crowd_anomaly`

## Hazard Index
`HI = density_band_weight × (1 + queue_delta_5min/capacity) × emergency_proximity_factor`

HI > 0.75 → page `hajj_ops_director`, post in Teams hajj channel.

## Output
`{ site_id, station_id?, density, band, hazard_index, recommended_action_ar }`
