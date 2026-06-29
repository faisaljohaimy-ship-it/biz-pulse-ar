---
name: cost-anomaly-scan
description: Compare ai_usage spend against cost_budgets; flag budgets >80% consumed or projected to overrun.
---

# Cost Anomaly Scan

## Inputs
- `cost_budgets(id, name, period, limit_amount, currency, owner)`
- `ai_usage(model, input_tokens, output_tokens, cost_usd, created_at, agent_id)`

## Calculations
1. **Consumption %** = SUM(ai_usage.cost_usd within period) / budget.limit_amount
2. **Burn rate** = spend_so_far / (days_elapsed / period_days)
3. **Projected overrun** = burn_rate * period_days > limit_amount

## Alert Tiers
| Consumption | Severity | Action |
|---|---|---|
| ≥ 100% | critical | Block new runs, notify owner |
| 80-99% | high | Notify owner, recommend throttling |
| 50-79% | medium | Watch list |
| < 50% | info | OK |

## Output
`{ budget_id, name, period, spent, limit, pct, projected_overrun, severity }`

## Constraints
Currency from DB (no conversion); show exact USD values.
