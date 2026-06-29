---
name: rls-policy-reviewer
description: Review Supabase RLS policies for tenant isolation, role escalation risks, and missing GRANTs. Use when creating tables, adding policies, or after security scan findings.
---

# RLS Policy Reviewer

## Mandatory Checks per public table
1. `ENABLE ROW LEVEL SECURITY` present.
2. At least one policy per operation actually exposed (SELECT/INSERT/UPDATE/DELETE).
3. **Tenant isolation** — `org_id = (current_org())` in every policy on multi-tenant tables.
4. **Self-grant block** — no policy allows `user_roles` writes by `authenticated` directly; admin role changes via SECURITY DEFINER fn only.
5. **GRANT statements** present for `authenticated` and `service_role`; `anon` only if a public SELECT policy exists.
6. **Spoofing guard** — `actor_id = auth.uid()` enforced on audit/event INSERTs.

## Red Flags
- `USING (true)` on user-data tables.
- `TO public` instead of `TO authenticated`.
- Service-only tables (orchestration, runtime) with INSERT/UPDATE policies for non-service roles.
- Functions called in RLS that are not `SECURITY DEFINER` + `SET search_path = public`.

## Output
`{ table, findings: [{severity, rule, fix_sql}] }`
