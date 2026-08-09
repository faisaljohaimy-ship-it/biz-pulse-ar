import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformAdmin } from "@/lib/authz.server";
import { runDirectiveAudit, type DirectiveAuditReport } from "./phase-audit.server";

// SECURITY: this returns internal system-posture (per-module green/amber/red
// statuses + free-text issues) and must not be an unauthenticated recon surface.
// Gated to authenticated platform admins.
export const getDirectiveAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DirectiveAuditReport> => {
    await requirePlatformAdmin(context.userId);
    return runDirectiveAudit();
  });
