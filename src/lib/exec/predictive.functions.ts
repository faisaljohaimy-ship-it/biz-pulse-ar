/**
 * Predictive Insights — derives forward-looking risks for executives.
 *
 * Computes incident z-scores per site from the last 7 days, builds a
 * deterministic card per anomaly from the observed counts alone, then asks
 * Gemini to restate those cards in executive language.
 *
 * **النموذج يُصيغ ولا يُقرّر.** كل نصٍّ يعود منه يمرّ على `judgeNarration`:
 * رقمٌ ليس في الإشارة المقيسة ⇐ يسقط ذلك البند وحده إلى بطاقته الحتميّة.
 * والشدّة والثقة والدليل من القياس دائمًا، لا من ردّ النموذج. وكان النصّ
 * يُؤخذ حرفيًّا قبل هذا (`String(r.why_ar ?? "")`)، فكان اختراعٌ عدديّ
 * واحد يكفي ليصل «السبب» على شاشةٍ أمنية تنفيذية بلا أصل.
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { resolveSadeedGeminiRuntime } from "@/lib/sadeed/gemini-provider.server";
import type { Confidence, Evidence } from "@/lib/evidence/evidence";
import {
  confidenceOf,
  incidentEvidence,
  judgeNarration,
  namesOtherSite,
  siteKey,
  type RiskSignal,
} from "./risk-grounding";

export type PredictedRisk = {
  id: string;
  title_ar: string;
  title_en: string;
  why_ar: string;
  why_en: string;
  recommendation_ar: string;
  recommendation_en: string;
  /**
   * درجة اليقين — **مصطلحٌ لا نسبة مئوية.**
   *
   * كانت `number` تُعرض «ثقة ٨٧٪». ومصدرها على مسار النموذج رقمٌ يقوله
   * النموذج عن نفسه، وعلى مسار المحاكاة ثابتٌ مكتوب — وكلاهما يُرسم
   * كأنه قياس. النسبة توحي بدقّةٍ لا مصدر لها (المادة ٢٧)، فحلّت محلّها
   * العدّات المرصودة في `signal` وهي أصدق وأنفع.
   */
  confidence: Confidence;
  horizon_hours: number;
  severity: "low" | "medium" | "high";
  /** العدّات المقيسة التي قام عليها البند — تُعرض بدل النسبة. */
  signal?: RiskSignal;
  /** ما يُسنَد إليه البند. فارغٌ لا يقع: كل بند يخرج من هنا مُسنَد. */
  evidence: readonly Evidence[];
  /** كيف صيغ «السبب»: قياسٌ حتميّ · صياغةُ نموذجٍ مفحوصة · مرجعٌ مدمج. */
  narration: "measured" | "model_checked" | "reference";
};

export const getPredictedRisks = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<PredictedRisk[]> => {
    const { buildRiskSimulation, resilient } = await import("./showcase-simulation.server");
    return resilient(
      "predicted-risks",
      () => fetchPredictedRisks(context.supabase),
      () => false,
      () => buildRiskSimulation(),
    );
  });

