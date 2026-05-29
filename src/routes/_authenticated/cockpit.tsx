import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Crown, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cockpit")({
  component: CockpitPage,
});

const PERSONAS = [
  { key: "ceo", name_ar: "الرئيس التنفيذي", name_en: "CEO", kpis: [
    { l_ar: "الإيرادات YTD", l_en: "Revenue YTD", v: "SAR 1.42B", d: "+12.4%" },
    { l_ar: "هامش EBITDA", l_en: "EBITDA margin", v: "24.8%", d: "+1.2pp" },
    { l_ar: "حصة السوق", l_en: "Market share", v: "18.6%", d: "+0.9pp" },
    { l_ar: "قيمة الشركة", l_en: "Enterprise value", v: "SAR 12.8B", d: "+8.2%" },
  ]},
  { key: "cio", name_ar: "رئيس المعلومات", name_en: "CIO", kpis: [
    { l_ar: "توفر الأنظمة", l_en: "Systems uptime", v: "99.76%", d: "+0.06pp" },
    { l_ar: "تكاملات نشطة", l_en: "Live integrations", v: "47", d: "+3" },
    { l_ar: "ميزانية تقنية", l_en: "Tech spend", v: "SAR 312M", d: "+4.1%" },
    { l_ar: "تذاكر مفتوحة", l_en: "Open tickets", v: "184", d: "-12%" },
  ]},
  { key: "cto", name_ar: "رئيس التقنية", name_en: "CTO", kpis: [
    { l_ar: "إصدارات/أسبوع", l_en: "Releases/wk", v: "42", d: "+18%" },
    { l_ar: "زمن DORA", l_en: "DORA lead time", v: "2.4d", d: "-0.6d" },
    { l_ar: "تبني AI داخلي", l_en: "Internal AI adoption", v: "62%", d: "+14pp" },
    { l_ar: "وضع الأمن", l_en: "Security posture", v: "B+", d: "+1" },
  ]},
  { key: "coo", name_ar: "رئيس العمليات", name_en: "COO", kpis: [
    { l_ar: "كفاءة OEE", l_en: "OEE", v: "78%", d: "-2pp" },
    { l_ar: "زمن دورة", l_en: "Cycle time", v: "11.2w", d: "-0.6w" },
    { l_ar: "SLA الخدمة", l_en: "Service SLA", v: "96.4%", d: "+0.8pp" },
    { l_ar: "حوادث P1", l_en: "P1 incidents", v: "3", d: "-2" },
  ]},
];

const ALERTS = [
  { sev: "critical", t_ar: "زمن استجابة SharePoint مرتفع 412ms", t_en: "SharePoint latency elevated 412ms", who: "CIO" },
  { sev: "high", t_ar: "هبوط مفاجئ في معدل تحويل قمع البيع", t_en: "Sales funnel conversion dropped sharply", who: "CEO" },
  { sev: "medium", t_ar: "تذبذب سعر العملة قد يكلف SAR 1.8M", t_en: "FX volatility may cost SAR 1.8M", who: "CFO" },
];

const INTEL = [
  { t_ar: "إيرادات Q4 قد تتجاوز الخطة بـ 6.2٪", t_en: "Q4 revenue may beat plan by 6.2%", c: 91 },
  { t_ar: "تبني AI الداخلي يتسارع 2.3x", t_en: "Internal AI adoption accelerating 2.3x", c: 94 },
  { t_ar: "Acme أطلقت منتجاً مماثلاً — مراجعة موصى بها", t_en: "Acme launched rival product — review advised", c: 82 },
];

function CockpitPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="EXECUTIVE COCKPIT"
      title={ar ? "قمرة القيادة التنفيذية" : "Executive Cockpit"}
      subtitle={ar ? "شاشة قاعة الإدارة لـ CEO و CIO و CTO و COO." : "Boardroom view tailored for CEO, CIO, CTO, and COO."}
      actions={<NexusPill tone="violet"><Crown className="h-3 w-3" /> BOARD VIEW</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "الإيراد YTD" : "Revenue YTD"} value="SAR 1.42B" tone="emerald" />
        <NexusStat label={ar ? "صحة المؤسسة" : "Enterprise health"} value="92.4" tone="cyan" />
        <NexusStat label={ar ? "تنبيهات حرجة" : "Critical alerts"} value="1" tone="rose" />
        <NexusStat label={ar ? "قرارات تنتظر" : "Decisions pending"} value="4" tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PERSONAS.map((p) => (
          <NexusCard key={p.key} glow>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-400/10 text-violet-300">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? "قمرة" : "Cockpit"}</div>
                  <div className="text-sm font-bold text-white">{ar ? p.name_ar : p.name_en}</div>
                </div>
              </div>
              <NexusPill tone="cyan">LIVE</NexusPill>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {p.kpis.map((k, i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{ar ? k.l_ar : k.l_en}</div>
                  <div className="mt-1 text-xl font-bold text-cyan-300">{k.v}</div>
                  <div className={`text-[11px] font-bold ${k.d.startsWith("-") ? "text-rose-300" : "text-emerald-300"}`}>{k.d}</div>
                </div>
              ))}
            </div>
          </NexusCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-rose-300/80">{ar ? "تنبيهات تنفيذية" : "EXECUTIVE ALERTS"}</div>
          </div>
          <ul className="mt-3 space-y-2">
            {ALERTS.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <NexusPill tone={a.sev === "critical" ? "rose" : a.sev === "high" ? "amber" : "cyan"}>{a.sev}</NexusPill>
                <div className="min-w-0">
                  <div className="text-sm text-slate-200">{ar ? a.t_ar : a.t_en}</div>
                  <div className="text-[10px] text-slate-500">{ar ? "للمتلقي:" : "Routed to:"} {a.who}</div>
                </div>
              </li>
            ))}
          </ul>
        </NexusCard>
        <NexusCard>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">{ar ? "ذكاء استراتيجي مباشر" : "LIVE STRATEGIC INTELLIGENCE"}</div>
          </div>
          <ul className="mt-3 space-y-2">
            {INTEL.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.04] p-3">
                <span className="text-sm text-slate-200">{ar ? it.t_ar : it.t_en}</span>
                <NexusPill tone="violet">{it.c}%</NexusPill>
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>
    </NexusPage>
  );
}
