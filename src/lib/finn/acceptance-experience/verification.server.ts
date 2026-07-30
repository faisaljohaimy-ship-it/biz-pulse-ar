// Verification — evidence-grounded readiness for executive acceptance.
import { assessDemoReadiness } from "./demo-readiness.server";
import { acceptanceMetrics } from "./metrics.server";

export interface AcceptanceVerification {
  readonly ok: boolean;
  readonly demoReady: boolean;
  readonly greetingsDelivered: number;
  readonly qualityFailures: number;
  readonly disciplineTrims: number;
  readonly confidence: "unknown" | "low" | "medium" | "high";
  readonly issues: readonly string[];
}

export function verifyAcceptance(
  input: {
    hasHero?: boolean;
    hasIdentity?: boolean;
    hasConversation?: boolean;
    hasMotion?: boolean;
  } = {},
): AcceptanceVerification {
  const demo = assessDemoReadiness(input);
  const m = acceptanceMetrics();
  const issues: string[] = [...demo.reasons];
  if (m.qualityFailures > 0 && m.greetings === 0)
    issues.push("quality failures with no delivered greeting");
  const ok = demo.ok && m.qualityFailures === 0;
  return {
    ok,
    demoReady: demo.ok,
    greetingsDelivered: m.greetings,
    qualityFailures: m.qualityFailures,
    disciplineTrims: m.disciplineTrims,
    confidence: demo.confidence,
    issues,
  };
}
