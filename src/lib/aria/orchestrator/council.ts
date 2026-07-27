/**
 * FINN Council of Nine — the canonical roster of nine specialist agents
 * that are permanently linked to FINN (the Chief `executive_brain`).
 *
 * Every agent listed here MUST be registered in `./agents.ts` at boot.
 * The list is enforced at runtime by `assertCouncilOfNine()`.
 *
 * The nine specialists are chosen to cover the full executive surface:
 *   1. planning       — التخطيط
 *   2. risk           — المخاطر
 *   3. recommendation — التوصيات
 *   4. operations     — العمليات
 *   5. compliance     — الالتزام
 *   6. analytics      — التحليلات
 *   7. briefing       — الإحاطات
 *   8. simulation     — المحاكاة
 *   9. reports        — وكيل التقارير
 *
 * Governance: see FINN_MASTER_CONSTITUTION, Article 30.
 */
import type { AgentId } from "./types";
import { hasAgent } from "./registry";

export const FINN_COUNCIL_OF_NINE: readonly AgentId[] = [
  "planning",
  "risk",
  "recommendation",
  "operations",
  "compliance",
  "analytics",
  "briefing",
  "simulation",
  "reports",
] as const;

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
};

/** Throws when the registry is missing any of the nine council agents. */
export function assertCouncilOfNine(): void {
  const missing = FINN_COUNCIL_OF_NINE.filter((id) => !hasAgent(id));
  if (missing.length) {
    throw new Error(
      `[finn:council] Missing council specialists: ${missing.join(", ")}. ` +
        `All nine agents must be registered before boot completes.`,
    );
  }
}
