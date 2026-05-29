import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Workflow, GitMerge, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orchestration")({
  component: OrchestrationPage,
});

const FLOWS = [
  { name_ar: "إغلاق المبيعات الآلي", name_en: "Auto Sales Close", runs: 1240, success: 98, deps: ["Salesforce", "SAP", "Slack"] },
  { name_ar: "أتمتة فواتير المشتريات", name_en: "AP Invoice Automation", runs: 890, success: 95, deps: ["SAP", "OCR", "Outlook"] },
  { name_ar: "التأهيل التلقائي للموظفين", name_en: "Employee Onboarding", runs: 42, success: 100, deps: ["Workday", "Azure AD", "Teams"] },
  { name_ar: "مراقبة حوادث الأمن", name_en: "Security Incident Triage", runs: 318, success: 92, deps: ["Sentinel", "ServiceNow"] },
  { name_ar: "تجديد عقود العملاء", name_en: "Contract Renewal", runs: 56, success: 88, deps: ["Salesforce", "DocuSign"] },
  { name_ar: "تقارير KPI الأسبوعية" , name_en: "Weekly KPI Reports", runs: 14, success: 100, deps: ["Snowflake", "PowerBI"] },
];

function OrchestrationPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <NexusPage
      eyebrow="WORKFLOW ORCHESTRATION"
      title={ar ? "مركز تنسيق سير العمل" : "Workflow Orchestration Center"}
      subtitle={ar ? "أتمتة ذكية مع رؤية كاملة للعمليات والتبعيات." : "Intelligent automation with full process visibility and dependencies."}
      actions={<NexusPill tone="cyan"><Workflow className="h-3 w-3" /> 342 RUNNING</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "سير عمل نشط" : "Active workflows"} value="86" tone="cyan" />
        <NexusStat label={ar ? "تشغيلات/يوم" : "Runs/day"} value="9.4K" tone="cyan" />
        <NexusStat label={ar ? "نجاح" : "Success"} value="94.7%" tone="emerald" />
        <NexusStat label={ar ? "وقت موفر" : "Hours saved/mo"} value="2,140" tone="violet" />
      </div>

      {/* Pipeline visualization */}
      <NexusCard glow>
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "خط أنابيب لحظي" : "LIVE PIPELINE"}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-3">
          {[
            { l_ar: "إدخال", l_en: "Intake", n: 1240, tone: "cyan" },
            { l_ar: "تصنيف AI", l_en: "AI Classify", n: 1232, tone: "violet" },
            { l_ar: "تنفيذ", l_en: "Execute", n: 1198, tone: "cyan" },
            { l_ar: "مصادقة", l_en: "Validate", n: 1184, tone: "amber" },
            { l_ar: "اكتمل", l_en: "Complete", n: 1172, tone: "emerald" },
          ].map((s, i, arr) => (
            <div key={i} className="relative">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <NexusPill tone={s.tone as "cyan" | "violet" | "amber" | "emerald"}>{ar ? s.l_ar : s.l_en}</NexusPill>
                <div className="mt-2 text-2xl font-bold text-white">{s.n.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">{ar ? "اليوم" : "today"}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="absolute end-[-12px] top-1/2 hidden -translate-y-1/2 text-cyan-400/60 lg:block">→</div>
              )}
            </div>
          ))}
        </div>
      </NexusCard>

      {/* Workflows */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "سير عمل المؤسسة" : "ENTERPRISE WORKFLOWS"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLOWS.map((f) => (
            <div key={f.name_en} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">{ar ? f.name_ar : f.name_en}</div>
                <NexusPill tone={f.success >= 95 ? "emerald" : f.success >= 90 ? "amber" : "rose"}>{f.success}%</NexusPill>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">{f.runs.toLocaleString()} {ar ? "تشغيل/شهر" : "runs/mo"}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {f.deps.map((d) => (
                  <NexusPill key={d} tone="slate">{d}</NexusPill>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-emerald-400/80" style={{ width: `${f.success}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "ذكاء العمليات" : "PROCESS INTELLIGENCE"}
          </div>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            ar ? "اكتشاف عنق زجاجة في 'مصادقة المشتريات' — يضيف 4.2 ساعة لكل دورة" : "Bottleneck detected in 'Purchase Validation' — adds 4.2h per cycle",
            ar ? "23٪ من تشغيلات 'تجديد العقود' تحتاج تدخلاً يدوياً يمكن أتمتته" : "23% of 'Contract Renewal' runs need manual touch that can be automated",
            ar ? "فرصة لدمج 'موافقة المصاريف' مع 'إصدار الفواتير' لتوفير 38 ساعة شهرياً" : "Merging 'Expense Approval' with 'Invoicing' could save 38h/month",
          ].map((t, i) => (
            <li key={i} className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-3 text-slate-200">{t}</li>
          ))}
        </ul>
      </NexusCard>
    </NexusPage>
  );
}
