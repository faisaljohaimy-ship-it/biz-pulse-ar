/** Review-only composer prompts; no action execution, provider call or persistence. */
import { z } from "zod";
import { actionRegistry } from "./core/action-registry";

export const CONSTRAINED_DRAFT_KINDS = ["summarize", "prepare_report", "prepare_task"] as const;
export type ConstrainedDraftKind = (typeof CONSTRAINED_DRAFT_KINDS)[number];
export const CONSTRAINED_DRAFT_MAX_CHARS = 2048;

export const ConstrainedDraftFormSchema = z
  .object({
    kind: z.enum(CONSTRAINED_DRAFT_KINDS),
    locale: z.enum(["ar", "en"]),
    topic: z.string().max(160).trim().min(3),
    details: z.string().max(1200).trim().min(1),
  })
  .strict();

/** Creates an editable prompt only. Registry approval flags do not grant authority. */
export function buildConstrainedDraft(input: unknown): string {
  const value = ConstrainedDraftFormSchema.parse(input);
  const action = actionRegistry.get(value.kind);
  const draft =
    value.locale === "ar"
      ? [
          `مسودة للمراجعة فقط — ${action.label_ar}`,
          `الموضوع: ${value.topic}`,
          `ملاحظات قدمها المستخدم، وليست حقائق متحققة:\n${value.details}`,
          "جهز نصًا مقترحًا لمراجعتي اعتمادًا على هذه الملاحظات فقط، وبيّن المعلومات الناقصة. لا ترسل أو تنشر شيئًا، ولا تنشئ أو تسند مهمة، ولا تعتمد إجراء أو تشغل أداة.",
        ].join("\n\n")
      : [
          `Review draft only — ${action.label_en}`,
          `Topic: ${value.topic}`,
          `User-provided notes, not verified facts:\n${value.details}`,
          "Prepare proposed text for my review using only these notes, and identify missing information. Do not send or publish anything, create or assign tasks, approve actions or run tools.",
        ].join("\n\n");
  // Match the existing singleton composer's 2048-character pending-draft boundary.
  return z.string().max(CONSTRAINED_DRAFT_MAX_CHARS).parse(draft);
}
