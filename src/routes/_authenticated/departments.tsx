import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Building2, Users, DollarSign, Cog, Cpu, ShoppingCart, HeadphonesIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: DepartmentsPage,
});

const DEPTS = [
  {
    key: "hr",
    name_ar: "الموارد البشرية",
    name_en: "Human Resources",
    icon: Users,
    head: 142,
    score: 88,
    trend: "+3",
    kpis: [
      { l_ar: "استبقاء", l_en: "Retention", v: "89.1%", t: "92%" },
      { l_ar: "زمن التوظيف", l_en: "Time-to-hire", v: "34d", t: "28d" },
      { l_ar: "رضا الموظفين", l_en: "eNPS", v: "+42", t: "+50" },
    ],
    ai_ar: "مراجعة سلم الرواتب للهندسة سترفع الاستبقاء 2.8pp",
    ai_en: "Engineering pay band review will lift retention 2.8pp",
    status: "good",
  },
  {
    key: "fin",
    name_ar: "المالية",
    name_en: "Finance",
    icon: DollarSign,
    head: 86,
    score: 92,
    trend: "+1",
    kpis: [
      { l_ar: "هامش تشغيلي", l_en: "Op margin", v: "20.4%", t: "22%" },
      { l_ar: "DSO", l_en: "DSO", v: "42d", t: "38d" },
      { l_ar: "أتمتة AP", l_en: "AP automation", v: "78%", t: "90%" },
    ],
    ai_ar: "أتمتة 14 عملية متبقية توفر SAR 4.6M سنوياً",
    ai_en: "Automating 14 remaining processes saves SAR 4.6M/yr",
    status: "good",
  },
  {
    key: "ops",
    name_ar: "العمليات",
    name_en: "Operations",
    icon: Cog,
    head: 312,
    score: 74,
    trend: "-2",
    kpis: [
      { l_ar: "كفاءة OEE", l_en: "OEE", v: "78%", t: "85%" },
      { l_ar: "زمن دورة", l_en: "Cycle time", v: "11.2w", t: "9w" },
      { l_ar: "حوادث", l_en: "Incidents", v: "12", t: "5" },
    ],
    ai_ar: "إعادة تصميم بوابة الاعتماد توفر 4.2 ساعة لكل دورة",
    ai_en: "Approval gate redesign saves 4.2h per cycle",
    status: "warn",
  },
  {
    key: "it",
    name_ar: "تقنية المعلومات",
    name_en: "Information Technology",
    icon: Cpu,
    head: 198,
    score: 86,
    trend: "+4",
    kpis: [
      { l_ar: "توفر النظام", l_en: "Uptime", v: "99.7%", t: "99.9%" },
      { l_ar: "زمن استجابة", l_en: "MTTR", v: "38m", t: "30m" },
      { l_ar: "أمن", l_en: "Posture", v: "B+", t: "A" },
    ],
    ai_ar: "MFA متقدم على 12٪ المتبقية يرفع الوضع إلى A",
    ai_en: "Advanced MFA on remaining 12% lifts posture to A",
    status: "good",
  },
  {
    key: "proc",
    name_ar: "المشتريات",
    name_en: "Procurement",
    icon: ShoppingCart,
    head: 54,
    score: 81,
    trend: "+2",
    kpis: [
      { l_ar: "وفر الشراء", l_en: "Savings", v: "SAR 18M", t: "SAR 22M" },
      { l_ar: "زمن الموردين", l_en: "Lead time", v: "26d", t: "21d" },
      { l_ar: "تنويع المورد", l_en: "Diversity", v: "62%", t: "75%" },
    ],
    ai_ar: "إعادة التفاوض على 3 عقود كبرى توفر SAR 2.9M",
    ai_en: "Renegotiating 3 contracts saves SAR 2.9M",
    status: "good",
  },
  {
    key: "cs",
    name_ar: "خدمة العملاء",
    name_en: "Customer Service",
    icon: HeadphonesIcon,
    head: 218,
    score: 69,
    trend: "-4",
    kpis: [
      { l_ar: "CSAT", l_en: "CSAT", v: "82%", t: "90%" },
      { l_ar: "FCR", l_en: "First contact res.", v: "68%", t: "78%" },
      { l_ar: "AHT", l_en: "Avg handle time", v: "6:42", t: "5:00" },
    ],
    ai_ar: "تدريب على 3 سيناريوهات أساسية يرفع FCR 8pp",
    ai_en: "Training on top 3 scenarios lifts FCR 8pp",
    status: "alert",
  },
];

function statusTone(s: string) {
  return s === "good" ? "emerald" : s === "warn" ? "amber" : "rose";
}

function DepartmentsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="DEPARTMENT PERFORMANCE"
      title={ar ? "إدارة أداء الأقسام" : "Department Performance Management"}
      subtitle={
        ar
          ? "صحة كل قسم ومؤشراته الأساسية وتوصيات الذكاء الاصطناعي."
          : "Each department's health, KPIs, and AI recommendations."
      }
      actions={
        <NexusPill tone="cyan">
          <Building2 className="h-3 w-3" /> 6 DEPTS
        </NexusPill>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "أقسام مرصودة" : "Departments"} value="6" tone="cyan" />
        <NexusStat label={ar ? "إجمالي الموظفين" : "Headcount"} value="1,010" tone="cyan" />
        <NexusStat label={ar ? "متوسط الصحة" : "Avg health"} value="81.7" tone="emerald" />
        <NexusStat label={ar ? "تنبيهات" : "Departments at risk"} value="1" tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {DEPTS.map((d) => (
          <NexusCard key={d.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <d.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{ar ? d.name_ar : d.name_en}</div>
                  <div className="text-[11px] text-slate-500">
                    {d.head} {ar ? "موظف" : "people"}
                  </div>
                </div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-bold text-cyan-300">{d.score}</div>
                <NexusPill tone={statusTone(d.status)}>{d.trend}</NexusPill>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {d.kpis.map((k, i) => (
                <div
                  key={i}
                  className="rounded-md border border-white/5 bg-white/[0.02] p-2 text-center"
                >
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {ar ? k.l_ar : k.l_en}
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-100">{k.v}</div>
                  <div className="text-[10px] text-slate-500">/ {k.t}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.04] p-3 text-[11px] text-slate-300">
              <span className="font-bold text-violet-300">AI →</span> {ar ? d.ai_ar : d.ai_en}
            </div>
          </NexusCard>
        ))}
      </div>
    </NexusPage>
  );
}
