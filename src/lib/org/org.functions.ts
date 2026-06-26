// Wave 1 — Multi-tenancy: org server functions
// Client-safe: all server logic lives inside .handler() bodies.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgRole = "owner" | "admin" | "manager" | "operator" | "viewer";

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  role: OrgRole;
  is_current: boolean;
}

export const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * List every organization the signed-in user belongs to, with their role
 * and the currently-active org (from JWT app_metadata.current_org).
 */
export const listMyOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgSummary[]> => {
    const { supabase, userId, claims } = context;
    const currentOrg =
      (claims as { app_metadata?: { current_org?: string } } | undefined)?.app_metadata
        ?.current_org ?? null;

    const { data, error } = await supabase
      .from("org_members")
      .select("role, org:organizations(id, name, slug, plan, status)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true });
    if (error) throw error;

    return (data ?? [])
      .map((row) => {
        const orgRaw = row.org as
          | { id: string; name: string; slug: string; plan: string; status: string }
          | null;
        if (!orgRaw) return null;
        return {
          id: orgRaw.id,
          name: orgRaw.name,
          slug: orgRaw.slug,
          plan: orgRaw.plan,
          status: orgRaw.status,
          role: row.role as OrgRole,
          is_current: currentOrg ? orgRaw.id === currentOrg : orgRaw.id === DEFAULT_ORG_ID,
        };
      })
      .filter((x): x is OrgSummary => x !== null);
  });

/**
 * Switch the active organization for the signed-in user.
 * Verifies membership, then writes app_metadata.current_org via the Admin API.
 * The user must refresh their session for the new JWT to carry the claim.
 */
export const switchOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ org_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify membership using the user-scoped client (RLS-safe).
    const { data: membership, error: memErr } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", data.org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (memErr) throw memErr;
    if (!membership) throw new Error("Not a member of this organization");

    // Privileged write: update app_metadata.current_org via service role.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRow, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr) throw getErr;
    const existing =
      (userRow.user?.app_metadata as Record<string, unknown> | undefined) ?? {};
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { ...existing, current_org: data.org_id },
    });
    if (updErr) throw updErr;

    return { ok: true as const, org_id: data.org_id, role: membership.role };
  });

/**
 * Resolve the org the request is acting on. Falls back to the user's first
 * membership when no JWT claim is set. Returns the org_id plus the caller's
 * role within it. Throws if the user has no memberships.
 */
export const getCurrentOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const claimed =
      (claims as { app_metadata?: { current_org?: string } } | undefined)?.app_metadata
        ?.current_org ?? null;

    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role, org:organizations(id, name, slug, plan, status)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("User has no organization");

    const preferred = claimed ? data.find((r) => r.org_id === claimed) : null;
    const chosen = preferred ?? data[0];
    const orgRaw = chosen.org as
      | { id: string; name: string; slug: string; plan: string; status: string }
      | null;
    if (!orgRaw) throw new Error("Organization not found");

    return {
      org_id: chosen.org_id,
      role: chosen.role as OrgRole,
      organization: orgRaw,
    };
  });
