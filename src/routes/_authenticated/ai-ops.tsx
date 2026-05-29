import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Bot, Network, Cpu } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ai-ops")({
  component: AiOpsPage,
});

const AGENTS = [
  { id: "exec", name_ar: "المستشار التنفيذي", name_en: "Executive Advisor", role: "Strategy", perf: 96, tasks: 142, status: "active", x: 50, y: 50 },
  { id: "fin", name_ar: "محلل مالي", name_en: "Finance Analyst", role: "Finance", perf: 94, tasks: 318, status: "active", x: 18, y: 25 },
  { id: "ops", name_ar: "مشغل العمليات", name_en: "Ops Operator", role: "Operations", perf: 92, tasks: 540, status: "active", x: 82, y: 25 },
  { id: "sec", name_ar: "محلل أمني", name_en: "Security Analyst", role: "Security", perf: 99, tasks: 1240, status: "active", x: 12, y: 65 },
  { id: "sup", name_ar: "دعم العملاء", name_en: "Customer Support", role: "Support", perf: 88, tasks: 2840, status: "busy", x: 88, y: 65 },
  { id: "res", name_ar: "باحث ذكي", name_en: "Research Agent", role: "Research", perf: 91, tasks: 86, status: "active", x: 32, y: 88 },
  { id: "mkt", name_ar: "مدير التسويق", name_en: "Marketing Lead", role: "Growth", perf: 87, tasks: 124, status: "idle", x: 68, y: 88 },
  { id: "eng", name_ar: "مهندس برمجيات", name_en: "Software Engineer", role: "Engineering", perf: 93, tasks: 412, status: "active", x: 50, y: 10 },
];

const EDGES: Array<[string, string]> = [
  ["exec", "fin"], ["exec", "ops"], ["exec", "eng"],
  ["fin", "sec"], ["ops", "sup"], ["res", "exec"],
  ["mkt", "exec"], ["eng", "ops"], ["sec", "ops"],
];

function AiOpsPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <NexusPage
      eyebrow="AI OPERATIONS"
      title={ar ? "مركز عمليات الذكاء الاصطناعي" : "AI Operations Center"}
      subtitle={ar ? "تنسيق 48 وكيلاً ذكياً يتعاونون لتنفيذ المهام بشكل ذاتي." : "Orchestrating 48 AI agents collaborating autonomously to execute work."}
      actions={<NexusPill tone="violet"><Bot className="h-3 w-3" /> SWARM</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "وكلاء نشطون" : "Active agents"} value="48" tone="violet" />
        <NexusStat label={ar ? "مهام ذاتية/يوم" : "Autonomous tasks/day"} value="14.2K" tone="cyan" />
        <NexusStat label={ar ? "نسبة النجاح" : "Success rate"} value="94.3%" tone="emerald" />
        <NexusStat label={ar ? "محادثات بين الوكلاء" : "Agent ↔ Agent msgs"} value="86.4K" tone="cyan" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <NexusCard glow className="relative h-[520px] overflow-hidden p-0">
          {/* connection lines */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {EDGES.map(([a, b], i) => {
              const na = AGENTS.find((n) => n.id === a)!;
              const nb = AGENTS.find((n) => n.id === b)!;
              return (
                <line
                  key={i}
                  x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                  stroke="rgba(139,92,246,0.35)" strokeWidth="0.2" strokeDasharray="0.5 0.5"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-10" dur="3s" repeatCount="indefinite" />
                </line>
              );
            })}
          </svg>
          {AGENTS.map((a) => (
            <div
              key={a.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
            >
              <div className="relative">
                <div className={`absolute inset-0 rounded-full blur-lg ${a.status === "active" ? "bg-violet-500/50" : a.status === "busy" ? "bg-amber-400/50" : "bg-slate-500/30"}`} />
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 ${a.status === "active" ? "border-violet-400/60 bg-violet-500/10" : a.status === "busy" ? "border-amber-400/60 bg-amber-400/10" : "border-slate-500/40 bg-slate-700/40"}`}>
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="mt-1 whitespace-nowrap text-center text-[10px] font-semibold text-slate-300">
                  {ar ? a.name_ar : a.name_en}
                </div>
              </div>
            </div>
          ))}
          <div className="absolute bottom-3 start-3 flex items-center gap-2">
            <NexusPill tone="violet">● ACTIVE</NexusPill>
            <NexusPill tone="amber">● BUSY</NexusPill>
            <NexusPill tone="slate">● IDLE</NexusPill>
          </div>
        </NexusCard>

        <NexusCard>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "أداء الوكلاء" : "AGENT PERFORMANCE"}
            </div>
          </div>
          <ul className="mt-3 space-y-2.5">
            {AGENTS.slice(0, 6).map((a) => (
              <li key={a.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">{ar ? a.name_ar : a.name_en}</span>
                  <span className="font-semibold text-violet-300">{a.perf}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-cyan-400/80" style={{ width: `${a.perf}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">{a.tasks} {ar ? "مهمة/يوم" : "tasks/day"}</div>
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "تواصل الوكلاء" : "AGENT COMMUNICATION LOG"}
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 font-mono text-[11px]">
          {[
            ["Finance Analyst", "→", "Executive Advisor", ar ? "أعد ملخص الإغلاق الشهري" : "Prepared monthly close summary"],
            ["Security Analyst", "→", "Ops Operator", ar ? "اكتشاف نشاط غير معتاد على VPN" : "Detected unusual VPN activity"],
            ["Marketing Lead", "→", "Research Agent", ar ? "طلب تحليل منافس جديد" : "Requested new competitor analysis"],
            ["Software Engineer", "→", "Ops Operator", ar ? "نشر هوت فيكس v4.2.1" : "Deployed hotfix v4.2.1"],
            ["Customer Support", "→", "Software Engineer", ar ? "تصعيد 3 تذاكر حرجة" : "Escalated 3 critical tickets"],
            ["Executive Advisor", "→", "Finance Analyst", ar ? "موافقة على إعادة توزيع الميزانية" : "Approved budget reallocation"],
          ].map(([from, arrow, to, msg], i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
              <span className="text-violet-300">{from}</span>
              <span className="text-slate-500">{arrow}</span>
              <span className="text-cyan-300">{to}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300">{msg}</span>
            </li>
          ))}
        </ul>
      </NexusCard>
    </NexusPage>
  );
}
