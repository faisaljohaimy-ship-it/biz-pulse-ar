/**
 * Executive Briefing — composes a 60-second operational presentation
 * from real runtime data: latest agent runs, open incidents/patrols,
 * recent events. SADEED merges findings into one recommendation via Gemini.
 * Persists each briefing in
 * `executive_briefings`.
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { resolveFinnGeminiRuntime } from "@/lib/finn/gemini-provider.server";
// اسم المساعد المعروض من مصدره الوحيد (قرار المالك ٢٠٢٦/٠٨/٠٩).
import { BRAND_ASSISTANT } from "@/lib/domain";

export type BriefingSegment = {
  /** Seconds offset from briefing start. */
  at: number;
  /** Owner: "aria" or an agent id from `agent_definitions`. */
  speaker_id: string;
  speaker_name: string;
  /** Bilingual lines — UI selects per locale. */
  text_ar: string;
  text_en: string;
  /** Optional supporting numeric badges. */
  badges?: { label: string; value: string }[];
};

export type ExecutiveBriefing = {
  briefing_id: string | null;
  total_seconds: number;
  generated_at: string;
  segments: BriefingSegment[];
  recommendation: {
    title_ar: string;
    title_en: string;
    rationale_ar: string;
    rationale_en: string;
    confidence: number;
    horizon_hours: number;
  };
};

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export const generateExecutiveBriefing = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<ExecutiveBriefing> => {
    const sb = context.supabase;
    const generated_at = new Date().toISOString();

    const [agentsRes, runsRes, incidentsRes, patrolsRes, permitsRes] = await Promise.all([
      sb
        .from("agent_definitions")
        .select("id, name, goal, enabled")
        .eq("enabled", true)
        .order("name", { ascending: true })
        .limit(6),
      sb
        .from("agent_runs")
        .select("agent_id, status, summary, finished_at, started_at")
        .order("started_at", { ascending: false })
        .limit(60),
      sb
        .from("sec_incidents")
        .select("id, severity, status, title_ar, title_en, reported_at")
        .order("reported_at", { ascending: false })
        .limit(30),
      sb.from("sec_patrols").select("id, status").limit(50),
      sb
        .from("sec_permits")
        .select("id, status, risk_level, starts_at")
        .order("starts_at", { ascending: false })
        .limit(30),
    ]);

    const agents = (agentsRes.data ?? []) as Array<{
      id: string;
      name: string;
      goal: string | null;
    }>;
    const runs = (runsRes.data ?? []) as Array<{
      agent_id: string;
      status: string;
      summary: string | null;
      finished_at: string | null;
      started_at: string;
    }>;
    const incidents = (incidentsRes.data ?? []) as Array<{
      id: string;
      severity: string;
      status: string;
      title_ar: string | null;
      title_en: string | null;
    }>;
    const patrols = (patrolsRes.data ?? []) as Array<{ status: string }>;
    const permits = (permitsRes.data ?? []) as Array<{ status: string; risk_level: string }>;

    const open = incidents.filter((i) => !["resolved", "closed", "cancelled"].includes(i.status));
    const critical = open.filter((i) => i.severity === "critical");
    const activePatrols = patrols.filter((p) =>
      ["active", "in_progress", "started"].includes(p.status),
    ).length;
    const openHighRiskPermits = permits.filter(
      (p) => p.risk_level === "high" && ["approved", "active", "in_progress"].includes(p.status),
    ).length;

    const segments: BriefingSegment[] = [];

    const postureAr = critical.length
      ? "الحالة تتطلب متابعة تنفيذية عاجلة"
      : open.length > 5
        ? "الحالة تحتاج تكثيف المتابعة"
        : "الحالة التشغيلية مستقرة ضمن البيانات المتاحة";
    const postureEn = critical.length
      ? "The available data requires urgent executive attention"
      : open.length > 5
        ? "The available data requires intensified follow-up"
        : "The operational posture is stable within the available data";

    // 0–5s: SADEED welcome
    segments.push({
      at: 0,
      speaker_id: "aria",
      speaker_name: BRAND_ASSISTANT.nameAr,
      text_ar: "السلام عليكم. هذا الموجز التنفيذي للأمن الصناعي عبر المواقع المصرح بها.",
      text_en: "Good day. This is the industrial-security brief across authorised sites.",
    });

    // 5–10s: Operational health summary
    segments.push({
      at: 5,
      speaker_id: "aria",
      speaker_name: BRAND_ASSISTANT.nameAr,
      text_ar: `${postureAr}. لدينا ${open.length} بلاغًا مفتوحًا منها ${critical.length} حرج، و${activePatrols} دورية نشطة، و${openHighRiskPermits} تصاريح عالية الخطورة.`,
      text_en: `${postureEn}. ${open.length} open incidents (${critical.length} critical), ${activePatrols} active patrols, ${openHighRiskPermits} high-risk permits in effect.`,
      badges: [
        { label: "Open Incidents", value: String(open.length) },
        { label: "Critical", value: String(critical.length) },
        { label: "Active Patrols", value: String(activePatrols) },
        { label: "High-Risk Permits", value: String(openHighRiskPermits) },
      ],
    });

    // 10–45s: Each top agent (up to 5) reports its latest finding
    const agentsToSpeak = agents.slice(0, 5);
    const slotSeconds = Math.floor(35 / Math.max(1, agentsToSpeak.length));
    agentsToSpeak.forEach((a, idx) => {
      const latest = runs.find((r) => r.agent_id === a.id);
      const summary = latest?.summary?.trim() || a.goal?.trim() || "No recent findings to report.";
      const cleanedAr = truncate(summary, 220);
      const cleanedEn = truncate(summary, 220);
      segments.push({
        at: 10 + idx * slotSeconds,
        speaker_id: a.id,
        speaker_name: a.name,
        text_ar: `تقرير ${a.name}: ${cleanedAr}`,
        text_en: `${a.name} report: ${cleanedEn}`,
      });
    });

    // 45–55s: SADEED merge — recommendation via Gemini
    let recommendation: ExecutiveBriefing["recommendation"];
    try {
      const runtime = resolveFinnGeminiRuntime();
      const findings = agentsToSpeak
        .map((a) => {
          const latest = runs.find((r) => r.agent_id === a.id);
          return `${a.name}: ${truncate(latest?.summary ?? a.goal ?? "no data", 280)}`;
        })
        .join("\n");

      const prompt =
        `You are SADEED, executive industrial-security assistant for all authorised regions and sites. Read these agent findings and the operational snapshot. ` +
        `Return STRICT JSON with keys title_ar, title_en, rationale_ar, rationale_en, confidence (0..1), horizon_hours (integer). ` +
        `Be specific, non-technical, executive-tone. No tables, no markdown.\n\n` +
        `Snapshot: open=${open.length} critical=${critical.length} patrols=${activePatrols} permits_high=${openHighRiskPermits}.\n\n` +
        `Findings:\n${findings}`;

      const { text } = await generateText({
        model: runtime.provider(runtime.modelId),
        system: "Reply with ONLY valid JSON. No prose, no code fences.",
        prompt,
        maxOutputTokens: 900,
        maxRetries: 2,
      });
      const parsed = JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim());
      recommendation = {
        title_ar: String(parsed.title_ar ?? "متابعة الحالة الراهنة"),
        title_en: String(parsed.title_en ?? "Maintain current posture"),
        rationale_ar: String(parsed.rationale_ar ?? ""),
        rationale_en: String(parsed.rationale_en ?? ""),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.8))),
        horizon_hours: Math.max(1, Math.min(168, Math.round(Number(parsed.horizon_hours ?? 24)))),
      };
    } catch (err) {
      // Deterministic fallback derived strictly from observed counts.
      const focus =
        critical.length > 0
          ? { ar: "التركيز على البلاغات الحرجة", en: "Focus on critical incidents" }
          : open.length > 5
            ? {
                ar: "تكثيف الاستجابة للبلاغات المفتوحة",
                en: "Intensify response on open incidents",
              }
            : { ar: "الإبقاء على الاستعداد التشغيلي", en: "Maintain operational readiness" };
      recommendation = {
        title_ar: focus.ar,
        title_en: focus.en,
        rationale_ar: `بناءً على ${open.length} بلاغًا مفتوحًا و${activePatrols} دورية نشطة و${openHighRiskPermits} تصريحًا عالي الخطورة، يُوصى بالتنسيق المباشر بين قيادة الحوادث والدوريات خلال الـ24 ساعة القادمة.`,
        rationale_en: `Based on ${open.length} open incidents, ${activePatrols} active patrols, and ${openHighRiskPermits} high-risk permits, coordinate Incident Command with patrol leads for the next 24 hours.`,
        confidence: critical.length > 0 ? 0.78 : 0.86,
        horizon_hours: 24,
      };
      console.warn("[briefing] Gemini unavailable, used deterministic recommendation:", err);
    }

    // 55–60s: closing
    segments.push({
      at: 55,
      speaker_id: "aria",
      speaker_name: BRAND_ASSISTANT.nameAr,
      text_ar: `التوصية: ${recommendation.title_ar}. مستوى الثقة ${Math.round(recommendation.confidence * 100)}٪.`,
      text_en: `Recommendation: ${recommendation.title_en}. Confidence ${Math.round(recommendation.confidence * 100)}%.`,
    });

    // Persist the briefing (signed-in users only; guests get an ephemeral one).
    let briefing_id: string | null = null;
    try {
      const { data: orgRow } = context.userId
        ? await sb
            .from("org_members")
            .select("org_id")
            .eq("user_id", context.userId)
            .limit(1)
            .maybeSingle()
        : { data: null };
      const org_id = orgRow?.org_id ?? null;
      if (org_id && context.userId) {
        const { data: inserted } = await sb
          .from("executive_briefings")
          .insert({
            org_id,
            user_id: context.userId,
            title: recommendation.title_en,
            title_en: recommendation.title_en,
            summary: recommendation.rationale_en,
            summary_en: recommendation.rationale_en,
          })
          .select("id")
          .maybeSingle();
        briefing_id = (inserted as { id?: string } | null)?.id ?? null;
      }
    } catch (err) {
      console.warn("[briefing] persistence failed (non-fatal):", err);
    }

    return {
      briefing_id,
      total_seconds: 60,
      generated_at,
      segments,
      recommendation,
    };
  });
