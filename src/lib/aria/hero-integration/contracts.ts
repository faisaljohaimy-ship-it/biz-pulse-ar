import { z } from "zod";

export const HeroPresenceSchema = z.enum([
  "boot",
  "idle",
  "greeting",
  "listening",
  "thinking",
  "speaking",
  "interrupted",
  "error",
]);

export const HeroGlowSchema = z.enum([
  "dim",
  "ambient",
  "attentive",
  "focused",
  "radiant",
  "alert",
]);

export const HeroButtonIdSchema = z.enum([
  "talk_to_aria",
  "executive_briefing",
  "start_demo",
  "show_risks",
  "show_today_summary",
  "generate_report",
]);

export const HeroButtonStatusSchema = z.enum(["idle", "loading", "success", "error"]);

export const HeroButtonStateSchema = z.object({
  id: HeroButtonIdSchema,
  status: HeroButtonStatusSchema,
  message_ar: z.string().optional(),
  message_en: z.string().optional(),
  startedAt: z.number().int().nonnegative().optional(),
  completedAt: z.number().int().nonnegative().optional(),
});

export const HeroClickButtonInputSchema = z.object({
  instanceId: z.string().min(1),
  buttonId: HeroButtonIdSchema,
  lang: z.enum(["ar", "en", "unknown"]).optional(),
});

export type HeroClickButtonInput = z.infer<typeof HeroClickButtonInputSchema>;
