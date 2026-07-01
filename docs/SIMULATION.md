# NEXIOS AI OS — Simulation Engine (Milestone 1)

The **Simulation Engine** produces a realistic, fully-related demo dataset
across 20 operational domains. In Phase 2, a single flag will swap the
seeded rows for live production adapters — consumer code does not change.

## Architecture

```
src/lib/simulation/
├── sim.config.ts          # SIM_MODE, volumes, default seed
├── sim.rng.ts             # deterministic mulberry32 RNG
├── sim.catalog.ts         # bilingual pools (names, sites, dept codes)
├── sim.seeder.server.ts   # generates + inserts (server-only, uses admin client)
└── sim.functions.ts       # server fns: runSeed, validate, status
```

Reader contract lives in `src/lib/sec/data-source.ts` — all consumers should
import from that module.

## Tables

Reused: `sec_sites`, `sec_buildings`, `sec_assets`, `sec_vehicles`,
`sec_contractors`, `sec_incidents`, `sec_permits`, `sec_work_orders`,
`sec_patrol_teams`, `sec_visitors`, `pulse_kpis`, `tasks`.

New (this milestone):

| Table | Purpose |
|---|---|
| `sim_departments` | Org chart, budgets, headcount targets, dept heads |
| `sim_employees` | Bilingual employee master with dept + site + manager FKs |
| `sim_buses` | Fleet & routes with driver FK |
| `sim_near_misses` | Reported near-miss events |
| `sim_inspections` | Scheduled & completed inspections with scores |
| `sim_risks` | Likelihood × Impact scoring, linked to inspections |
| `sim_corrective_actions` | Actions from inspection/incident/risk/near_miss |
| `sim_meetings` | Bilingual meetings with attendee lists |
| `sim_notifications` | Per-employee alerts |
| `sim_daily_ops` | Day × site × shift operational rollups + KPI json |
| `sim_history` | Generic audit trail for any entity |

Every row carries `org_id`, `metadata.sim_seed`, `status`, `priority` (where
applicable), `created_at`, `updated_at`. RLS restricts reads to org members
and writes to org operators/managers via `is_org_member(_org, _min_role)`.

## How to seed

Server function (admin only):

```ts
import { runSimulationSeedFn } from "@/lib/simulation/sim.functions";
await runSimulationSeedFn({ data: { seed: 20260101 } });
```

Behaviour:

- **Idempotent** — each run deletes prior `sim_*` rows for the org, then
  inserts a fresh set. `sec_incidents` / `sec_permits` sim rows are matched
  by `metadata.sim_seed`.
- **Deterministic** — same `seed` → identical dataset.
- **Ordered** — sites → departments → employees → dept heads → everything
  else in FK-safe order.

## Validate

```ts
import { validateSimulationFn } from "@/lib/simulation/sim.functions";
const result = await validateSimulationFn();
// { ok: true, checks: [{ name, ok, detail? }, ...] }
```

## Volumes (per org)

See `sim.config.ts`. Defaults: 12 depts · 120 employees · 18 buses · 80
inspections · 60 risks · 70 near-misses · 90 incidents · 100 permits · 140
corrective actions · 60 meetings · 400 notifications · 30 days × 6 sites × 2
shifts = 360 daily-ops rows · ~250 history rows.

## Phase 2 — swap to production

1. Set `SIM_MODE = "off"` in `sim.config.ts`.
2. In `src/lib/sec/data-source.ts`, point readers at live adapters
   (Microsoft Graph, SAP, Oracle) rather than `sim_*`/`sec_*` tables.
3. No consumer code changes.

## ARIA integration

The seeded rows populate `sec_incidents`, `sec_permits`, and the new
`sim_*` tables that ARIA already queries via its data tools. See
`src/lib/aria-tools.server.ts`.
