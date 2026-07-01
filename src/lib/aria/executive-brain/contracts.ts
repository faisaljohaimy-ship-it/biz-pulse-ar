/**
 * Zod contracts for the Executive Brain. Used for validating BrainRequest
 * inputs at endpoint boundaries and for validating the strict-JSON model
 * response before it is coerced into `ExecutiveBrainAnswer`.
 */
import { z } from "zod";

export const BrainAnchorSchema = z.object({
  kind: z.string().max(40),
  id: z.string().max(160),
  label: z.string().max(240).optional(),
});

export const BrainWidgetSchema = z.object({
  id: z.string().max(160),
  kind: z.string().max(40),
  label: z.string().max(200),
  value: z.unknown().optional(),
  hint: z.string().max(280).optional(),
});

export const BrainTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(2400),
  ts: z.string().optional(),
  anchors: z.array(BrainAnchorSchema).max(8).optional(),
});

export const BrainPageSchema = z.object({
  path: z.string().max(400).optional(),
  title: z.string().max(240).optional(),
  section: z.string().max(160).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  selected: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const BrainRequestSchema = z.object({
  question: z.string().trim().min(1).max(1200),
  lang: z.enum(["ar", "en", "mixed"]).optional(),
  page: BrainPageSchema.optional(),
  widgets: z.array(BrainWidgetSchema).max(32).optional(),
  anchors: z.array(BrainAnchorSchema).max(16).optional(),
  history: z.array(BrainTurnSchema).max(16).optional(),
  sessionId: z.string().max(120).optional(),
});

/** Strict JSON shape the model must return. */
export const ModelEnvelopeSchema = z.object({
  text_ar: z.string().default(""),
  text_en: z.string().default(""),
  summary_en: z.string().default(""),
  summary_ar: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  reasoning: z.string().default(""),
  assumptions: z.array(z.string()).default([]),
  reasoning_type: z
    .enum([
      "executive",
      "operational",
      "safety",
      "risk",
      "financial",
      "compliance",
      "incident",
      "maintenance",
      "inspection",
      "emergency",
      "security",
      "performance",
      "trend",
      "prediction",
    ])
    .default("executive"),
  decision: z
    .object({
      mode: z.enum([
        "approve",
        "reject",
        "escalate",
        "investigate",
        "monitor",
        "delay",
        "optimize",
        "assign",
        "close",
        "reopen",
      ]),
      rationale_en: z.string().default(""),
      rationale_ar: z.string().default(""),
      requires_human_approval: z.boolean().default(true),
    })
    .nullable()
    .default(null),
  risks: z
    .array(
      z.object({
        facet: z.enum(["operational", "safety", "business", "financial", "compliance"]),
        probability: z.number().min(0).max(1),
        severity: z.number().min(0).max(1),
        title_en: z.string().default(""),
        title_ar: z.string().default(""),
        mitigation_en: z.string().default(""),
        mitigation_ar: z.string().default(""),
      }),
    )
    .default([]),
  recommendation: z
    .object({
      why_en: z.string().default(""),
      why_ar: z.string().default(""),
      evidence: z.array(z.string()).default([]),
      expected_impact_en: z.string().default(""),
      expected_impact_ar: z.string().default(""),
      priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
      confidence: z.number().min(0).max(1).default(0.5),
      responsible_department: z.string().default(""),
      deadline: z.string().default("this week"),
    })
    .nullable()
    .default(null),
  next_action: z
    .object({
      owner: z.string().default(""),
      when: z.string().default(""),
      action: z.string().default(""),
    })
    .nullable()
    .default(null),
  business_impact_en: z.string().default(""),
  business_impact_ar: z.string().default(""),
  self_confidence: z.number().min(0).max(1).default(0.5),
});

export type ModelEnvelope = z.infer<typeof ModelEnvelopeSchema>;
