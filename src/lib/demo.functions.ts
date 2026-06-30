import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authz.server";

export const DEMO_EMAIL = "demo@nexus.app";

function getDemoPassword() {
  const password = process.env.NEXIOS_DEMO_PASSWORD || process.env.DEMO_PASSWORD;
  if (!password) throw new Error("Demo password is not configured for this environment.");
  return password;
}

/** Admin-only utility for preparing isolated demonstration accounts. */
export const ensureDemoUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.userId);
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
          password: getDemoPassword(),
        });
      }
      return { ok: true, created: false };
    }

    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: getDemoPassword(),
      email_confirm: true,
      user_metadata: { name: "Demo Executive" },
    });
    if (createErr) throw new Error(createErr.message);

    return { ok: true, created: true };
  });
