import { z } from "zod";

export const ExperienceSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1).nullable(),
  source: z.enum(["execution", "reasoning", "decision", "feedback"]),
  capturedAt: z.string().min(1),
  capability: z.string().min(1).nullable(),
  agentId: z.string().min(1).nullable(),
  durationMs: z.number().nonnegative(),
  success: z.boolean(),
  confidence: z.number().min(0).max(1),
  retries: z.number().int().nonnegative(),
  rollbacks: z.number().int().nonnegative(),
  failureClass: z.string().min(1).nullable(),
  context: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

export const LearningCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  experiences: z.array(ExperienceSchema).min(1),
  createdAt: z.string().min(1),
  mode: z.enum(["post_mission", "post_reasoning", "periodic", "on_feedback"]),
});

export const PatternSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "recurring_success",
    "recurring_failure",
    "bottleneck",
    "capability_gap",
    "cluster",
  ]),
  signature: z.string().min(1),
  occurrences: z.number().int().positive(),
  firstSeen: z.string().min(1),
  lastSeen: z.string().min(1),
  avgConfidence: z.number().min(0).max(1),
  avgDurationMs: z.number().nonnegative(),
  failureRate: z.number().min(0).max(1),
  capability: z.string().min(1).nullable(),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const LessonSchema = z.object({
  id: z.string().min(1),
  patternId: z.string().min(1),
  statement: z.string().min(4),
  rationale: z.string().min(4),
  evidenceStrength: z.enum(["weak", "moderate", "strong", "conclusive"]),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  appliesTo: z.array(z.string().min(1)),
});

export const ImprovementSchema = z.object({
  id: z.string().min(1),
  lessonId: z.string().min(1),
  target: z.enum([
    "planner",
    "reasoning",
    "orchestrator",
    "marketplace",
    "execution",
    "recovery",
  ]),
  action: z.string().min(4),
  expectedImpact: z.string().min(4),
  priority: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
});

export const KnowledgeArtifactSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  title: z.string().min(1),
  kind: z.enum(["lesson", "playbook", "guideline", "capability_profile"]),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)),
  links: z.array(z.string().min(1)),
  evidenceIds: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  supersedes: z.string().min(1).nullable(),
});

export const CapabilityScoreSchema = z.object({
  capability: z.string().min(1),
  score: z.number().min(0).max(1),
  samples: z.number().int().nonnegative(),
  avgConfidence: z.number().min(0).max(1),
  successRate: z.number().min(0).max(1),
  avgDurationMs: z.number().nonnegative(),
  updatedAt: z.string().min(1),
});
