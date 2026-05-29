import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { DollarSign, Zap, ShieldCheck, TrendingUp, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/outcomes")({
  component: OutcomesPage,
});

const OUTCOMES = [
  { key: "cost", icon: DollarSign, color: "emerald", label_ar: "وفر التكاليف", label_en: "Cost savings", value: "SAR 38.4M", delta: "+12.6%", from: "Q1 26", to: "Q2 26", drivers_ar: ["أتمتة 14 عملية مالية", "إعادة التفاوض على 3 عقود", "ترشيد طبقة API"], drivers_en: ["14 finance processes automated", "3 contracts renegotiated", "API tier rationalization"] },
  { key: "prod", icon: Zap, color: "cyan", label_ar: "نمو الإنتاجية", label_en: "Productivity gains", value: "+14.2%", delta: "+3.1pp", from: "Q1 26", to: "Q2 26", drivers_ar: ["نشر AI Copilot لـ 8 أقسام", "تقليل اجتماعات بنسبة 22٪", "أدوات تعاون موحدة"], drivers_en: ["AI Copilot in 8 depts", "Meetings -22%", "Unified collab tools"] },
  { key: "auto", icon: Bot, color: "violet", label_ar: "أثر الأتمتة", label_en: "Automation impact", value: "2,140 hr/mo", delta: "+18%", from: "Q1 26", to: "Q2 26", drivers_ar: ["86 سير عمل نشط", "نجاح 94.7٪", "نشر إضافي للعمليات"], drivers_en: ["86 active workflows", "94.7% success", "Additional ops rollout"] },
  { key: "rev", icon: TrendingUp, color: "cyan", label_ar: "أثر الإيراد", label_en: "Revenue impact", value: "+SAR 64M", delta: "+8.2%", from: "Q1 26", to: "Q2 26", drivers_ar: ["توسع الإمارات", "تحسين قمع التحويل", "تجديد عقود الفرص"], drivers_en: ["UAE expansion", "Funnel optimization", "Opportunity contract renewals"] },
  { key: "risk", icon: ShieldCheck, color: "emerald", label_ar: "تقليل المخاطر", label_en: "Risk reduction", value: "-38%", delta: "-12pp", from: "Q1 26", to: "Q2 26", drivers_ar: ["تحوط العملة", "ضوابط ZTNA", "مراجعة وصول ربع سنوية"], drivers_en: ["FX hedging", "ZTNA controls", "Quarterly access review"] },
];

const TIMELINE = [
  { q: "Q3 2025", v_ar: "إطلاق Nexus وقياس خط الأساس", v_en: "Nexus launch & baseline measurement", amt: "—" },
  { q: "Q4 2025", v_ar: "بدء أتمتة المالية وحوكمة التكاملات", v_en: "Finance automation & integration governance kickoff", amt: "+SAR 4.2M" },
  { q: "Q1 2026", v_ar: "نشر AI Copilot لـ 4 أقسام", v_en: "AI Copilot rolled out to 4 depts", amt: "+SAR 11.8M" },
  { q: "Q2 2026", v_ar: "توسع الإمارات + إعادة هيكلة العقود", v_en: "UAE expansion + contract restructuring", amt: "+SAR 22.4M" },
  { q: "Q3 2026", v_ar: "متوقع: نشر العمليات + S/4HANA", v_en: "Forecast: Ops rollout + S/4HANA", amt: "+SAR 18M" },
];

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  cyan: { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-400/30" },
  violet: { text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-400/30" },
};

function OutcomesPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="BUSINESS OUTCOMES"
      title={ar ? "تتبع نتائج الأعمال" : "Business Outcome Tracking"}
      subtitle={ar ? "الأثر الحقيقي عبر التكلفة، الإنتاجية، الأتمتة، الإيراد، والمخاطر." : "Real impact across cost, productivity, automation, revenue, and risk."}
      actions={<NexusPill tone="emerald"><TrendingUp className="h-3 w-3" /> +SAR 102.4M YTD</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "أثر مالي محقق" : "Realized financial impact"} value="SAR 102.4M" tone="emerald" />
        <NexusStat label={ar ? "ساعات موفرة/شهر" : "Hours saved/mo"} value="2,140" tone="violet" />
        <NexusStat label={ar ? "نمو الإنتاجية" : "Productivity growth"} value="+14.2%" tone="cyan" />
        <NexusStat label={ar ? "تقليل المخاطر" : "Risk reduction"} value="-38%" tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {OUTCOMES.map((o) => {
          const c = colorMap[o.color];
          return (
            <NexusCard key={o.key} glow>
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${c.border} ${c.bg} ${c.text}`}>
                  <o.icon className="h-5 w-5" />
                </div>
                <NexusPill tone={o.color === "emerald" ? "emerald" : o.color === "cyan" ? "cyan" : "violet"}>{o.delta}</NexusPill>
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">{ar ? o.label_ar : o.label_en}</div>
              <div className={`mt-1 text-3xl font-bold ${c.text}`}>{o.value}</div>
              <div className="mt-1 text-[10px] text-slate-500">{o.from} → {o.to}</div>
              <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-300">
                {(ar ? o.drivers_ar : o.drivers_en).map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-1 h-1 w-1 rounded-full ${c.bg.replace("/10", "")}`} />
                    {d}
                  </li>
                ))}
              </ul>
            </NexusCard>
          );
        })}
      </div>

      <NexusCard>
        <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{ar ? "خط زمن تحقق الفوائد" : "BENEFITS REALIZATION TIMELINE"}</div>
        <div className="mt-4 space-y-3">
          {TIMELINE.map((t, i) => (
            <div key={t.q} className="flex items-center gap-3">
              <div className="w-20 text-[11px] font-mono font-bold text-cyan-300">{t.q}</div>
              <div className="relative flex-1">
                <div className="h-px bg-white/10" />
                <div className={`absolute -top-1 h-2 w-2 rounded-full ${i < 4 ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-cyan-400/60"}`} />
                <div className="mt-2 text-sm text-slate-200">{ar ? t.v_ar : t.v_en}</div>
              </div>
              <div className={`w-28 text-end text-sm font-bold ${i < 4 ? "text-emerald-300" : "text-slate-500"}`}>{t.amt}</div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}
