/**
 * Executive Decision Engine — aggregates Top-3 Risks, Top-3 Opportunities
 * and Recommended Actions from real runtime tables for the Situation
 * Room. Pure reads, no fabrication.
 *
 * Sources:
 *   - sec_incidents              (operational risks, ranked by severity)
 *   - briefing_risks             (executive risks from latest briefing)
 *   - briefing_opportunities     (executive opportunities)
 *   - briefing_actions           (recommended actions)
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DecisionItem = {
  id: string;
  title_ar: string;
  title_en: string;
  detail_ar: string | null;
  detail_en: string | null;
  /** 0..100 ranking score */
  score: number;
  /** 0..1 confidence */
  confidence: number;
  priority: "low" | "medium" | "high" | "critical";
  business_impact: string | null;
  operational_impact: string | null;
  source: "incident" | "briefing";
};

export type ExecutiveDecisions = {
  risks: DecisionItem[];
  opportunities: DecisionItem[];
  actions: DecisionItem[];
  generated_at: string;
};

const SEV_SCORE: Record<string, number> = {
  critical: 95,
  high: 78,
  medium: 55,
  low: 30,
};

const SEV_PRIORITY: Record<string, DecisionItem["priority"]> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

function priorityFromScore(score: number): DecisionItem["priority"] {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const getExecutiveDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExecutiveDecisions> => {
    const sb = context.supabase;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [incidentsRes, briefRisksRes, briefOppsRes, briefActionsRes] = await Promise.all([
      sb
        .from("sec_incidents")
        .select(
          "id, title_ar, title_en, ai_summary, severity, status, category, reported_at, site_id",
        )
        .gte("reported_at", since)
        .order("reported_at", { ascending: false })
        .limit(50),
      sb
        .from("briefing_risks")
        .select("id, title, title_en, level, probability")
        .order("probability", { ascending: false, nullsFirst: false })
        .limit(20),
      sb
        .from("briefing_opportunities")
        .select("id, title, title_en, potential")
        .order("potential", { ascending: false, nullsFirst: false })
        .limit(20),
      sb
        .from("briefing_actions")
        .select("id, title, title_en, priority")
        .order("priority", { ascending: false, nullsFirst: false })
        .limit(20),
    ]);

    type Incident = {
      id: string;
      title_ar: string | null;
      title_en: string | null;
      ai_summary: string | null;
      severity: string | null;
      status: string | null;
      category: string | null;
      reported_at: string;
      site_id: string | null;
    };
    type BriefRisk = {
      id: string;
      title: string | null;
      title_en: string | null;
      level: string | null;
      probability: number | null;
    };
    type BriefOpp = {
      id: string;
      title: string | null;
      title_en: string | null;
      potential: number | null;
    };
    type BriefAction = {
      id: string;
      title: string | null;
      title_en: string | null;
      priority: number | null;
    };

    const incidents = (incidentsRes.data ?? []) as Incident[];
    const briefRisks = (briefRisksRes.data ?? []) as BriefRisk[];
    const briefOpps = (briefOppsRes.data ?? []) as BriefOpp[];
    const briefActions = (briefActionsRes.data ?? []) as BriefAction[];

    // ----- Risks: blend operational incidents with executive briefing risks -----
    const incidentRisks: DecisionItem[] = incidents
      .filter((i) => i.status !== "resolved" && i.status !== "closed")
      .map((i) => {
        const sev = (i.severity ?? "medium").toLowerCase();
        const score = SEV_SCORE[sev] ?? 50;
        return {
          id: `inc-${i.id}`,
          title_ar: i.title_ar ?? i.title_en ?? "بلاغ تشغيلي",
          title_en: i.title_en ?? i.title_ar ?? "Operational incident",
          detail_ar: i.ai_summary,
          detail_en: i.ai_summary,
          score,
          confidence: 0.9,
          priority: SEV_PRIORITY[sev] ?? "medium",
          business_impact: i.category,
          operational_impact: i.status,
          source: "incident" as const,
        };
      });

    const execRisks: DecisionItem[] = briefRisks.map((r) => {
      const score = Math.max(0, Math.min(100, r.probability ?? 50));
      return {
        id: `brisk-${r.id}`,
        title_ar: r.title ?? "مخاطرة",
        title_en: r.title_en ?? r.title ?? "Risk",
        detail_ar: null,
        detail_en: null,
        score,
        confidence: Math.max(0.5, score / 100),
        priority: (r.level as DecisionItem["priority"]) ?? priorityFromScore(score),
        business_impact: null,
        operational_impact: null,
        source: "briefing" as const,
      };
    });

    const risks = [...incidentRisks, ...execRisks].sort((a, b) => b.score - a.score).slice(0, 3);

    const opportunities: DecisionItem[] = briefOpps
      .map((o) => {
        const score = Math.max(0, Math.min(100, o.potential ?? 50));
        return {
          id: `bopp-${o.id}`,
          title_ar: o.title ?? "فرصة",
          title_en: o.title_en ?? o.title ?? "Opportunity",
          detail_ar: null,
          detail_en: null,
          score,
          confidence: Math.max(0.5, score / 100),
          priority: priorityFromScore(score),
          business_impact: null,
          operational_impact: null,
          source: "briefing" as const,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const actions: DecisionItem[] = briefActions
      .map((a) => {
        const score = Math.max(0, Math.min(100, a.priority ?? 50));
        return {
          id: `bact-${a.id}`,
          title_ar: a.title ?? "إجراء",
          title_en: a.title_en ?? a.title ?? "Action",
          detail_ar: null,
          detail_en: null,
          score,
          confidence: Math.max(0.55, score / 100),
          priority: priorityFromScore(score),
          business_impact: null,
          operational_impact: null,
          source: "briefing" as const,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      risks,
      opportunities,
      actions,
      generated_at: new Date().toISOString(),
    };
  });
