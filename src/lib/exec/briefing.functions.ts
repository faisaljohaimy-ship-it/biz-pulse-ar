/**
 * Executive Briefing — composes a 60-second operational presentation
 * from real runtime data: latest agent runs, open incidents/patrols,
 * recent events. ARIA merges findings into one recommendation via the
 * Lovable AI Gateway (gpt-5). Persists each briefing in
 * `executive_briefings`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExecutiveBriefing> => {
    const sb = context.supabase;
    const generated_at = new Date().toISOString();

    const [agentsRes, runsRes, incidentsRes, patrolsRes, permitsRes] = await Promise.all([
      sb.from("agent_definitions")
        .select("id, name, goal, enabled")
        .eq("enabled", true)
        .order("name", { ascending: true })
        .limit(6),
      sb.from("agent_runs")
        .select("agent_id, status, summary, finished_at, started_at")
        .order("started_at", { ascending: false })
        .limit(60),
      sb.from("sec_incidents")
        .select("id, severity, status, title_ar, title_en, reported_at")
        .order("reported_at", { ascending: false })
        .limit(30),
      sb.from("sec_patrols")
        .select("id, status")
        .limit(50),
      sb.from("sec_permits")
        .select("id, status, risk_level, starts_at")
        .order("starts_at", { ascending: false })
        .limit(30),
    ]);

    const agents = (agentsRes.data ?? []) as Array<{ id: string; name: string; goal: string | null }>;
    const runs = (runsRes.data ?? []) as Array<{
      agent_id: string; status: string; summary: string | null;
      finished_at: string | null; started_at: string;
    }>;
    const incidents = (incidentsRes.data ?? []) as Array<{
      id: string; severity: string; status: string;
      title_ar: string | null; title_en: string | null;
    }>;
    const patrols = (patrolsRes.data ?? []) as Array<{ status: string }>;
    const permits = (permitsRes.data ?? []) as Array<{ status: string; risk_level: string }>;

    const open = incidents.filter((i) => !["resolved", "closed", "cancelled"].includes(i.status));
    const critical = open.filter((i) => i.severity === "critical");
    const activePatrols = patrols.filter((p) => ["active", "in_progress", "started"].includes(p.status)).length;
    const openHighRiskPermits = permits.filter(
      (p) => p.risk_level === "high" && ["approved", "active", "in_progress"].includes(p.status),
    ).length;

    const segments: BriefingSegment[] = [];

    // 0–5s: ARIA welcome
    segments.push({
      at: 0,
      speaker_id: "aria",
      speaker_name: "ARIA",
      text_ar: "السلام عليكم. هذا الموجز التنفيذي الحي من إدارة الأمن الصناعي بالمنطقة الغربية.",
      text_en: "Good day. This is the live executive briefing from Industrial Security, Western Region.",
    });

    // 5–10s: Operational health summary
    segments.push({
      at: 5,
      speaker_id: "aria",
      speaker_name: "ARIA",
      text_ar: `الحالة التشغيلية مستقرة. لدينا ${open.length} بلاغًا مفتوحًا منها ${critical.length} حرج، و${activePatrols} دورية نشطة، و${openHighRiskPermits} تصاريح عالية الخطورة.`,
      text_en: `Operations are stable. ${open.length} open incidents (${critical.length} critical), ${activePatrols} active patrols, ${openHighRiskPermits} high-risk permits in effect.`,
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

    // 45–55s: ARIA merge — recommendation via gpt-5
    let recommendation: ExecutiveBriefing["recommendation"];
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Missing LOVABLE_API_KEY");
      const findings = agentsToSpeak.map((a) => {
        const latest = runs.find((r) => r.agent_id === a.id);
        return `${a.name}: ${truncate(latest?.summary ?? a.goal ?? "no data", 280)}`;
      }).join("\n");

      const prompt =
        `You are ARIA, executive AI for Industrial Security. Read these agent findings and the operational snapshot. ` +
        `Return STRICT JSON with keys title_ar, title_en, rationale_ar, rationale_en, confidence (0..1), horizon_hours (integer). ` +
        `Be specific, non-technical, executive-tone. No tables, no markdown.\n\n` +
        `Snapshot: open=${open.length} critical=${critical.length} patrols=${activePatrols} permits_high=${openHighRiskPermits}.\n\n` +
        `Findings:\n${findings}`;

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: "Reply with ONLY valid JSON. No prose, no code fences." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);
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
      const focus = critical.length > 0
        ? { ar: "التركيز على البلاغات الحرجة", en: "Focus on critical incidents" }
        : open.length > 5
        ? { ar: "تكثيف الاستجابة للبلاغات المفتوحة", en: "Intensify response on open incidents" }
        : { ar: "الإبقاء على الاستعداد التشغيلي", en: "Maintain operational readiness" };
      recommendation = {
        title_ar: focus.ar,
        title_en: focus.en,
        rationale_ar: `بناءً على ${open.length} بلاغًا مفتوحًا و${activePatrols} دورية نشطة و${openHighRiskPermits} تصريحًا عالي الخطورة، يُوصى بالتنسيق المباشر بين قيادة الحوادث والدوريات خلال الـ24 ساعة القادمة.`,
        rationale_en: `Based on ${open.length} open incidents, ${activePatrols} active patrols, and ${openHighRiskPermits} high-risk permits, coordinate Incident Command with patrol leads for the next 24 hours.`,
        confidence: critical.length > 0 ? 0.78 : 0.86,
        horizon_hours: 24,
      };
      console.warn("[briefing] gpt-5 unavailable, used deterministic recommendation:", err);
    }

    // 55–60s: closing
    segments.push({
      at: 55,
      speaker_id: "aria",
      speaker_name: "ARIA",
      text_ar: `التوصية: ${recommendation.title_ar}. مستوى الثقة ${Math.round(recommendation.confidence * 100)}٪.`,
      text_en: `Recommendation: ${recommendation.title_en}. Confidence ${Math.round(recommendation.confidence * 100)}%.`,
    });

    // Persist the briefing.
    let briefing_id: string | null = null;
    try {
      const { data: orgRow } = await sb
        .from("org_members").select("org_id").eq("user_id", context.userId).limit(1).maybeSingle();
      const org_id = orgRow?.org_id ?? null;
      if (org_id) {
        const { data: inserted } = await sb.from("executive_briefings").insert({
          org_id,
          title: recommendation.title_en,
          summary: recommendation.rationale_en,
          generated_by: context.userId,
          metadata: {
            segments,
            recommendation,
            snapshot: {
              open_incidents: open.length,
              critical_incidents: critical.length,
              active_patrols: activePatrols,
              high_risk_permits: openHighRiskPermits,
            },
          },
        }).select("id").maybeSingle();
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
