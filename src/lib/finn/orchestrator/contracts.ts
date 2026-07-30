/**
 * Zod contracts for orchestrator inputs. Additive only — reuses
 * BrainRequestSchema shape via extension.
 */
import { z } from "zod";
import { BrainRequestSchema } from "../executive-brain/contracts";

export const MissionRequestSchema = BrainRequestSchema.extend({
  missionId: z.string().min(1).max(120).optional(),
  agents: z.array(z.string().min(1).max(64)).max(32).optional(),
  timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
});

export type MissionRequestInput = z.infer<typeof MissionRequestSchema>;
