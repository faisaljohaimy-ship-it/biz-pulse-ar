import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Rocket, Brain, GitBranch, Gauge } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transformation")({
  component: TransformationPage,
});

const PROGRAMS = [
  { name_ar: "نشر AI Copilot على المؤسسة", name_en: "Enterprise AI Copilot rollout", progress: 64, adopt: 72, savings: "SAR 9.2M", phase: "scale" },
  { name_ar: "أتمتة سير العمل المالي", name_en: "Finance workflow automation", progress: 82, adopt: 88, savings: "SAR 6.4M", phase: "optimize" },
  { name_ar: "ترحيل البنية إلى السحابة", name_en: "Cloud migration wave 3", progress: 41, adopt: 36, savings: "SAR 4.8M", phase: "build" },
  { name_ar: "تحديث ERP إلى S/4HANA", name_en: "ERP upgrade to S/4HANA", progress: 28, adopt: 14, savings: "SAR 12M", phase: "design" },
  { name_ar: "مركز الكفاءة في البيانات", name_en: "Data CoE establishment", progress: 56, adopt: 48, savings: "SAR 3.1M", phase: "build" },
];

const MATURITY = [
  { dim_ar: "الاستراتيجية", dim_en: "Strategy", v: 4.2 },
  { dim_ar: "البيانات", dim_en: "Data", v: 3.6 },
  { dim_ar: "التقنية", dim_en: "Technology", v: 3.9 },
  { dim_ar: "العمليات", dim_en: "Process", v: 3.1 },
  { dim_ar: "الأشخاص", dim_en: "People", v: 3.4 },
  { dim_ar: "الحوكمة", dim_en: "Governance", v: 4.0 },
];

const CHANGE = [
  { t_ar: "ورش تدريبية لقادة الأقسام", t_en: "Department leader workshops", done: 18, total: 24 },
  { t_ar: "سفراء التغيير", t_en: "Change ambassadors", done: 42, total: 60 },
  { t_ar: "اتصالات تنفيذية أسبوعية", t_en: "Weekly exec communications", done: 22, total: 22 },
  { t_ar: "مسارات إعادة التأهيل", t_en: "Reskilling tracks", done: 6, total: 12 },
];

function phaseTone(p: string) {
  return p === "design" ? "amber" : p === "build" ? "cyan" : p === "scale" ? "violet" : "emerald";
}

function TransformationPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <NexusPage
      eyebrow="TRANSFORMATION OFFICE"
      title={ar ? "مكتب التحول المؤسسي" : "Enterprise Transformation Office"}
      subtitle={ar ? "مبادرات التحول الرقمي، تبني الذكاء الاصطناعي، إدارة التغيير، وتقييم النضج." : "Digital transformation, AI adoption, change management, and maturity."}
      actions={<NexusPill tone="violet"><Rocket className="h-3 w-3" /> 5 PROGRAMS</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "برامج تحول" : "Transformation programs"} value="5" tone="cyan" />
        <NexusStat label={ar ? "نضج رقمي عام" : "Overall maturity"} value="3.7 / 5" tone="violet" />
        <NexusStat label={ar ? "تبني AI" : "AI adoption"} value="62%" tone="emerald" />
        <NexusStat label={ar ? "وفر سنوي" : "Annual savings"} value="SAR 35.5M" tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard glow>
          <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{ar ? "برامج التحول" : "TRANSFORMATION PROGRAMS"}</div>
          </div>
          <div className="mt-4 space-y-3">
            {PROGRAMS.map((p) => (
              <div key={p.name_en} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">{ar ? p.name_ar : p.name_en}</div>
                  <NexusPill tone={phaseTone(p.phase)}>{p.phase}</NexusPill>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div><div className="text-slate-500">{ar ? "التقدم" : "Progress"}</div><div className="font-bold text-cyan-300">{p.progress}%</div></div>
                  <div><div className="text-slate-500">{ar ? "التبني" : "Adoption"}</div><div className="font-bold text-violet-300">{p.adopt}%</div></div>
                  <div><div className="text-slate-500">{ar ? "وفر" : "Savings"}</div><div className="font-bold text-emerald-300">{p.savings}</div></div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </NexusCard>

        <NexusCard>
          <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">{ar ? "تقييم نضج التحول" : "DIGITAL MATURITY ASSESSMENT"}</div>
          </div>
          <div className="mt-4 space-y-3">
            {MATURITY.map((m) => (
              <div key={m.dim_en}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">{ar ? m.dim_ar : m.dim_en}</span>
                  <span className="font-bold text-violet-300">{m.v} / 5</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${(m.v / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </NexusCard>
      </div>

      <NexusCard>
        <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{ar ? "إدارة التغيير" : "CHANGE MANAGEMENT"}</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CHANGE.map((c, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-sm font-semibold text-white">{ar ? c.t_ar : c.t_en}</div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-2xl font-bold text-cyan-300">{c.done}<span className="text-sm text-slate-500"> / {c.total}</span></div>
                <NexusPill tone={c.done === c.total ? "emerald" : "cyan"}>{Math.round((c.done / c.total) * 100)}%</NexusPill>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${(c.done / c.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}
