import type { Json } from "@/integrations/supabase/types";

export const FNN_TOOL_IDS = ["sql.read", "sec.create_incident", "sec.update_work_order"] as const;
export type FnnToolId = (typeof FNN_TOOL_IDS)[number];

export interface DualAgentExecution {
  id: string;
  toolId: string;
  status: string;
  correlationId: string;
  createdAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

export interface DualAgentOverview {
  orgId: string;
  observedAt: string;
  source: "database";
  scope: "current_user";
  sampleLimit: number;
  tools: Array<{
    id: FnnToolId;
    name: string;
    description: string | null;
    enabled: boolean;
    requiresApproval: boolean;
    inputSchema: Json;
  }>;
  executions: DualAgentExecution[];
  metrics: {
    sampleSize: number;
    succeeded: number;
    failed: number;
    pendingApproval: number;
    running: number;
    successRate: number | null;
  };
}

export interface FnnTaskResult {
  taskId: string;
  coordinator: "sadeed";
  executor: "fnn";
  executionId: string;
  status: "succeeded" | "failed" | "pending_approval" | "rejected" | "rolled_back";
  output?: Json;
  error?: string;
}
