# NEXUS AI OS — Stage 4 Execution Plan
**Goal:** Transform NEXUS from a technical project into a production-grade, procurement-ready Enterprise AI OS. No UI redesign, no demos, no mock data.

## Scope Reality Check
This charter is ~6 months of work for a full team. To deliver real value (not surface scaffolding), I will execute in **6 sequential waves**, each ending in a testable, production-grade slice. After each wave you confirm before I proceed. This prevents the anti-pattern of "60 half-built features" and matches the charter's own rule: *no unfinished implementations*.

---

## Wave 1 — Multi-Tenancy Foundation (this turn)
The single highest-leverage change. Every later wave depends on it.

1. **Schema migration:**
   - `organizations` (id, name, slug, plan, status, settings jsonb, created_at)
   - `org_members` (org_id, user_id, role, invited_at, joined_at) — unique(org_id, user_id)
   - `org_invitations` (token, email, role, expires_at)
   - Add `org_id uuid` to all 17 `sec_*` tables + `aria_documents`, `aria_memory`, `aria_reports`, `agent_runs`, `workflow_runs`, `tool_executions`, `audit_logs`. Backfill with a default "Western Region Industrial Security" org.
   - Indexes on every `org_id`.
2. **RLS rewrite:** New SECURITY DEFINER helpers `current_org_id()` and `is_org_member(_org, _role)`. Rewrite every policy to scope by `org_id` AND existing user/role rules. Keep `service_role` bypass.
3. **GRANTs** preserved per Charter.
4. **Server context:** Extend `requireSupabaseAuth` middleware to resolve & inject `orgId` from JWT claim (`app_metadata.current_org`) or fall back to first membership. Add `requireOrgRole(role)` middleware.
5. **App shell:** Org switcher in header; persists choice to `auth.users.app_metadata` via admin RPC.
6. **Tests:** Vitest suite proving cross-org isolation on `sec_incidents`, `aria_documents`, `agent_runs`.

## Wave 2 — Enterprise Security Hardening
- MFA enforcement flag per org; AAL2 gate middleware for admin routes.
- Audit log expansion: every privileged server fn writes to `audit_logs` (actor, org, action, resource, before, after, ip, ua). Append-only RLS.
- Session management UI (list, revoke).
- API keys table (hashed, scoped, rotatable) + `requireApiKey` middleware for `/api/public/v1/*`.
- Webhook signing helper (HMAC-SHA256, timing-safe) — already partially present, formalize.
- Secrets inventory doc auto-generated from `fetch_secrets`.

## Wave 3 — SSO (Azure AD / Entra ID) + RBAC/ABAC
- `supabase--configure_saml_sso` for Entra ID with domain-restricted auto-provisioning into orgs.
- Formal `permissions` + `role_permissions` tables (ABAC attributes: resource, action, condition jsonb).
- `can(user, action, resource, ctx)` SECURITY DEFINER function used across server fns.
- Migration of existing `has_role` callsites.

## Wave 4 — Observability, Reliability & DR
- Structured logging helper (`src/lib/obs/logger.server.ts`) emitting JSON to console (Cloudflare Workers tail-compatible) with trace_id, org_id, user_id, latency.
- `/api/public/health` (DB ping, AI Gateway ping, version) — already partial, harden.
- `/api/public/metrics` (Prometheus exposition) — counts, p95 latencies pulled from `audit_logs`.
- Daily DB export server fn → Cloudflare R2 (requires `R2_*` secrets — will request).
- Documented DR runbook (`docs/dr-runbook.md`) with RTO 4h / RPO 1h.

## Wave 5 — Commercial Layer
- `subscription_plans`, `org_subscriptions`, `feature_flags`, `usage_meters` (events, ai_tokens, storage_mb).
- Metering middleware that records usage on every AI Gateway + storage call.
- Per-plan feature gating via `hasFeature(org, key)` helper.
- Billing-ready: Stripe wiring deferred until you confirm; tables align with Stripe customer/subscription IDs.

## Wave 6 — Compliance Evidence & Production Connectors
- Evidence collectors mapped to NCA ECC, PDPL, ISO 27001, SOC 2 (auto-generated JSON pack from `audit_logs` + config snapshot).
- Privacy: DSAR server fns (export, erase) per org member.
- Production connector hardening: M365 (Outlook/Teams/SharePoint) already linked — wrap in resilient gateway client (retry, circuit breaker, rate-limit aware), real Outlook send, real Teams channel post, real SharePoint upload. SAP/Oracle: thin OData/REST adapter scaffolding (documented as connector-ready, disabled until customer credentials supplied).

---

## Quality Gates per Wave
- `tsgo` clean
- `vitest run` passes (new tests authored each wave)
- Supabase linter clean
- Security scanner clean
- Zero new console errors in Playwright smoke

## Technical Notes (engineering)
- All new server logic via `createServerFn` + `requireSupabaseAuth` + new `requireOrgContext`.
- `service_role` only inside `.server.ts` helpers, loaded via dynamic `await import` in `.functions.ts` handlers.
- No edge functions; everything in TanStack server functions per project charter.
- RLS rewrite is the only irreversible step — done in one transactional migration with backfill verified before policy swap.

---

## What I Need From You
1. **Confirm Wave 1 starts now** (multi-tenancy is foundational and will touch every existing table — safe but unavoidable).
2. Default org name for backfill — proposed: **"Western Region Industrial Security"** (matches current memory).
3. Permission to request `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` secrets in Wave 4 (off-site backups).
4. Stripe vs Paddle for Wave 5 commercial layer, or defer billing wiring entirely until a paying customer is in sight?

On your **"GO Wave 1"** I execute the full multi-tenancy migration + middleware + tests in this turn.