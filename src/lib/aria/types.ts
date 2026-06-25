import { z } from "zod";

export const PIPELINE_STAGES = [
  "intent",
  "memory",
  "knowledge",
  "context",
  "kpi",
  "risk",
  "decision",
  "reasoning",
  "tools",
  "report",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGES)[number];

export const IntentSchema = z.object({
  intent: z.enum([
    "kpi_query",
    "risk_query",
    "incident_lookup",
    "report_request",
    "tool_action",
    "conversational",
  ]),
  language: z.enum(["ar", "en"]),
  entities: z.array(z.string()).default([]),
  requires_report: z.boolean().default(false),
  report_kind: z
    .enum(["executive", "daily", "weekly", "monthly", "incident", "risk", "operations", "board"])
    .optional(),
  requires_tools: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.7),
});
export type Intent = z.infer<typeof IntentSchema>;

export const RiskItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["incident", "permit", "asset", "cctv", "sensor", "patrol"]),
  title: z.string(),
  score: z.number().min(0).max(100),
  severity: z.enum(["low", "medium", "high", "critical"]),
  rationale: z.string(),
  ref: z.string().nullable().optional(),
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export const DecisionItemSchema = z.object({
  recommendation: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  suggested_tool: z.string().nullable(),
  // tool_payload is JSON-encoded so the type stays serializable across server-fn boundary.
  tool_payload_json: z.string().nullable(),
  alternatives: z.array(z.string()).default([]),
});
export type DecisionItem = z.infer<typeof DecisionItemSchema>;

// `data` is a JSON-encoded string so the trace stays serializable across the
// TanStack server-fn boundary (which rejects `unknown`/non-JSON-safe values).
export const StageTraceSchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
  status: z.enum(["ok", "skipped", "error"]),
  duration_ms: z.number().int().nonnegative(),
  summary: z.string(),
  data_json: z.string().optional(),
});
export type StageTrace = z.infer<typeof StageTraceSchema>;

export const CitationSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  similarity: z.number().min(0).max(1).optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ReportKindSchema = z.enum([
  "executive",
  "daily",
  "weekly",
  "monthly",
  "incident",
  "risk",
  "operations",
  "board",
]);
export type ReportKind = z.infer<typeof ReportKindSchema>;
