# SADEED enterprise security evidence — 2026-11-22

This is a read-only, bounded security review for the enterprise delivery iteration. It is not a penetration-test certificate or a claim of complete enterprise readiness. No business rows, employee/customer records, credentials, or authentication-user records were queried. No database/schema/policy/auth setting was changed, and no provider or operational action was invoked.

## Production identity and methods

At **2026-11-22 21:28:19 UTC**, the actual production endpoint [OAuth protected-resource metadata](https://neexios.com/.well-known/oauth-protected-resource) returned HTTP 200 and an authorization server at `https://cnaevysaoimzusnvpazr.supabase.co/auth/v1`. The connected Supabase project lookup independently returned `AI-command-center`, `ACTIVE_HEALTHY`, `ap-southeast-2`, PostgreSQL `17.6.1.127`.

The project was selected from this live production response, not merely from local configuration or an account's project list. Subsequent SQL was limited to `pg_class`, `pg_namespace`, `pg_policies`, `pg_proc`, `pg_trigger`, `information_schema.columns`, privilege predicates, and boolean inspection of stored definitions. The Supabase security advisor was read at **21:28:50 UTC**.

## Measured catalog inventory

| Measure | Observed result | What this proves / limit |
|---|---:|---|
| Public tables / tables with RLS | 148 / 148 | No public table has RLS disabled at this observation. This does not establish correct row isolation. |
| Public tables with FORCE RLS | 8 | Owners/bypass roles remain privileged elsewhere; service-role callers need explicit application scoping. |
| Public policies | 422 | Catalog inventory, not 422 behavioral tests. |
| Public policies applying to `anon` or `public` | 10 | Some public showcase access is intentional; grants alone do not prove data exposure. |
| Public policies with literal `true` predicates | 3 | All three are authenticated SELECT on reference tables: `hcis_directives`, `hcis_sectors`, `hcis_approval_stages`. No literal-true write was found by this query. |
| Tables with anon / authenticated SELECT grants | 132 / 142 | Grants are checked before RLS, not a replacement for it. |
| Public RLS-enabled table without a policy | `finn_public_incidents` | Default-deny for ordinary non-bypass roles; no policy was added to silence the advisor. |
| Public SECURITY DEFINER functions | 39 | All 39 have a fixed `search_path` in catalog configuration. Authorization behavior was not executed. |
| Storage tables inspected / RLS enabled | 8 / 8 | Does not establish bucket/object access policy correctness; bucket/object rows were not read. |
| Public tables with `region`, `region_code`, or `region_id` | 9 | A schema capability, not proof of per-user region authorization. |
| Public policies containing a region-named predicate | 0 | Organization/helper predicates may still define access boundaries. This is not proof of a cross-region breach. |

## Advisor findings and disposition

| Advisor finding | Count / level | Assessment and required follow-up |
|---|---|---|
| `security_definer_view` | 1 / ERROR | `public.maint_orders_v` has `security_invoker=false` and SELECT grants to anon/authenticated. This is the existing, explicitly documented public-maintenance projection, not sufficient evidence of an accidental disclosure. Preserve it pending focused policy tests. |
| `rls_enabled_no_policy` | 5 / INFO | One public table above; four tables in `sadeed_migration_control` / `sadeed_ops`. RLS without policy denies ordinary access; do not add permissive policies just to clear the notice. |
| `anon_security_definer_function_executable` | 1 / WARN | `is_org_member` is intentionally callable by anon for the maintenance projection and contains an `auth.uid()` check. Its behavior was not invoked. |
| `authenticated_security_definer_function_executable` | 9 / WARN | Membership/role and maintenance helpers. Catalog signals show explicit actor/member/manager checks on relevant maintenance operations. Caller rights need synthetic-role behavioral regression coverage. |
| `extension_in_public` | 2 / WARN | `pg_trgm` and `unaccent`; moving extensions can affect SQL resolution/indexes and is not part of this application release. |
| `auth_leaked_password_protection` | 1 / WARN | Protection is disabled in live Auth configuration. Plan/tier availability and login regression should be checked before enabling it through an approved auth-settings change. |

Primary remediation references: [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [security-definer view](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [extension placement](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Maintenance projection: important exception

[CLAUDE.md](../../CLAUDE.md) documents an owner-approved, time-limited public read window through 2027-04-06, with personal fields hidden from nonmembers. The live view definition was inspected only as boolean guard signals: organization-membership checks, `maint_public_read_open`, and CASE/NULL redaction expressions are present. The expiry helper contains the expected closing date. Notes, creator, and assignee fields exist in the projection but their column names alone do not establish that an anonymous caller receives their values.

The matching repository design is [the public-maintenance migration](../../supabase/migrations/20261006190000_maint_orders_sap_public.sql): it redacts notes and creator/assignee identities for nonmembers, preserves the nonpersonal assignment fact, and restricts the public window to the operational organization. The anonymous membership-helper grant is intentional. Blindly changing the view to invoker or revoking the helper can break this approved behavior.

**Not proven by this review:** actual redacted values under anonymous / member / other-organization sessions, nonempty two-organization isolation, or behavior after expiry. These require synthetic fixtures and target-role tests; privileged catalog SELECT is not that evidence.

## Application-boundary observations

| Boundary | Source evidence | Current assurance |
|---|---|---|
| Server authentication | [Required middleware](../../src/integrations/supabase/auth-middleware.ts) verifies Bearer claims through Supabase `getClaims`; [optional middleware](../../src/integrations/supabase/optional-auth-middleware.ts) falls back to an anon client for guest reads. | Server claims verification exists. Actual sign-in, refresh, logout/revocation behavior was not exercised here. A verified JWT alone must not be described as proof of immediate session revocation. |
| Privileged key isolation | [Server client](../../src/integrations/supabase/client.server.ts) reads service-role only from server environment, without a public/VITE fallback. | Positive source control; no credential value was retrieved. Runtime/browser leakage is covered separately by release secret/bundle checks. |
| Tenant scoping | [Authorization helpers](../../src/lib/authz.server.ts) query membership and fail closed on errors; `getOrgIdsForUser` supplies explicit tenant scoping for bypass reads. | Reviewed helper behavior in source; not an exhaustive audit of every service-role consumer. |
| Region separation | [Region strategy](../../src/lib/regions/region-scope.ts) distinguishes real regional filters, reference scenarios, and cross-region totals. | Good display-source disclosure. URL/local-storage region selection is not an authorization boundary. Per-actor region permissions need an explicit model and behavioral tests. |
| Role mutation authorization | [Security center](../../src/lib/security-center.functions.ts) requires authenticated caller plus platform-admin / org-owner-admin checks, restricts owner grants and self-demotion, and scopes the target update by org/user. | Positive source controls; no real role change was executed. |
| Role-mutation audit durability | The role update is followed by a separate audit insert; the insert's returned error is not checked. Live `pg_trigger` metadata reports **no noninternal trigger on `org_members`**. | No transactional application-audit guarantee was established for that path. This is a reliability/security-evidence gap, not evidence that a particular real update lacked a record. |

The existing [live RLS suite](../../src/lib/security/rls-isolation.test.ts) explicitly skips when two-org credentials are unavailable, and its write-negative cases would attempt production writes if pointed there. It was **not run against production** in this read-only review. A green ordinary unit run must not be reported as successful live tenant isolation.

## Corrective priorities

1. **P1 — durable audit before new real sensitive actions.** Add a bounded design for actor-authorized mutation plus audit in one transaction, with idempotency, audit-failure tests, and rollback. A new database function/trigger requires separate explicit production-database authorization; do not conceal audit failure or automatically replay sensitive actions.
2. **P1 — two-org and region boundary proof.** Use an isolated Postgres/Supabase test environment with nonempty synthetic tenant/region fixtures and actual anon/authenticated roles. Prove the negative checks fail under a deliberately introduced policy defect, then restore it. Define whether region access follows organization membership or a separate entitlement before implementation.
3. **P1 — preserve and test maintenance privacy.** Exercise anonymous, member, other-org, and expired-window reads with synthetic personal fields. Check direct REST projection as well as server routes; keep deliberate public operational facts separate from identity fields.
4. **P2 — Auth hardening and revocation requirements.** Review leaked-password protection availability and decide the required invalidation latency for high-impact actions. Add sign-in/refresh/revoked-session tests without weakening existing verified server gates.
5. **P2 — managed Postgres patch review.** Catalog reports 17.6.1.127. The [current Supabase changelog](https://supabase.com/changelog.md) includes a [17.11 security/minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes). Confirm managed patch/backport status and a tested backup/restore/extension plan; this review did not upgrade the database or infer exploitability from a version number alone.
6. **P2 — dependency reachability triage.** The preceding release gate reported 3 low / 7 moderate and no high/critical npm findings. This DB/source pass did not re-triage individual package advisories or claim them unreachable. Keep the new release's lockfile audit result and primary advisory evidence separate from database advisor findings.

## Release interpretation

This evidence supports keeping the new executive demonstration synthetic and disconnected from operational writes. It does **not** certify live AI connectors, cameras, access-control systems, regional authorization, real incident execution, or transactional audit across the whole platform. The current release also changes FINN request bounds, Task Bus settlement, and the delivery controller, and includes 62 already-reviewed main commits beyond the captured live baseline. Preserve the boundaries above and evaluate that cumulative runtime/release diff with its separate regression evidence; this catalog review alone does not clear the whole release. No score such as “10/10” is justified by this bounded review.

Documentation checked: the current Supabase changelog and [view security guidance](https://supabase.com/docs/guides/database/tables#view-security). No relevant platform upgrade was performed. This report itself is the only repository file written by this review.
