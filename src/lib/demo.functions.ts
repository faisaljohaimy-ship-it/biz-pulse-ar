import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEMO_EMAIL = "demo@nexus.app";
export const DEMO_PASSWORD = "Nexus2026!";

async function requireAdmin(context: { supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Admin-only utility for preparing isolated demonstration accounts. */
export const ensureDemoUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  await requireAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Check if the user already exists
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(listErr.message);

  const existing = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
  if (existing) {
    // Make sure email is confirmed and password is the known one (idempotent reset)
    if (!existing.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
        password: DEMO_PASSWORD,
      });
    }
    return { ok: true, created: false };
  }

  const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Demo Executive" },
  });
  if (createErr) throw new Error(createErr.message);

  return { ok: true, created: true };
});
