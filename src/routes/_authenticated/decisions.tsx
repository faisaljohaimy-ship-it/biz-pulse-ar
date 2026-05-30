import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Gavel, CheckCircle2, Clock, AlertOctagon } from "lucide-react";
import { useFabricSnapshot, metric } from "@/lib/use-fabric";
import { PredictionsPanel } from "@/components/predictions-panel";

export const Route = createFileRoute("/_authenticated/decisions")({
  component: DecisionsPage,
});


const DECISIONS = [
  { id: "D-2401", t_ar: "إقرار التحوط على العملة لمدة 6 أشهر", t_en: "Approve 6-month FX hedge", status: "executed", impact_ar: "حماية SAR 1.8M", impact_en: "Protects SAR 1.8M", owner: "CFO", date: "2026-04-12", outcome_ar: "تم تجنب خسارة 1.6M", outcome_en: "Avoided 1.6M loss" },
  { id: "D-2402", t_ar: "تأجيل إطلاق منتج Beta للربع القادم", t_en: "Delay Beta launch to next quarter", status: "executed", impact_ar: "تحسين الجودة بنسبة 22٪", impact_en: "+22% quality score", owner: "CPO", date: "2026-03-30", outcome_ar: "انخفاض الشكاوى 18٪", outcome_en: "Complaints down 18%" },
  { id: "D-2403", t_ar: "تفعيل مزود سحابي ثانوي", t_en: "Activate secondary cloud provider", status: "in-progress", impact_ar: "تقليل وقت التعطل 60٪", impact_en: "60% downtime cut", owner: "CIO", date: "2026-05-08", outcome_ar: "—", outcome_en: "—" },
  { id: "D-2404", t_ar: "تسريع نشر AI Copilot لقسم العمليات", t_en: "Accelerate AI Copilot rollout to Ops", status: "approved", impact_ar: "إنتاجية +14٪", impact_en: "+14% productivity", owner: "COO", date: "2026-05-22", outcome_ar: "—", outcome_en: "—" },
  { id: "D-2405", t_ar: "رفض الاستحواذ على شركة Acme", t_en: "Reject Acme acquisition", status: "executed", impact_ar: "تجنب SAR 240M مخاطر", impact_en: "Avoided SAR 240M risk", owner: "CEO", date: "2026-02-18", outcome_ar: "السوق هبط 12٪", outcome_en: "Market dropped 12%" },
  { id: "D-2406", t_ar: "إعادة هيكلة عقد Salesforce", t_en: "Renegotiate Salesforce contract", status: "pending", impact_ar: "توفير SAR 4.2M سنوياً", impact_en: "Save SAR 4.2M/yr", owner: "CIO", date: "2026-06-01", outcome_ar: "—", outcome_en: "—" },
];

const RECS = [
  { t_ar: "إغلاق 3 منتجات أقل ربحية", t_en: "Sunset 3 lowest-margin products", impact: "+SAR 8.4M", conf: 88 },
  { t_ar: "دمج قسمي التسويق الرقمي والعلامة", t_en: "Merge digital marketing & brand teams", impact: "+12% velocity", conf: 81 },
  { t_ar: "الاستحواذ على شركة DataX التحليلية", t_en: "Acquire DataX analytics startup", impact: "+SAR 22M ARR", conf: 74 },
  { t_ar: "تحويل 40٪ من البنية إلى Edge", t_en: "Move 40% of infra to Edge", impact: "-28% latency", conf: 86 },
];

function statusTone(s: string) {
  return s === "executed" ? "emerald" : s === "in-progress" ? "cyan" : s === "approved" ? "violet" : "amber";
}

function DecisionsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data: fabric } = useFabricSnapshot();
  const stratProgress = metric(fabric, "strategicProgress");
  const velocity = metric(fabric, "executionVelocity");
  const latency = metric(fabric, "decisionLatency");
  const opportunity = metric(fabric, "opportunityIndex");
  return (
    <NexusPage
      eyebrow="DECISION CENTER"
      title={ar ? "مركز القرارات التنفيذية" : "Executive Decision Center"}
      subtitle={ar ? "توصيات الذكاء الاصطناعي، تتبع القرارات، النتائج، وتحليل الأثر الاستراتيجي." : "AI recommendations, decision tracking, outcomes, and strategic impact."}
      actions={<NexusPill tone="violet"><Gavel className="h-3 w-3" /> {fabric.counts.events} {ar ? "حدث" : "EVENTS"}</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "تقدم استراتيجي" : "Strategic progress"} value={`${stratProgress}%`} tone="cyan" />
        <NexusStat label={ar ? "سرعة التنفيذ" : "Execution velocity"} value={`${velocity}%`} tone="emerald" />
        <NexusStat label={ar ? "زمن القرار" : "Decision latency"} value={`${latency}`} tone="violet" />
        <NexusStat label={ar ? "مؤشر الفرص" : "Opportunity index"} value={`${opportunity}`} tone="emerald" />
      </div>

      <PredictionsPanel compact />



      <NexusCard glow>
        <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">{ar ? "سجل القرارات" : "DECISION LEDGER"}</div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2 text-start">ID</th>
                <th className="py-2 text-start">{ar ? "القرار" : "Decision"}</th>
                <th className="py-2 text-start">{ar ? "المالك" : "Owner"}</th>
                <th className="py-2 text-start">{ar ? "الأثر" : "Impact"}</th>
                <th className="py-2 text-start">{ar ? "النتيجة" : "Outcome"}</th>
                <th className="py-2 text-start">{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {DECISIONS.map((d) => (
                <tr key={d.id}>
                  <td className="py-3 font-mono text-[11px] text-slate-500">{d.id}</td>
                  <td className="py-3 font-semibold text-white">{ar ? d.t_ar : d.t_en}<div className="text-[10px] text-slate-500">{d.date}</div></td>
                  <td className="py-3 text-slate-400">{d.owner}</td>
                  <td className="py-3 text-cyan-300">{ar ? d.impact_ar : d.impact_en}</td>
                  <td className="py-3 text-emerald-300">{ar ? d.outcome_ar : d.outcome_en}</td>
                  <td className="py-3"><NexusPill tone={statusTone(d.status)}>{d.status}</NexusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">{ar ? "توصيات الذكاء الاصطناعي" : "AI RECOMMENDATIONS PENDING REVIEW"}</div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {RECS.map((r, i) => (
            <div key={i} className="rounded-xl border border-violet-400/15 bg-violet-500/[0.03] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-white">{ar ? r.t_ar : r.t_en}</div>
                <NexusPill tone="violet">{r.conf}%</NexusPill>
              </div>
              <div className="mt-2 text-[11px] text-emerald-300">{ar ? "أثر متوقع:" : "Expected impact:"} {r.impact}</div>
              <div className="mt-3 flex gap-2">
                <button className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-400/20">{ar ? "اعتماد" : "Approve"}</button>
                <button className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/[0.06]">{ar ? "مراجعة" : "Review"}</button>
                <button className="rounded-md border border-rose-400/30 bg-rose-400/5 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-400/15">{ar ? "رفض" : "Reject"}</button>
              </div>
            </div>
          ))}
        </div>
      </NexusCard>

      <NexusCard>
        <div className="flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-amber-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-amber-300/80">{ar ? "تحليل الأثر الاستراتيجي" : "STRATEGIC IMPACT ANALYSIS"}</div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            { l: ar ? "الإيراد" : "Revenue", v: "+SAR 64M", tone: "emerald" },
            { l: ar ? "التكلفة" : "Cost", v: "-SAR 22M", tone: "emerald" },
            { l: ar ? "المخاطر" : "Risk exposure", v: "-38%", tone: "cyan" },
            { l: ar ? "وقت السوق" : "Time-to-market", v: "-2.4w", tone: "cyan" },
            { l: ar ? "إنتاجية الموظفين" : "Productivity", v: "+14%", tone: "violet" },
            { l: ar ? "رضا العملاء" : "CSAT", v: "+6pt", tone: "violet" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.l}</div>
              <div className={`mt-2 text-2xl font-bold ${s.tone === "emerald" ? "text-emerald-300" : s.tone === "cyan" ? "text-cyan-300" : "text-violet-300"}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}
