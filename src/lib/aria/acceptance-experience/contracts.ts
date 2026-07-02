import { z } from "zod";

export const LangSchema = z.enum(["ar", "en"]);
export const SystemHealthSchema = z.enum(["green", "amber", "red", "unknown"]);
export const ResponseModeSchema = z.enum(["brief", "detailed"]);
export const AcceptanceStepSchema = z.enum([
  "welcome", "system_health", "top_risks", "recommendations", "ask_next",
]);

export const ExecutiveGreetingInputSchema = z.object({
  userDisplayName: z.string().min(1).max(120).optional(),
  lang: LangSchema,
  systemHealth: SystemHealthSchema.optional(),
  topAlerts: z.array(z.string().min(1).max(200)).max(5).optional(),
  priorities: z.array(z.string().min(1).max(200)).max(5).optional(),
});

export const ResponseDisciplineInputSchema = z.object({
  draft: z.string().min(1).max(4000),
  mode: ResponseModeSchema.default("brief"),
  lang: LangSchema,
});
