# NEXIOS AI OS — Security

## Posture (GA build 2026-06-30)
- 0 findings across 4 scanners: `connector_security_scan`, `supabase`, `supabase_lov`, `supply_chain`.
- All `public` schema tables: RLS enabled + explicit GRANTs.
- All `SECURITY DEFINER` functions: `EXECUTE` revoked from `anon`/`authenticated`; callable only via server-side wrappers (`src/lib/authz.server.ts`).

## Authentication
- Supabase Auth (email/password + Google OAuth via Lovable broker).
- Protected routes live under `src/routes/_authenticated/`; the integration-managed `_authenticated/route.tsx` (`ssr: false`) calls `supabase.auth.getUser()` and redirects to `/auth` otherwise.
- Bearer token attached automatically to every `createServerFn` call via registered `functionMiddleware` in `src/start.ts`.
- Demo auto-login removed. URL `?demo=1` synthetic sessions removed.

## Authorization
- Roles in `user_roles` (enum `app_role`: `admin`, `moderator`, `user`).
- `has_role(uuid, app_role)` SECURITY DEFINER; called only from server.
- `user_roles` DML revoked from `anon`/`authenticated`; explicit `false` policies for INSERT/UPDATE/DELETE.
- Multi-tenant: `org_members` + `current_org_id()` enforced via RESTRICTIVE RLS policies across 50+ tables.
- PII tables (`sec_visitors`, `sec_vehicles`, `sec_contractors`): readable only by creator + org admin.

## Secrets
- Server-only env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `MICROSOFT_*`, etc.
- `supabaseAdmin` imported only inside handler bodies via `await import('@/integrations/supabase/client.server')` — never at module scope of client-reachable files.
- No `VITE_*` exposure of service-role values.

## Input / Output
- Every `createServerFn` and every `/api/public/*` handler uses Zod `.inputValidator()`.
- Tool registry `sql.read`: `z.enum` table allowlist + `TABLE_COLUMNS` whitelist per table.
- Webhook endpoints verify HMAC-SHA256 with timing-safe compare before any write.
- No `dangerouslySetInnerHTML` with user content anywhere in the codebase.

## Rate Limiting & Abuse
- `rate_limit_buckets` table backs `/api/chat` guard (`src/routes/api/-chat-guard.ts`).
- Public hook endpoints (`run-agent`, `executive-reports-run`, `microsoft-sync`, `aria-docs-ingest`, `runtime-bootstrap`) are credentialed via hook secret or signed payload.

## Audit & Forensics
- `audit_logs` (actor_id enforced = `auth.uid()`), `enterprise_events`, `tool_executions`, `workflow_step_runs` all carry `correlation_id`.
- Agent runs are 100% reconstructable from these tables — verified in prior live runs.

## Reporting
- Vulnerabilities: see `public/.well-known/security.txt`.
- Responsible disclosure: see `src/routes/responsible-ai.tsx`.

## Threats Explicitly Mitigated
| Threat | Control |
|---|---|
| Privilege escalation via `user_roles` write | DML revoked + policies = `false` |
| Cross-tenant read | RESTRICTIVE RLS on every `sec_*` and tenant table |
| Service-role leak | Handler-local imports, no module-scope, no `VITE_*` |
| Webhook spoofing | HMAC + timing-safe compare on public hooks |
| Agent fabrication | `z.enum` tool input + column whitelist + charter v10.0 prompt |
| SSRF on image proxy | N/A — no user-controlled image proxy implemented |
| XSS | React escapes by default; no `dangerouslySetInnerHTML` with user data |
| CSRF | Same-origin server functions; bearer-token auth (not cookies for authorization) |
