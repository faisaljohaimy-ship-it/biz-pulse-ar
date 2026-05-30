import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Types
// ============================================================
export type GovernanceSystem = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  owner: string | null;
  criticality: string;
  sla: number;
  contract_ends: string | null;
  risk: string;
  created_at: string;
  updated_at: string;
};

export type GovernancePolicy = {
  id: string;
  user_id: string;
  name: string;
  name_en: string | null;
  version: string;
  coverage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TransformationProgram = {
  id: string;
  user_id: string;
  name: string;
  name_en: string | null;
  progress: number;
  adoption: number;
  savings: string | null;
  phase: string;
  created_at: string;
  updated_at: string;
};

export type TransformationMilestone = {
  id: string;
  user_id: string;
  program_id: string | null;
  title: string;
  title_en: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessOutcome = {
  id: string;
  user_id: string;
  category: string;
  label: string;
  label_en: string | null;
  value: string;
  delta: string | null;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
  updated_at: string;
};

export type OutcomeMetric = {
  id: string;
  user_id: string;
  outcome_id: string | null;
  driver: string;
  driver_en: string | null;
  impact_value: number | null;
  created_at: string;
};

export type ExecutiveBriefing = {
  id: string;
  user_id: string;
  title: string;
  title_en: string | null;
  summary: string | null;
  summary_en: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
};

export type BriefingAction = {
  id: string;
  user_id: string;
  briefing_id: string | null;
  title: string;
  title_en: string | null;
  priority: number;
  created_at: string;
};

export type BriefingRisk = {
  id: string;
  user_id: string;
  briefing_id: string | null;
  title: string;
  title_en: string | null;
  level: string;
  probability: number;
  created_at: string;
};

export type BriefingOpportunity = {
  id: string;
  user_id: string;
  briefing_id: string | null;
  title: string;
  title_en: string | null;
  potential: number;
  created_at: string;
};

// ============================================================
// Generic CRUD factory
// ============================================================
type AnyRow = { id: string };

function makeHooks<T extends AnyRow, Insert extends Record<string, unknown>>(
  table:
    | "governance_systems"
    | "governance_policies"
    | "transformation_programs"
    | "transformation_milestones"
    | "business_outcomes"
    | "outcome_metrics"
    | "executive_briefings"
    | "briefing_actions"
    | "briefing_risks"
    | "briefing_opportunities",
  orderCol = "created_at",
  ascending = false,
) {
  const key = [table];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tbl = () => supabase.from(table) as any;

  function useList() {
    return useQuery<T[]>({
      queryKey: key,
      queryFn: async () => {
        const { data, error } = await tbl()
          .select("*")
          .order(orderCol, { ascending });
        if (error) throw error;
        return (data ?? []) as T[];
      },
      staleTime: 15_000,
      refetchInterval: 30_000,
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload: Insert) => {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("Not authenticated");
        const { data, error } = await tbl()
          .insert({ ...payload, user_id: uid })
          .select()
          .single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<Insert> }) => {
        const { data, error } = await tbl()
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await tbl().delete().eq("id", id);
        if (error) throw error;
        return id;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
  }

  return { useList, useCreate, useUpdate, useDelete };
}

// ============================================================
// Domain hooks
// ============================================================
export const governanceSystems = makeHooks<
  GovernanceSystem,
  Omit<GovernanceSystem, "id" | "user_id" | "created_at" | "updated_at">
>("governance_systems", "name", true);

export const governancePolicies = makeHooks<
  GovernancePolicy,
  Omit<GovernancePolicy, "id" | "user_id" | "created_at" | "updated_at">
>("governance_policies", "name", true);

export const transformationPrograms = makeHooks<
  TransformationProgram,
  Omit<TransformationProgram, "id" | "user_id" | "created_at" | "updated_at">
>("transformation_programs", "created_at", false);

export const transformationMilestones = makeHooks<
  TransformationMilestone,
  Omit<TransformationMilestone, "id" | "user_id" | "created_at" | "updated_at">
>("transformation_milestones", "due_at", true);

export const businessOutcomes = makeHooks<
  BusinessOutcome,
  Omit<BusinessOutcome, "id" | "user_id" | "created_at" | "updated_at">
>("business_outcomes", "created_at", false);

export const outcomeMetrics = makeHooks<
  OutcomeMetric,
  Omit<OutcomeMetric, "id" | "user_id" | "created_at">
>("outcome_metrics", "created_at", false);

export const executiveBriefings = makeHooks<
  ExecutiveBriefing,
  Omit<ExecutiveBriefing, "id" | "user_id" | "created_at" | "updated_at">
>("executive_briefings", "generated_at", false);

export const briefingActions = makeHooks<
  BriefingAction,
  Omit<BriefingAction, "id" | "user_id" | "created_at">
>("briefing_actions", "priority", false);

export const briefingRisks = makeHooks<
  BriefingRisk,
  Omit<BriefingRisk, "id" | "user_id" | "created_at">
>("briefing_risks", "probability", false);

export const briefingOpportunities = makeHooks<
  BriefingOpportunity,
  Omit<BriefingOpportunity, "id" | "user_id" | "created_at">
>("briefing_opportunities", "potential", false);

// ============================================================
// Fabric adapter — aggregate enterprise health from new domains
// ============================================================
export function useEnterpriseFabricAdapter() {
  const systems = governanceSystems.useList();
  const policies = governancePolicies.useList();
  const programs = transformationPrograms.useList();
  const outcomes = businessOutcomes.useList();
  const briefings = executiveBriefings.useList();

  const systemsList = systems.data ?? [];
  const policiesList = policies.data ?? [];
  const programsList = programs.data ?? [];
  const outcomesList = outcomes.data ?? [];

  const avgSla =
    systemsList.length === 0
      ? 0
      : systemsList.reduce((s, x) => s + Number(x.sla), 0) / systemsList.length;
  const avgPolicyCoverage =
    policiesList.length === 0
      ? 0
      : Math.round(
          policiesList.reduce((s, x) => s + x.coverage, 0) / policiesList.length,
        );
  const avgProgress =
    programsList.length === 0
      ? 0
      : Math.round(
          programsList.reduce((s, x) => s + x.progress, 0) / programsList.length,
        );
  const avgAdoption =
    programsList.length === 0
      ? 0
      : Math.round(
          programsList.reduce((s, x) => s + x.adoption, 0) / programsList.length,
        );

  return {
    systemsCount: systemsList.length,
    policiesCount: policiesList.length,
    programsCount: programsList.length,
    outcomesCount: outcomesList.length,
    briefingsCount: briefings.data?.length ?? 0,
    avgSla: Math.round(avgSla * 100) / 100,
    avgPolicyCoverage,
    avgProgress,
    avgAdoption,
    highRiskSystems: systemsList.filter((s) => s.risk === "high").length,
    isLoading:
      systems.isLoading ||
      policies.isLoading ||
      programs.isLoading ||
      outcomes.isLoading ||
      briefings.isLoading,
  };
}
