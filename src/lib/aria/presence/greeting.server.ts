/**
 * ARIA Presence — Greeting composer.
 *
 * Combines the ExecutiveBriefing (live health + priorities) with the
 * PresenceDelta ("since your last visit") into a natural bilingual
 * greeting suitable for the copilot dock. Time-of-day aware, and
 * deduplicated per session (via the presence cursor).
 *
 * No hardcoded metrics — every number comes from the two sources.
 */
import { buildExecutiveBriefing, type ExecutiveBriefing } from "../executive-briefing.server";
import { computePresenceDelta, type PresenceDelta } from "./since-last-visit.server";
import { sanitizeVoice } from "./voice";

export interface PresenceGreeting {
  greeting_en: string;
  greeting_ar: string;
  delta: PresenceDelta;
  briefing: ExecutiveBriefing;
  timeBand: "morning" | "afternoon" | "evening" | "night";
}

function timeBand(d: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function salutation(band: PresenceGreeting["timeBand"], returning: boolean): { en: string; ar: string } {
  const en =
    band === "morning" ? "Good morning" :
    band === "afternoon" ? "Good afternoon" :
    band === "evening" ? "Good evening" : "Welcome back";
  const ar =
    band === "morning" ? "صباح الخير" :
    band === "afternoon" ? "طاب مساؤك" :
    band === "evening" ? "مساء الخير" : "مرحباً بعودتك";
  if (returning && (band === "morning" || band === "afternoon" || band === "evening")) {
    return { en: `${en}, welcome back`, ar: `${ar}، أهلاً بعودتك` };
  }
  return { en, ar };
}

export async function composePresenceGreeting(
  sessionId: string,
  orgId?: string | null,
): Promise<PresenceGreeting> {
  const [briefing, delta] = await Promise.all([
    buildExecutiveBriefing(orgId),
    computePresenceDelta(sessionId, orgId),
  ]);
  const band = timeBand(new Date());
  const { en: hi_en, ar: hi_ar } = salutation(band, delta.hasBaseline);

  const deltaEn = delta.lines_en.length
    ? `Since your last visit: ${delta.lines_en.join(", ")}.`
    : "";
  const deltaAr = delta.lines_ar.length
    ? `منذ آخر زيارة: ${delta.lines_ar.join("، ")}.`
    : "";

  const top = briefing.priorities[0];
  const priority_en = top ? ` Top priority now: ${top.title_en}.` : "";
  const priority_ar = top ? ` أولوية اللحظة: ${top.title_ar}.` : "";

  const en = sanitizeVoice(
    [
      `${hi_en}.`,
      deltaEn,
      `I have prepared today's executive briefing.${priority_en}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const ar = sanitizeVoice(
    [
      `${hi_ar}.`,
      deltaAr,
      `جهّزتُ الإيجاز التنفيذي لليوم.${priority_ar}`,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return { greeting_en: en, greeting_ar: ar, delta, briefing, timeBand: band };
}