async function fetchPredictedRisks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
): Promise<PredictedRisk[]> {
  {
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

    if (anomalies.length === 0) {
      // Showcase doctrine: with no observable ops data at all, serve the
      // built-in simulated forecast so the rail is never empty; with real
      // (calm) data the honest «ضمن المعدّل» empty state still shows.
      const hasAnyOpsData = incidents.length > 0;
      if (!hasAnyOpsData) {
        const { buildRiskSimulation } = await import("./showcase-simulation.server");
        return buildRiskSimulation();
      }
      return [];
    }

    // ── البطاقة الحتميّة: مبنيّة من العدّات المرصودة وحدها ────────────────
    // تُبنى أوّلًا لأنها **المرجع**: كل بندٍ من النموذج يُقاس إليها، وما
    // يسقط منه يعود إليها بعينها. فلا يبقى موقعٌ بلا بطاقة.
    const observedAt = new Date().toISOString();
    const deterministic = anomalies.map((a): PredictedRisk => {
      const signal: RiskSignal = {
        siteId: a.siteId,
        total7d: a.total,
        critical7d: a.critical,
        last24h: a.recent24,
        z: a.z,
      };
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
        confidence: confidenceOf(signal),
        horizon_hours: 24,
        severity: sev,
        signal,
        evidence: [incidentEvidence(signal, observedAt)],
        narration: "measured",
      };
    });

    // Try Gemini for executive language; fall back deterministically.
    try {
      const runtime = resolveSadeedGeminiRuntime();
      const signal = anomalies
        .map(
          (a, i) =>
            `${i + 1}. site=${a.site?.name_en} (${a.site?.code}) total7d=${a.total} critical7d=${a.critical} last24h=${a.recent24} z=${a.z.toFixed(2)}`,
        )
        .join("\n");

      const { text } = await generateText({
        model: runtime.provider(runtime.modelId),
        system:
          'Reply with ONLY valid JSON: {"risks":[{site,title_ar,title_en,why_ar,why_en,recommendation_ar,recommendation_en,horizon_hours}]}. ' +
          "`site` MUST be copied verbatim from the `site=` value of the input line it describes. No prose.",
        prompt: `Translate this measured anomaly signal into executive-language industrial-security risks (one per line item) across the authorised sites. Use plain Arabic and English. No table names, no IDs. Do not add facts beyond the signal.\n\n${signal}`,
        maxOutputTokens: 1500,
        maxRetries: 2,
      });
      const parsed = JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim());
      const raw: Record<string, unknown>[] = Array.isArray(parsed.risks) ? parsed.risks : [];

      // ── المطابقة بالهويّة لا بالترتيب ──────────────────────────────────
      // كانت `raw[idx]`، وهي تفترض أن النموذج يُعيد البنود بترتيب الإشارة.
      // ولو أعاد ترتيبها لالتصقت صياغةُ موقعٍ بعدّات موقعٍ آخر — والفحص
      // العدديّ يلتقط أكثر الحالات لأن العدّات تختلف، **لكن موقعين
      // بعدّاتٍ متطابقة يمرّان**، فيُعرض اسمُ موقعٍ فوق أرقام غيره. وذلك
      // أسوأ من رفض الصياغة: بلاغٌ صحيح منسوبٌ إلى المكان الخطأ.
      // فالمطابقة الآن على اسم الموقع الذي يُلزَم النموذجُ بنسخه حرفيًّا،
      // وما لا يُطابَق يبقى على بطاقته الحتميّة.
      const bySite = new Map<string, Record<string, unknown>>();
      for (const r of raw) {
        const k = siteKey(r?.site);
        if (k.length > 0 && !bySite.has(k)) bySite.set(k, r);
      }
      const allSiteNames = anomalies.flatMap((a) => [a.site!.name_ar, a.site!.name_en]);

      // ── الفحص: صياغةُ النموذج مقبولة، ووقائعُه العددية لا ──────────────
      // لكل بند: البطاقة الحتميّة موجودة أصلًا. فإن حمل نصّ النموذج رقمًا
      // ليس في إشارة ذلك الموقع، **سقط هذا البند وحده** إلى الحتميّ —
      // ولا يسقط الباقي معه، ولا يُعرض رقمٌ بلا أصل.
      const risks = deterministic.map((base, idx) => {
        const a = anomalies[idx];
        const r = bySite.get(siteKey(a.site!.name_en));
        if (!r || !base.signal) return base;
        const ownNames = [a.site!.name_ar, a.site!.name_en];
        const why_ar = String(r.why_ar ?? "");
        const why_en = String(r.why_en ?? "");
        const title_ar = String(r.title_ar ?? "");
        const title_en = String(r.title_en ?? "");
        const rec_ar = String(r.recommendation_ar ?? "");
        const rec_en = String(r.recommendation_en ?? "");
        const horizon = Math.max(1, Math.min(168, Math.round(Number(r.horizon_hours ?? 24))));
        const texts = [title_ar, title_en, why_ar, why_en, rec_ar, rec_en];
        // حارسٌ ثانٍ: قد يُصيب النموذج في حقل `site` ويخطئ في المتن.
        // والاسم في المتن هو ما يقرؤه المسؤول، لا الحقل.
        if (namesOtherSite(texts, ownNames, allSiteNames)) {
          console.warn(
            `[predictive] رُفضت صياغة النموذج للموقع ${base.signal.siteId} — تذكر موقعًا آخر في متنها`,
          );
          return base;
        }
        const verdict = judgeNarration(texts, base.signal, horizon);
        if (!verdict.accepted) {
          console.warn(
            `[predictive] رُفضت صياغة النموذج للموقع ${base.signal.siteId} — أرقامٌ بلا أصل: ${verdict.ungrounded.join(", ")}`,
          );
          return base;
        }
        return {
          ...base,
          title_ar,
          title_en,
          why_ar,
          why_en,
          recommendation_ar: rec_ar,
          recommendation_en: rec_en,
          horizon_hours: horizon,
          // الشدّة من القياس لا من النموذج: تصنيفُ الخطورة قرارٌ تشغيليّ
          // مبنيٌّ على عدّ البلاغات الحرجة، لا وصفٌ لغويّ يُعاد صياغته.
          severity: base.severity,
          // والثقة تبقى مشتقّة من العيّنة — لا رقمًا يقوله النموذج عن نفسه.
          confidence: base.confidence,
          narration: "model_checked" as const,
        };
      });
      if (risks.length > 0) return risks;
    } catch (err) {
      console.warn("[predictive] gateway unavailable, using deterministic risks:", err);
    }

    return deterministic;
  }
}
