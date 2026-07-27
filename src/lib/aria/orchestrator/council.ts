/**
 * FINN Council of Ten — the canonical roster of ten specialist agents
 * that are permanently linked to FINN (the Chief `executive_brain`).
 *
 * Every agent listed here MUST be registered in `./agents.ts` at boot.
 * The list is enforced at runtime by `assertCouncilOfTen()`.
 *
 * The ten specialists are chosen to cover the full executive surface:
 *   1. planning       — التخطيط
 *   2. risk           — المخاطر
 *   3. recommendation — التوصيات
 *   4. operations     — العمليات
 *   5. compliance     — الالتزام
 *   6. analytics      — التحليلات
 *   7. briefing       — الإحاطات
 *   8. simulation     — المحاكاة
 *   9. reports        — وكيل التقارير
 *  10. knowledge      — وكيل المعرفة (RAG retrieval)
 *
 * Governance: see FINN_MASTER_CONSTITUTION, Article 30.
 */
import type { AgentId } from "./types";
import { hasAgent } from "./registry";

export const FINN_COUNCIL_OF_TEN: readonly AgentId[] = [
  "planning",
  "risk",
  "recommendation",
  "operations",
  "compliance",
  "analytics",
  "briefing",
  "simulation",
  "reports",
  "knowledge",
] as const;

/** Back-compat alias — do not use in new code. */
export const FINN_COUNCIL_OF_NINE = FINN_COUNCIL_OF_TEN;

export const FINN_COUNCIL_LABELS_AR: Record<string, string> = {
  planning: "التخطيط",
  risk: "المخاطر",
  recommendation: "التوصيات",
  operations: "العمليات",
  compliance: "الالتزام",
  analytics: "التحليلات",
  briefing: "الإحاطات",
  simulation: "المحاكاة",
  reports: "وكيل التقارير",
  knowledge: "وكيل المعرفة",
};

/** Throws when the registry is missing any of the ten council agents. */
export function assertCouncilOfTen(): void {
  const missing = FINN_COUNCIL_OF_TEN.filter((id) => !hasAgent(id));
  if (missing.length) {
    throw new Error(
      `[finn:council] Missing council specialists: ${missing.join(", ")}. ` +
        `All ten agents must be registered before boot completes.`,
    );
  }
}

/** Back-compat alias — do not use in new code. */
export const assertCouncilOfNine = assertCouncilOfTen;
