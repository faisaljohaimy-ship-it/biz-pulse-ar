// Verification — validates the runtime shape of a conversation snapshot
// before it is exposed to any consumer. Missing data returns UNKNOWN,
// never a fabricated fallback.
import { z } from "zod";
import {
  ConversationStateSchema,
  ConversationTurnSchema,
  FallbackDecisionSchema,
  ResponseStyleSchema,
} from "./contracts";

export const ConversationSnapshotSchema = z.object({
  state: ConversationStateSchema,
  turns: z.array(ConversationTurnSchema),
  style: ResponseStyleSchema.nullable(),
  fallback: FallbackDecisionSchema.nullable(),
});

export type ConversationSnapshot = z.infer<typeof ConversationSnapshotSchema>;

export interface VerificationResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly confidence: "unknown" | "low" | "medium" | "high";
}

export function verifySnapshot(input: unknown): VerificationResult {
  const parsed = ConversationSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`),
      confidence: "unknown",
    };
  }
  const snap = parsed.data;
  const issues: string[] = [];
  if (snap.turns.length === 0) issues.push("no turns recorded");
  const lastAssistant = [...snap.turns].reverse().find((t) => t.role === "assistant");
  const evidence = lastAssistant?.evidence?.length ?? 0;
  const confidence: VerificationResult["confidence"] =
    !lastAssistant ? "unknown" :
    evidence === 0 ? "low" :
    evidence < 3 ? "medium" : "high";
  return { ok: issues.length === 0, issues, confidence };
}
