import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export async function hasPlatformRole(userId: string, role: AppRole): Promise<boolean> {
  if (!userId) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function hasAnyPlatformRole(userId: string, roles: string[]): Promise<boolean> {
  if (!roles.length) return false;
  const validRoles = roles.filter(
    (role): role is AppRole => role === "admin" || role === "manager" || role === "member",
  );
  if (!userId || !validRoles.length) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", validRoles);
  if (error) return false;
  return Boolean(data?.length);
}

export async function requirePlatformAdmin(userId: string): Promise<void> {
  if (!(await hasPlatformRole(userId, "admin"))) {
    throw new Error("Forbidden: admin role required");
  }
}

export async function getCurrentOrgIdForUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data?.org_id as string | undefined) ?? null;
}
