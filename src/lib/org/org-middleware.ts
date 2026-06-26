// Wave 1 — Multi-tenancy: server-fn middleware that injects org context.
// Composes on top of requireSupabaseAuth and validates the caller's role
// against the requested org (default minimum: viewer).
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OrgRole } from "./org.functions";

const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

export interface OrgContext {
  orgId: string;
  orgRole: OrgRole;
}

/**
 * Default org-context middleware. Resolves the active org from JWT claim
 * (app_metadata.current_org) or falls back to the user's first membership.
 * Adds { orgId, orgRole } to the server-fn context.
 *
 * Usage:
 *   createServerFn({ method: 'POST' })
 *     .middleware([requireSupabaseAuth, requireOrgContext])
 *     .handler(async ({ context }) => { context.orgId / context.orgRole })
 */
export const requireOrgContext = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId, claims } = context;
    const claimed =
      (claims as { app_metadata?: { current_org?: string } } | undefined)?.app_metadata
        ?.current_org ?? null;

    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Forbidden: user is not a member of any organization");
    }

    const preferred = claimed ? data.find((r) => r.org_id === claimed) : null;
    const chosen = preferred ?? data[0];

    return next({
      context: {
        orgId: chosen.org_id as string,
        orgRole: chosen.role as OrgRole,
      } satisfies OrgContext,
    });
  });

/**
 * Factory: org-context middleware that requires a minimum role.
 *
 * Usage:
 *   .middleware([requireOrgRole('admin')])
 */
export function requireOrgRole(minRole: OrgRole) {
  return createMiddleware({ type: "function" })
    .middleware([requireOrgContext])
    .server(async ({ next, context }) => {
      const have = ROLE_RANK[context.orgRole];
      const need = ROLE_RANK[minRole];
      if (have < need) {
        throw new Error(`Forbidden: requires ${minRole} (have ${context.orgRole})`);
      }
      return next();
    });
}
