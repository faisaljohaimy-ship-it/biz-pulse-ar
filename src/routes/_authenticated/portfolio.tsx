import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Briefcase, Target, TrendingUp, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

const INITIATIVES = [
  {
    name_ar: "التحول الرقمي 2027",
    name_en: "Digital Transformation 2027",
    progress: 68,
    programs: 12,
    budget: "SAR 240M",
    spent: 64,
    status: "on-track",
    owner: "CIO",
    roi: "+18%",
  },
  {
    name_ar: "تبني الذكاء الاصطناعي",
    name_en: "Enterprise AI Adoption",
    progress: 42,
    programs: 8,
    budget: "SAR 95M",
    spent: 38,
    status: "at-risk",
    owner: "CTO",
    roi: "+24%",
  },
  {
    name_ar: "توسع الشرق الأوسط",
    name_en: "MENA Market Expansion",
    progress: 81,
    programs: 6,
    budget: "SAR 180M",
    spent: 79,
    status: "on-track",
    owner: "CEO",
    roi: "+31%",
  },
  {
    name_ar: "تحديث البنية التحتية",
    name_en: "Infrastructure Modernization",
    progress: 55,
    programs: 9,
    budget: "SAR 120M",
    spent: 52,
    status: "on-track",
    owner: "CIO",
    roi: "+9%",
  },
  {
    name_ar: "إعادة هيكلة العمليات",
    name_en: "Operations Re-engineering",
    progress: 29,
    programs: 5,
    budget: "SAR 60M",
    spent: 18,
    status: "delayed",
    owner: "COO",
    roi: "+12%",
  },
];

const KPIS = [
  {
    name_ar: "هامش الربح التشغيلي",
    name_en: "Operating margin",
    owner: "CFO",
    target: "22%",
    actual: "20.4%",
    trend: "+1.2pp",
    risk: "low",
    ai: "تسريع أتمتة مالية تضيف 0.8pp",
  },
  {
    name_ar: "رضا العملاء",
    name_en: "Customer NPS",
    owner: "CXO",
    target: "65",
    actual: "58",
    trend: "+4",
    risk: "med",
    ai: "إعادة تدريب فرق الدعم على 3 سيناريوهات",
  },
  {
    name_ar: "استبقاء الموظفين",
    name_en: "Employee retention",
    owner: "CHRO",
    target: "92%",
    actual: "89.1%",
    trend: "-1.4pp",
    risk: "high",
    ai: "مراجعة سلم الرواتب لقسم الهندسة",
  },
  {
    name_ar: "زمن إطلاق المنتج",
    name_en: "Time-to-market",
    owner: "CPO",
    target: "9w",
    actual: "11.2w",
    trend: "-0.6w",
    risk: "med",
    ai: "دمج 3 بوابات اعتماد متتالية",
  },
  {
    name_ar: "نسبة الأتمتة",
    name_en: "Automation coverage",
    owner: "CTO",
    target: "70%",
    actual: "62%",
    trend: "+5pp",
    risk: "low",
    ai: "نشر AI Copilot لقسمي العمليات والمشتريات",
  },
  {
    name_ar: "صحة الأمن السيبراني",
    name_en: "Cyber posture score",
    owner: "CISO",
    target: "A",
    actual: "B+",
    trend: "+1",
    risk: "med",
    ai: "تطبيق MFA المتقدم على 12% المتبقية",
  },
];

function statusTone(s: string) {
  return s === "on-track" ? "emerald" : s === "at-risk" ? "amber" : "rose";
}
function riskTone(r: string) {
  return r === "low" ? "emerald" : r === "med" ? "amber" : "rose";
}

function PortfolioPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="ENTERPRISE PORTFOLIO"
      title={ar ? "إدارة المحفظة الاستراتيجية" : "Strategic Portfolio Management"}
      subtitle={
        ar
          ? "مبادرات، برامج، مشاريع، مؤشرات أداء، وتحقق الفوائد."
          : "Initiatives, programs, projects, KPIs, and benefits realization."
      }
      actions={
        <NexusPill tone="cyan">
          <Briefcase className="h-3 w-3" /> 5 INITIATIVES
        </NexusPill>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "مبادرات نشطة" : "Active initiatives"} value="5" tone="cyan" />
        <NexusStat label={ar ? "ميزانية كلية" : "Total budget"} value="SAR 695M" tone="violet" />
        <NexusStat
          label={ar ? "فوائد محققة" : "Benefits realized"}
          value="SAR 142M"
          tone="emerald"
        />
        <NexusStat label={ar ? "العائد المتوسط" : "Avg ROI"} value="+18.8%" tone="emerald" />
      </div>

      <NexusCard glow>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "المبادرات الاستراتيجية" : "STRATEGIC INITIATIVES"}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2 text-start">{ar ? "المبادرة" : "Initiative"}</th>
                <th className="py-2 text-start">{ar ? "المالك" : "Owner"}</th>
                <th className="py-2 text-start">{ar ? "البرامج" : "Programs"}</th>
                <th className="py-2 text-start">{ar ? "الميزانية" : "Budget"}</th>
                <th className="py-2 text-start">{ar ? "التقدم" : "Progress"}</th>
                <th className="py-2 text-start">{ar ? "العائد" : "ROI"}</th>
                <th className="py-2 text-start">{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {INITIATIVES.map((i) => (
                <tr key={i.name_en} className="text-slate-200">
                  <td className="py-3 font-semibold text-white">{ar ? i.name_ar : i.name_en}</td>
                  <td className="py-3 text-slate-400">{i.owner}</td>
                  <td className="py-3">{i.programs}</td>
                  <td className="py-3">{i.budget}</td>
                  <td className="py-3 w-48">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          style={{ width: `${i.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{i.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-emerald-300">{i.roi}</td>
                  <td className="py-3">
                    <NexusPill tone={statusTone(i.status)}>{i.status}</NexusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "نموذج ملكية مؤشرات الأداء" : "KPI OWNERSHIP MODEL"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {KPIS.map((k) => (
            <div key={k.name_en} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {ar ? k.name_ar : k.name_en}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <User className="h-3 w-3" />
                    {k.owner}
                  </div>
                </div>
                <NexusPill tone={riskTone(k.risk)}>
                  {ar ? "خطر" : "Risk"} {k.risk}
                </NexusPill>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-md bg-white/[0.03] p-2">
                  <div className="text-slate-500">{ar ? "الهدف" : "Target"}</div>
                  <div className="font-bold text-slate-200">{k.target}</div>
                </div>
                <div className="rounded-md bg-white/[0.03] p-2">
                  <div className="text-slate-500">{ar ? "الفعلي" : "Actual"}</div>
                  <div className="font-bold text-cyan-300">{k.actual}</div>
                </div>
                <div className="rounded-md bg-white/[0.03] p-2">
                  <div className="text-slate-500">{ar ? "الاتجاه" : "Trend"}</div>
                  <div className="font-bold text-emerald-300">{k.trend}</div>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-violet-400/15 bg-violet-500/[0.04] p-2 text-[11px] text-slate-300">
                <span className="font-bold text-violet-300">AI:</span> {k.ai}
              </div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}
