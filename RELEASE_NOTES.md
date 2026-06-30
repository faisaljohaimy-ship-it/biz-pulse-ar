# NEXIOS AI OS — v1.0.0 Release Notes

**Release Date:** 2026-06-30
**Channel:** General Availability
**Codename:** Midnight Cyan
**Runtime:** Cloudflare Workers (workerd) + Supabase (Postgres 15, pgvector, pg_cron)

## Headline
NEXIOS AI OS reaches its first General Availability release: a bilingual (AR/EN, RTL-safe) Executive AI Operating System for Industrial Security, with ARIA as the executive digital human, a 14-agent orchestra, real RAG knowledge over `sec_*` operational tables, multi-tenant RLS isolation, and a forensic audit chain (`audit_logs` ↔ `enterprise_events` ↔ `tool_executions` ↔ `workflow_step_runs`) tied by `correlation_id`.

## What's New Since 0.9.x
- **Agent Runtime v2** — every agent invocation routes through `/api/public/hooks/run-agent`, producing matched rows in `workflow_runs`, `workflow_step_runs`, `tool_executions`, `audit_logs`, `enterprise_events`, `aria_reports`.
- **Tool Registry hardening** — `sql.read` whitelists `sec_*` tables via `z.enum` + per-table column allowlist; no fabrication possible.
- **Industrial Security Knowledge Repository** — 40 bilingual SOP articles, HNSW vector index, `kb.search` tool.
- **Executive Theater & Situation Room** — `/theater`, `/bridge`, `/situation-room` with R3F ARIA scene, gaze tracking, inward-glide agent ring.
- **Living Executive Narrator** — bilingual narration of `enterprise_events` with cinematic Presentation Mode.
- **Multi-Tenant RLS** — `organizations` + `org_members` enforce tenant isolation across 50+ tables via RESTRICTIVE policies.
- **Demo Request flow** — `leads` table + transactional email + admin pipeline (replaces synthetic demo bypass).
- **Production health probe** — `/api/public/health` now returns accurate per-subsystem status (DB + AI Gateway reachability).

## Breaking Changes
None. This is the first GA; prior 0.9.x channels are superseded.

## Security
- 0 findings across all 4 scanners (connector, supabase, supabase_lov, supply_chain).
- `user_roles` DML revoked from `anon`/`authenticated`; only `service_role` may mutate.
- Demo auto-login bypass and synthetic user URL params removed.
- All sensitive `SECURITY DEFINER` functions are gated; client uses server-side `getCurrentUserIsAdmin` rather than direct RPC.
- PII tables (`sec_visitors`, `sec_vehicles`, `sec_contractors`) restricted to creator + admin reads.

## Performance
- Heavy modules (R3F `AriaScene`, HeyGen avatar provider, Three.js scenes, PDF, Excel) loaded via `lazy()` + dynamic `import()`.
- Mobile: iOS safe-area, `min-h-dvh`, swipeable agent carousel.

## Known External Dependencies
See `KNOWN_EXTERNAL_DEPENDENCIES.md`. Not engineering defects.

## Upgrade Path
None — first GA. New deployments only.

## Verified Evidence (build of 2026-06-30)
- TypeScript: `tsgo --noEmit` → 0 errors
- Tests: `vitest run` → 36/36 passing (4 suites, then expanded — see TESTING.md)
- Security: 0 findings, all scanners green
- `/api/public/health` → `status: ok`; DB + AI gateway reachable
- `/api/public/version` → `1.0.0 / general-availability`
