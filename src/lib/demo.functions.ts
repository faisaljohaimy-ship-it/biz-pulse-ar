import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_EMAIL = "demo@nexus.app";
export const DEMO_PASSWORD = "Nexus2026!";

/**
 * Idempotently ensures the seeded demo account exists and is email-confirmed.
 * Safe to call repeatedly — used by the "Enter as Demo" button on /login.
 * Standard email/password auth remains intact for production sign-ups.
 */
export const ensureDemoUser = createServerFn({ method: "POST" }).handler(async () => {
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
