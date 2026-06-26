// ============================================================================
// ARIA — Incident Analysis (server-only, calls Lovable AI Gateway / gpt-5)
// Returns bilingual summary + risk score + concrete operational recommendations.
// Falls back to a deterministic heuristic on failure so the workflow never
// blocks incident registration.
// ============================================================================
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const MODEL = "openai/gpt-5";

export type AriaIncidentInput = {
  ref: string;
  category: string;
  title_ar: string;
  title_en?: string | null;
  severity: string;
  priority?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  owner?: string | null;
  notes?: string | null;
  site_name?: string | null;
};

export type AriaIncidentAnalysis = {
  summary_ar: string;
  summary_en: string;
  risk_score: number;
  recommendations: string[];
  immediate_actions: string[];
  source: "gpt-5" | "heuristic";
};

function provider() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

function heuristic(inc: AriaIncidentInput): AriaIncidentAnalysis {
  const sev: Record<string, number> = { low: 20, medium: 45, high: 70, critical: 90 };
  const prio: Record<string, number> = { low: 0, medium: 5, high: 10, critical: 15 };
  const cat = (inc.category || "").toLowerCase();
  const catBoost = ["intrusion", "fire", "explosion", "weapon", "theft"].some((k) => cat.includes(k)) ? 10 : 0;
  const risk = Math.min(100, (sev[inc.severity] ?? 40) + (prio[inc.priority ?? "medium"] ?? 5) + catBoost);
  const recs: string[] = [];
  const acts: string[] = [];
  if (risk >= 75) { acts.push("تصعيد فوري للقيادة وتفعيل غرفة العمليات"); }
  if (inc.severity === "critical" || inc.severity === "high") acts.push("إنشاء أمر عمل تصحيحي بأولوية حرجة");
  if (!inc.assigned_to) acts.push("تعيين مسؤول مباشر خلال 15 دقيقة");
  if (cat.includes("fire")) acts.push("إخطار الدفاع المدني وفريق السلامة");
  if (cat.includes("intrusion")) acts.push("تفعيل البروتوكول الأمني للمحيط ومراجعة كاميرات البوابة");
  recs.push("توثيق جميع الإجراءات في الخط الزمني للبلاغ");
  recs.push("جمع الأدلة والمرفقات قبل إغلاق البلاغ");
  if (acts.length === 0) acts.push("متابعة دورية كل ساعة حتى السيطرة");
  return {
    summary_ar: `بلاغ ${inc.ref} — ${inc.category}، خطورة ${inc.severity}، مخاطر ${risk}/100. ${inc.assigned_to ? `موكَّل إلى ${inc.assigned_to}.` : "لم يُعيَّن مسؤول."}`,
    summary_en: `Incident ${inc.ref} — ${inc.category}, severity ${inc.severity}, risk ${risk}/100. ${inc.assigned_to ? `Assigned to ${inc.assigned_to}.` : "No owner assigned."}`,
    risk_score: risk,
    recommendations: recs,
    immediate_actions: acts,
    source: "heuristic",
  };
}

const SYSTEM_PROMPT = `You are ARIA, the Executive AI for an Industrial Security Operations Center (Western Region, Saudi Arabia).
You analyse incoming security incidents and return ONLY a JSON object — no prose, no markdown fences.
The JSON shape MUST be:
{
  "summary_ar": "بلاغ … (1-2 جمل تنفيذية بالعربية)",
  "summary_en": "Concise 1-2 sentence executive summary in English",
  "risk_score": <integer 0..100, calibrated to severity/category/context>,
  "recommendations": ["recommendation 1", "recommendation 2", "..."],
  "immediate_actions": ["action 1", "action 2", "..."]
}
Rules:
- recommendations: 2-4 short bullet-style items in Arabic, focused on investigation, evidence, and follow-up.
- immediate_actions: 1-4 short bullet-style items in Arabic, focused on what to DO in the next 15-60 minutes.
- risk_score: severity weight (low=20, medium=45, high=70, critical=90) + priority weight + category boost (intrusion/fire/weapon/theft = +10). Clamp 0..100.
- If category mentions fire → must include civil defense notification.
- If category mentions intrusion → must include perimeter/CCTV protocol.
- If no owner assigned → must include "تعيين مسؤول مباشر".
- Never invent facts; if information is missing, write the action that gathers it.
Return RAW JSON only.`;

export async function ariaAnalyseIncident(
  inc: AriaIncidentInput,
  opts: { timeoutMs?: number } = {},
): Promise<AriaIncidentAnalysis> {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  try {
    const p = provider();
    const userPayload = {
      ref: inc.ref,
      category: inc.category,
      title_ar: inc.title_ar,
      title_en: inc.title_en ?? null,
      severity: inc.severity,
      priority: inc.priority ?? "medium",
      status: inc.status ?? "open",
      assigned_to: inc.assigned_to ?? null,
      owner: inc.owner ?? null,
      site: inc.site_name ?? null,
      notes: inc.notes ?? null,
    };
    const aiPromise = generateText({
      model: p(MODEL),
      maxOutputTokens: 600,
      system: SYSTEM_PROMPT,
      prompt: `Analyse this incident and return the JSON object:\n${JSON.stringify(userPayload, null, 2)}`,
    });
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("aria_timeout")), timeoutMs),
    );
    const { text } = await Promise.race([aiPromise, timeout]);
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<AriaIncidentAnalysis>;
    const risk = Math.max(0, Math.min(100, Math.round(Number(parsed.risk_score) || 0)));
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.filter((r): r is string => typeof r === "string").slice(0, 6) : [];
    const acts = Array.isArray(parsed.immediate_actions) ? parsed.immediate_actions.filter((r): r is string => typeof r === "string").slice(0, 6) : [];
    if (!parsed.summary_ar || !recs.length) throw new Error("aria_invalid_response");
    return {
      summary_ar: String(parsed.summary_ar).slice(0, 600),
      summary_en: String(parsed.summary_en ?? "").slice(0, 600),
      risk_score: risk || heuristic(inc).risk_score,
      recommendations: recs,
      immediate_actions: acts.length ? acts : heuristic(inc).immediate_actions,
      source: "gpt-5",
    };
  } catch (err) {
    console.error("[oms-aria] gpt-5 analysis failed → heuristic fallback", err);
    return heuristic(inc);
  }
}
