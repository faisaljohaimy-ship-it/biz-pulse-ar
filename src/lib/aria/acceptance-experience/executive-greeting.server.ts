// Executive greeting composer — bilingual, evidence-grounded, no fabrication.
import { ExecutiveGreetingInputSchema } from "./contracts";
import type { ExecutiveGreeting, ExecutiveGreetingInput } from "./types";

export function composeExecutiveGreeting(rawInput: ExecutiveGreetingInput): ExecutiveGreeting {
  const input = ExecutiveGreetingInputSchema.parse(rawInput);
  const name = input.userDisplayName?.trim();
  const usedHealth = !!input.systemHealth && input.systemHealth !== "unknown";
  const usedAlerts = !!(input.topAlerts && input.topAlerts.length);
  const usedPriorities = !!(input.priorities && input.priorities.length);

  const parts: string[] = [];
  if (input.lang === "ar") {
    parts.push(name ? `أهلاً ${name}.` : "أهلاً بك.");
    if (usedHealth) {
      const map = { green: "مستقرة", amber: "تحت المراقبة", red: "تتطلب انتباهك", unknown: "" } as const;
      parts.push(`حالة المنظومة: ${map[input.systemHealth as "green" | "amber" | "red"]}.`);
    }
    if (usedAlerts) parts.push(`أهم التنبيهات: ${input.topAlerts!.slice(0, 3).join("، ")}.`);
    if (usedPriorities) parts.push(`أولويات اليوم: ${input.priorities!.slice(0, 3).join("، ")}.`);
    const nextAction = "هل نبدأ بالإحاطة التنفيذية؟";
    parts.push(nextAction);
    return { text: parts.join(" "), lang: "ar", nextAction, usedHealth, usedAlerts, usedPriorities };
  }

  parts.push(name ? `Welcome, ${name}.` : "Welcome.");
  if (usedHealth) {
    const map = { green: "stable", amber: "under watch", red: "needs your attention", unknown: "" } as const;
    parts.push(`System health: ${map[input.systemHealth as "green" | "amber" | "red"]}.`);
  }
  if (usedAlerts) parts.push(`Top alerts: ${input.topAlerts!.slice(0, 3).join("; ")}.`);
  if (usedPriorities) parts.push(`Today's priorities: ${input.priorities!.slice(0, 3).join("; ")}.`);
  const nextAction = "Shall we start with the executive briefing?";
  parts.push(nextAction);
  return { text: parts.join(" "), lang: "en", nextAction, usedHealth, usedAlerts, usedPriorities };
}
