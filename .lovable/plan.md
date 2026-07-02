## Milestone 1 — Enterprise Simulation Foundation

Goal: a self-contained **Simulation Engine** that generates realistic, fully-related enterprise data across 20 domains. UI stays unchanged. In Phase 2, swapping `SIM_MODE=off` (production) will bypass the seeder without touching consuming code.

### 1. Schema — new tables (migration)

Existing tables reused as-is: `sec_sites`, `sec_buildings`, `sec_assets`, `sec_vehicles`, `sec_contractors`, `sec_incidents`, `sec_permits`, `sec_work_orders` (as Corrective Actions), `sec_patrol_teams` (as Emergency Teams), `sec_visitors`, `tasks`, `pulse_kpis`.

New tables (all org-scoped, RLS by org membership, GRANTs to authenticated + service_role):

- `sim_departments` — code, name_ar, name_en, parent_id, head_employee_id, budget, headcount_target
- `sim_employees` — employee_no, full_name_ar, full_name_en, dept_id, role, grade, site_id, manager_id, hire_date, status, contact
- `sim_buses` — plate, capacity, route_code, driver_employee_id, site_id, status, next_service_at
- `sim_near_misses` — ref, title, site_id, reported_by_employee, severity_potential, root_cause, status, reported_at
- `sim_risks` — ref, title, category, likelihood(1-5), impact(1-5), score(gen), owner_employee, inspection_id, mitigation, status
- `sim_inspections` — ref, kind, site_id, building_id, inspector_employee, scheduled_at, completed_at, score, findings_count, status
- `sim_corrective_actions` — ref, source_type(inspection|incident|risk|near_miss), source_id, action, owner_employee, due_at, status, priority
- `sim_meetings` — ref, title, dept_id, organizer_employee, scheduled_at, duration_min, location, kind, minutes_url, status
- `sim_notifications` — user_id/target_employee, topic, severity, title, body, link, read_at
- `sim_daily_ops` — day, site_id, shift, patrols_planned, patrols_done, incidents_open, permits_active, headcount, kpi_json
- `sim_history` — generic audit rows (entity_type, entity_id, action, changes_json, actor_employee, at) — the "History" requirement per record

Every table has: `id uuid pk`, `org_id`, `owner_user_id` nullable, `priority` (where relevant), `status`, `created_at`, `updated_at`, `metadata jsonb default '{}'`, FKs enforcing relationships.

Add `update_updated_at_column` triggers.

### 2. Simulation Engine module

New folder `src/lib/simulation/`:

- `sim.types.ts` — TypeScript models per table
- `sim.rng.ts` — seedable deterministic RNG (mulberry32) so the same seed → same dataset
- `sim.catalog.ts` — realistic pools (Saudi names, Jeddah/Makkah/Yanbu sites, dept codes SEC/HSE/OPS/…)
- `sim.generators.ts` — pure functions: `genDepartments()`, `genEmployees(depts, sites)`, `genBuses(sites, employees)`, `genIncidents(sites, employees)`, `genNearMisses`, `genInspections`, `genRisks(inspections)`, `genCorrectiveActions(sources)`, `genPermits`, `genWorkOrders`, `genMeetings(depts, employees)`, `genTasks(incidents, employees)`, `genNotifications(employees)`, `genDailyOps(sites, 30d)`, `genKpisFromOps(dailyOps)`
- `sim.graph.ts` — enforces referential integrity: builds objects in dependency order, threads FKs, appends `sim_history` rows
- `sim.seeder.server.ts` — server-only: idempotent upsert into all tables using `supabaseAdmin`, chunked inserts, wrapped in a single "seed run" id stored in metadata for rollback
- `sim.functions.ts` — `runSimulationSeed({ scope, seed })`, `resetSimulation()`, `getSimulationStatus()` server fns, guarded by `requirePlatformAdmin`
- `sim.config.ts` — `SIM_MODE = "on" | "off"`, volumes per entity, date window (last 90d + next 14d)

### 3. Data source contract (Phase-2-ready)

New `src/lib/sec/data-source.ts` exports typed readers (`listIncidents`, `listRisks`, …) that today just call the existing `sec_*` / `sim_*` server fns. Dashboards and ARIA tools already import from `sec.functions.ts` — we re-export from the data-source module and switch callers over. Phase 2 flips a single env flag to swap seeders for live adapters; no consumer change.

### 4. ARIA integration

Extend `src/lib/aria-tools.server.ts` with read tools for the new tables (`list_employees_by_dept`, `list_open_risks`, `today_operations_summary`, `notifications_for_me`). Add a short section to `aria-context.server.ts` describing the new tables so GPT-5 knows to query them.

### 5. Dashboards

No new pages, no redesign. Verify existing consumers (executive KPIs, ops page, mission-control, sec pages) now display seeded rows. Where a component was empty because a table was empty, it will simply fill in.

### 6. Validation

- `src/lib/simulation/sim.validate.ts` — post-seed checks: no orphan FKs, every incident has ≥1 task, every inspection has ≥0 risks, KPI totals match aggregated ops rows
- `src/lib/simulation/sim.test.ts` — vitest: generators are deterministic per seed, relationships close, counts within tolerances
- Manual: after migration, admin hits `runSimulationSeed` from an existing admin surface (temporary button in `/os` admin section — no new route)

### 7. Documentation

`docs/SIMULATION.md` — architecture, entity map, volumes, how to reseed, how to swap to production adapters in Phase 2.

### 8. Volumes (seeded per org)

Departments 12 · Employees 420 · Contractors 35 · Sites 6 · Buildings 28 · Vehicles 60 · Buses 22 · Assets 180 · Incidents 240 (90d) · Near-misses 180 · Risks 140 · Inspections 200 · Permits 320 · Corrective actions 380 · Emergency teams 8 · Meetings 160 · Tasks 900 · Notifications 1 200 · Daily ops rows 6 sites × 90d = 540 · KPI snapshots 90.

### Technical notes

- All writes via `supabaseAdmin` inside handler bodies (never module-scope in `.functions.ts`).
- Seeder is idempotent: keyed on `metadata->>'sim_seed'` per row; re-running with same seed no-ops, different seed regenerates cleanly.
- History rows: for every insert the seeder pushes a `sim_history` "created" row plus 1–3 backdated "status_changed" rows to feel real.
- Bilingual: every human-facing string in AR + EN (matches existing convention).
- No random values at read-time — the RNG lives only in the seeder; consumers always read stored rows.

### Deliverables checklist

- [ ] Migration with 11 new tables + triggers + RLS + GRANTs
- [ ] `src/lib/simulation/*` engine
- [ ] `src/lib/sec/data-source.ts` unified reader
- [ ] ARIA tool + context updates
- [ ] Admin trigger button (inside existing admin panel — no new route)
- [ ] `docs/SIMULATION.md`
- [ ] Vitest + validation script green
- [ ] Existing dashboards render seeded data without code edits
