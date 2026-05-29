import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { useEnterprisePulse, formatRelativeTime } from "@/lib/enterprise-pulse";
import { AlertTriangle, TrendingUp, ShieldAlert, Sparkles, FileText, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/briefing")({
  component: BriefingPage,
});

function BriefingPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const pulse = useEnterprisePulse();

  const summary = ar
    ? `أداء المؤسسة عند صحة ${pulse.health} مع حالة "${pulse.status === "healthy" ? "صحية" : pulse.status === "warning" ? "تحذير" : "حرجة"}". الإيراد ${pulse.kpis[0].value} (${pulse.kpis[0].delta})، تبني الذكاء الاصطناعي ${pulse.kpis[2].value}. ${pulse.alerts.length} تنبيهات نشطة، ${pulse.intel.length} إشارات استراتيجية.`
    : `Enterprise health is ${pulse.health} with "${pulse.status}" status. Revenue ${pulse.kpis[0].value} (${pulse.kpis[0].delta}), AI adoption at ${pulse.kpis[2].value}. ${pulse.alerts.length} active alerts and ${pulse.intel.length} strategic signals.`;

  const alerts = pulse.alerts.map((a) => ({
    t: ar ? a.title_ar : a.title_en,
    tone: (a.severity === "critical" ? "rose" : a.severity === "high" ? "amber" : a.severity === "medium" ? "amber" : "emerald") as "rose" | "amber" | "emerald",
    t2: a.owner,
    route: a.route,
  }));

  const risks = [
    { t: ar ? "اعتماد عالٍ على مورد سحابي واحد" : "Heavy reliance on single cloud vendor", level: ar ? "حرج" : "Critical", p: 78 },
    { t: ar ? "نقص في كفاءات الذكاء الاصطناعي" : "AI talent shortage in EMEA", level: ar ? "مرتفع" : "High", p: 65 },
    { t: ar ? "تذبذب سعر العملة في الأسواق الناشئة" : "FX volatility in emerging markets", level: ar ? "متوسط" : "Medium", p: 42 },
  ];

  const opportunities = [
    { t: ar ? "أتمتة عمليات المالية توفر 3.2M ر.س سنوياً" : "Finance automation saves SAR 3.2M / yr", p: 86 },
    { t: ar ? "توسعة منتج AI Copilot إلى قطاع B2B" : "Expand AI Copilot to B2B segment", p: 79 },
    { t: ar ? "شراكة استراتيجية مع موزع إقليمي" : "Strategic alliance with regional distributor", p: 71 },
  ];

  const actions = [
    ar ? "اعتماد ميزانية إضافية للحوسبة السحابية بقيمة 1.2M ر.س" : "Approve additional SAR 1.2M cloud compute budget",
    ar ? "تكليف فريق ضربة للإسراع في تنفيذ SAP S/4HANA" : "Form a tiger team to accelerate SAP S/4HANA",
    ar ? "إطلاق مبادرة استقطاب 12 مهندس AI" : "Launch hiring drive for 12 AI engineers",
    ar ? "تفعيل خطة استمرارية الأعمال السحابية البديلة" : "Activate secondary cloud BCP plan",
  ];

  return (
    <NexusPage
      eyebrow="EXECUTIVE BRIEFING"
      title={ar ? "موجز التنفيذيين اليومي" : "Daily Executive Briefing"}
      subtitle={ar ? "تقرير ذكي مولد بواسطة Nexus AI — تحديث مباشر كل 15 دقيقة." : "AI-generated executive intelligence, refreshed every 15 minutes."}
      actions={
        <NexusPill tone={pulse.status === "healthy" ? "emerald" : pulse.status === "warning" ? "amber" : "rose"}>
          ● LIVE · {formatRelativeTime(pulse.lastRefreshed, locale === "ar" ? "ar" : "en")}
        </NexusPill>
      }
    >
      {/* Strategic summary */}
      <NexusCard glow>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-[0.3em] text-cyan-300/80">
              {ar ? "الملخص الاستراتيجي · ARIA" : "STRATEGIC SUMMARY · ARIA"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{summary}</p>
          </div>
        </div>
      </NexusCard>

      {/* KPIs — from live pulse */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={pulse.kpis[0][ar ? "label_ar" : "label_en"]} value={pulse.kpis[0].value} hint={pulse.kpis[0].delta} tone="emerald" />
        <NexusStat label={ar ? "التنبيهات النشطة" : "Active Alerts"} value={String(pulse.alerts.length)} hint={ar ? `${pulse.alerts.filter((a) => a.severity === "critical").length} حرجة` : `${pulse.alerts.filter((a) => a.severity === "critical").length} critical`} tone="amber" />
        <NexusStat label={pulse.kpis[4][ar ? "label_ar" : "label_en"]} value={pulse.kpis[4].value} hint={pulse.kpis[4].delta} tone="rose" />
        <NexusStat label={pulse.kpis[2][ar ? "label_ar" : "label_en"]} value={pulse.kpis[2].value} hint={pulse.kpis[2].delta} tone="cyan" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Alerts */}
        <NexusCard>
          <SectionTitle icon={AlertTriangle} title={ar ? "تنبيهات تنفيذية" : "Executive Alerts"} />
          <ul className="mt-3 space-y-2">
            {alerts.map((a, i) => (
              <li key={i}>
                <Link
                  to={a.route}
                  className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
                >
                  <NexusPill tone={a.tone}>{a.t2}</NexusPill>
                  <span className="text-sm text-slate-200">{a.t}</span>
                </Link>
              </li>
            ))}
          </ul>
        </NexusCard>

        {/* Risks */}
        <NexusCard>
          <SectionTitle icon={ShieldAlert} title={ar ? "المخاطر" : "Risks"} />
          <ul className="mt-3 space-y-3">
            {risks.map((r, i) => (
              <li key={i}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-200">{r.t}</span>
                  <NexusPill tone={r.p > 70 ? "rose" : r.p > 50 ? "amber" : "slate"}>{r.level}</NexusPill>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500/70 to-amber-400/70"
                    style={{ width: `${r.p}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </NexusCard>

        {/* Opportunities */}
        <NexusCard>
          <SectionTitle icon={TrendingUp} title={ar ? "الفرص" : "Opportunities"} />
          <ul className="mt-3 space-y-3">
            {opportunities.map((o, i) => (
              <li key={i}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-200">{o.t}</span>
                  <NexusPill tone="emerald">{o.p}%</NexusPill>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-cyan-400/80"
                    style={{ width: `${o.p}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </NexusCard>

        {/* Recommended actions */}
        <NexusCard>
          <SectionTitle icon={ArrowUpRight} title={ar ? "إجراءات موصى بها" : "Recommended Actions"} />
          <ul className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-sm text-slate-200">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/40 text-[10px] font-bold text-cyan-300">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>

      {/* AI Reports */}
      <NexusCard>
        <SectionTitle icon={FileText} title={ar ? "تقارير تنفيذية مولدة بالذكاء الاصطناعي" : "AI-Generated Executive Reports"} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ar ? "ملخص الأداء الربعي Q3 2026" : "Q3 2026 Performance Brief",
            ar ? "تحليل المنافسة في السوق السعودي" : "KSA Competitive Landscape",
            ar ? "خارطة طريق تبني الذكاء الاصطناعي" : "AI Adoption Roadmap",
            ar ? "تقرير المخاطر التشغيلية" : "Operational Risk Report",
            ar ? "ملف الفرص الاستثمارية" : "Investment Opportunities Dossier",
            ar ? "موجز اجتماع مجلس الإدارة" : "Board Meeting Briefing",
          ].map((title, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[10px] font-bold tracking-widest text-cyan-300/80">
                {ar ? "تقرير" : "REPORT"} · {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-white">{title}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {ar ? "تم التوليد منذ" : "Generated"} {[2, 14, 38, 60, 90, 120][i]} {ar ? "دقيقة" : "min ago"}
              </div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/10 text-cyan-300">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{title}</div>
    </div>
  );
}
