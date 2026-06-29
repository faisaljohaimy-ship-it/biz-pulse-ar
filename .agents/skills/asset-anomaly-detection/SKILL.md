---
name: asset-anomaly-detection
description: Detect anomalous sec_sensors readings for sec_assets using z-score and out-of-range checks; recommend work order creation.
---

# Asset Anomaly Detection

## Inputs
- `sec_sensors(id, asset_id, metric, value, recorded_at, min_threshold, max_threshold)`
- `sec_assets(id, site_id, asset_type, criticality)`

## Detection Methods
1. **Hard limits**: `value < min_threshold OR value > max_threshold`
2. **Z-score**: over rolling 24h window, |z| > 3 → anomaly
3. **Stale sensor**: no reading > 60 min for `criticality in (critical,high)`

## Action Matrix
| Criticality | Anomaly | Action |
|---|---|---|
| critical | hard-limit | Open work_order priority=critical immediately |
| high | hard-limit OR z>3 | Open work_order priority=high |
| medium | z>3 | Flag for review |
| low | any | Log only |

## Output
`{ asset_id, sensor_id, metric, value, anomaly_type, recommended_priority, recorded_at }`

## Constraints
Use real recorded_at and sensor_id; never synthesize readings.
