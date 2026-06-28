// Cost budget + secrets rotation read APIs for the Observability dashboard.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BudgetStatus = {
  scope: string;
  monthly_cap_usd: number;
  alert_threshold_pct: number;
  enabled: boolean;
  month_spend_usd: number;
  pct_used: number;
  state: "ok" | "warning" | "exceeded" | "unset";
};

export const getCostBudgetStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BudgetStatus[]> => {
    const { supabase, userId } = context;
    const { data: m } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    const orgId = m?.org_id;
    if (!orgId) return [];

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [budgetsRes, usageRes] = await Promise.all([
      supabaseAdmin
        .from("cost_budgets")
        .select("scope, monthly_cap_usd, alert_threshold_pct, enabled")
        .eq("org_id", orgId),
      supabaseAdmin
        .from("ai_usage")
        .select("cost_usd")
        .gte("created_at", monthStart.toISOString()),
    ]);

    const monthSpend = (usageRes.data ?? []).reduce(
      (a, r) => a + Number(r.cost_usd ?? 0),
      0,
    );

    const budgets = budgetsRes.data ?? [];
    if (budgets.length === 0) {
      return [
        {
          scope: "ai_gateway",
          monthly_cap_usd: 0,
          alert_threshold_pct: 80,
          enabled: false,
          month_spend_usd: monthSpend,
          pct_used: 0,
          state: "unset",
        },
      ];
    }

    return budgets.map((b) => {
      const cap = Number(b.monthly_cap_usd);
      const pct = cap > 0 ? Math.round((monthSpend / cap) * 100) : 0;
      const state: BudgetStatus["state"] =
        !b.enabled || cap === 0
          ? "unset"
          : pct >= 100
            ? "exceeded"
            : pct >= b.alert_threshold_pct
              ? "warning"
              : "ok";
      return {
        scope: b.scope,
        monthly_cap_usd: cap,
        alert_threshold_pct: b.alert_threshold_pct,
        enabled: b.enabled,
        month_spend_usd: monthSpend,
        pct_used: pct,
        state,
      };
    });
  });

export type RotationEntry = {
  secret_name: string;
  last_rotated_at: string | null;
  next_due_at: string | null;
  days_overdue: number | null;
};

const TRACKED_SECRETS = [
  "LOVABLE_API_KEY",
  "MICROSOFT_GRAPH_CLIENT_SECRET",
  "ELEVENLABS_API_KEY",
  "RESEND_API_KEY",
];

export const getSecretsRotationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RotationEntry[]> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return [];

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("secrets_rotation_log")
      .select("secret_name, rotated_at, next_due_at")
      .order("rotated_at", { ascending: false });

    const latest = new Map<
      string,
      { rotated_at: string; next_due_at: string | null }
    >();
    for (const r of data ?? []) {
      if (!latest.has(r.secret_name)) {
        latest.set(r.secret_name, {
          rotated_at: r.rotated_at,
          next_due_at: r.next_due_at,
        });
      }
    }

    const now = Date.now();
    return TRACKED_SECRETS.map((name) => {
      const e = latest.get(name);
      const due = e?.next_due_at ? new Date(e.next_due_at).getTime() : null;
      const overdue =
        due !== null ? Math.floor((now - due) / 86_400_000) : null;
      return {
        secret_name: name,
        last_rotated_at: e?.rotated_at ?? null,
        next_due_at: e?.next_due_at ?? null,
        days_overdue: overdue !== null && overdue > 0 ? overdue : null,
      };
    });
  });
