/**
 * Live badges for the holographic module grid — tiny signals that make
 * tiles breathe before they're opened. One resilient source per figure
 * («بيانات لا تفرغ»): live rows win, reference simulation otherwise.
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export type ModuleBadges = {
  /** HCIS compliance percentage across assessed regions. */
  hcis_pct: number;
  /** Currently active digital work permits. */
  permits_active: number;
  /** Rows in the reports registry. */
  reports_count: number;
  source: "database" | "reference";
};

export const getModuleBadges = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<ModuleBadges> => {
    const { resilient } = await import("@/lib/exec/showcase-simulation.server");
    const supabase = context.supabase as { from: (t: string) => any };
    return resilient(
      "module-badges",
      async (): Promise<ModuleBadges> => {
        const [compliance, permits, reports] = await Promise.all([
          supabase.from("hcis_compliance_status").select("status"),
          supabase.from("permits").select("id,status").eq("status", "active"),
          supabase.from("sec_reports").select("id", { count: "exact", head: true }),
        ]);
        const rows = (compliance.data ?? []) as Array<{ status: string }>;
        const assessed = rows.filter((r) => r.status && r.status !== "not_assessed");
        const compliant = assessed.filter(
          (r) => r.status === "compliant" || r.status === "in_progress",
        );
        const hcis_pct = assessed.length
          ? Math.round((compliant.length / assessed.length) * 100)
          : 0;
        return {
          hcis_pct,
          permits_active: (permits.data ?? []).length,
          reports_count: reports.count ?? 0,
          source: "database" as const,
        };
      },
      (b) => b.hcis_pct === 0 && b.permits_active === 0 && b.reports_count === 0,
      () => ({ hcis_pct: 97, permits_active: 6, reports_count: 5, source: "reference" as const }),
    );
  });
