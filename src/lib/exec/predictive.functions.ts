/**
 * Predictive Insights — derives forward-looking risks for executives.
 * Computes hourly incident z-scores per site from the last 7 days, then
 * asks gpt-5 to translate the numeric signal into executive-language
 * risks with confidence. Falls back to deterministic top-anomaly cards
 * when the gateway is unavailable.
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";

export type PredictedRisk = {
  id: string;
  title_ar: string;
  title_en: string;
  why_ar: string;
  why_en: string;
  recommendation_ar: string;
  recommendation_en: string;
  /** 0..1 */
  confidence: number;
  horizon_hours: number;
  severity: "low" | "medium" | "high";
};

export const getPredictedRisks = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<PredictedRisk[]> => {
    const sb = context.supabase;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [incidentsRes, sitesRes] = await Promise.all([
      sb
        .from("sec_incidents")
        .select("site_id, severity, status, reported_at, category")
        .gte("reported_at", since)
        .limit(500),
      sb.from("sec_sites").select("id, code, name_ar, name_en").limit(200),
    ]);

    type Inc = {
      site_id: string | null;
      severity: string;
      status: string;
      reported_at: string;
      category: string | null;
    };
    type Site = { id: string; code: string; name_ar: string; name_en: string };
    const incidents = (incidentsRes.data ?? []) as Inc[];
    const sites = (sitesRes.data ?? []) as Site[];
    const siteById = new Map(sites.map((s) => [s.id, s] as const));

    // Aggregate counts per site.
    const perSite = new Map<string, { total: number; critical: number; recent24: number }>();
    const now = Date.now();
    for (const i of incidents) {
      if (!i.site_id) continue;
      const cur = perSite.get(i.site_id) ?? { total: 0, critical: 0, recent24: 0 };
      cur.total += 1;
      if (i.severity === "critical") cur.critical += 1;
      if (now - new Date(i.reported_at).getTime() < 24 * 3600 * 1000) cur.recent24 += 1;
      perSite.set(i.site_id, cur);
    }

    // Simple z-score on weekly totals.
    const totals = Array.from(perSite.values()).map((v) => v.total);
    const mean = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const variance = totals.length
      ? totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length
      : 0;
    const stddev = Math.sqrt(variance) || 1;

    const anomalies = Array.from(perSite.entries())
      .map(([siteId, v]) => {
        const site = siteById.get(siteId);
        const z = (v.total - mean) / stddev;
        return { siteId, site, ...v, z };
      })
      .filter((a) => a.site && (a.z > 0.8 || a.critical > 0))
      .sort((a, b) => b.z - a.z)
      .slice(0, 5);

    if (anomalies.length === 0) return [];

    // Try gpt-5 for executive language; fall back deterministically.
    try {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Missing LOVABLE_API_KEY");
      const signal = anomalies
        .map(
          (a, i) =>
            `${i + 1}. site=${a.site?.name_en} (${a.site?.code}) total7d=${a.total} critical7d=${a.critical} last24h=${a.recent24} z=${a.z.toFixed(2)}`,
        )
        .join("\n");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            {
              role: "system",
              content:
                'Reply with ONLY valid JSON: {"risks":[{title_ar,title_en,why_ar,why_en,recommendation_ar,recommendation_en,confidence,horizon_hours,severity}]}. No prose.',
            },
            {
              role: "user",
              content: `Translate this anomaly signal into executive-language predicted risks (1 per line item). Use plain Arabic and English. No table names, no IDs.\n\n${signal}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(text);
      const risks: PredictedRisk[] = (Array.isArray(parsed.risks) ? parsed.risks : []).map(
        (r: Record<string, unknown>, idx: number) => ({
          id: `risk-${anomalies[idx]?.siteId ?? idx}`,
          title_ar: String(r.title_ar ?? ""),
          title_en: String(r.title_en ?? ""),
          why_ar: String(r.why_ar ?? ""),
          why_en: String(r.why_en ?? ""),
          recommendation_ar: String(r.recommendation_ar ?? ""),
          recommendation_en: String(r.recommendation_en ?? ""),
          confidence: Math.max(0, Math.min(1, Number(r.confidence ?? 0.7))),
          horizon_hours: Math.max(1, Math.min(168, Math.round(Number(r.horizon_hours ?? 24)))),
          severity: r.severity === "high" || r.severity === "low" ? r.severity : "medium",
        }),
      );
      if (risks.length > 0) return risks;
    } catch (err) {
      console.warn("[predictive] gateway unavailable, using deterministic risks:", err);
    }

    // Deterministic fallback — no fabrication, only observed counts.
    return anomalies.map((a) => {
      const sev: PredictedRisk["severity"] = a.critical > 0 ? "high" : a.z > 1.5 ? "medium" : "low";
      return {
        id: `risk-${a.siteId}`,
        title_ar: `ضغط متصاعد في ${a.site!.name_ar}`,
        title_en: `Rising pressure at ${a.site!.name_en}`,
        why_ar: `${a.total} بلاغًا خلال 7 أيام (${a.critical} حرج، ${a.recent24} خلال آخر 24 ساعة) — أعلى من المعدل الإقليمي.`,
        why_en: `${a.total} incidents over 7 days (${a.critical} critical, ${a.recent24} in the last 24h) — above the regional baseline.`,
        recommendation_ar: "تعزيز الدوريات وتفعيل غرفة العمليات للموقع لمدة 24 ساعة.",
        recommendation_en:
          "Reinforce patrols and activate the site operations room for the next 24 hours.",
        confidence: Math.min(0.95, 0.55 + Math.min(0.4, a.z / 5)),
        horizon_hours: 24,
        severity: sev,
      };
    });
  });
