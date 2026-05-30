import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { PredictionsPanel } from "@/components/predictions-panel";
import { useFabricSnapshot, metric, usePredictions } from "@/lib/use-fabric";
import { Crown, Send, Compass, Scale, Target, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chief-of-staff")({
  component: ChiefOfStaffPage,
});

type Msg = { role: "user" | "ai"; text: string };

function ChiefOfStaffPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const navigate = useNavigate();
  const { data: fabric } = useFabricSnapshot();
  const { data: predictionsData } = usePredictions();

  const health = metric(fabric, "enterpriseHealth");
  const strat = metric(fabric, "strategicProgress");
  const velocity = metric(fabric, "executionVelocity");
  const risk = metric(fabric, "riskExposure");
  const opp = metric(fabric, "opportunityIndex");

  const recommendations = (predictionsData?.predictions ?? [])
    .filter((p) => p.kind === "recommendation" || p.kind === "opportunity")
    .slice(0, 3);

  // Live priorities: critical+high alerts, sorted by impact
  const priorities = fabric.topAlerts.slice(0, 4).map((a) => ({
    t: ar ? a.title : (a.title_en ?? a.title),
    urgency: a.severity === "critical" ? (ar ? "اليوم" : "Today")
           : a.severity === "high" ? (ar ? "هذا الأسبوع" : "This week")
           : (ar ? "هذا الشهر" : "This month"),
    tone: (a.severity === "critical" ? "rose" : a.severity === "high" ? "amber" : "cyan") as "rose" | "amber" | "cyan",
    route: a.route ?? "/dashboard",
  }));

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: ar
        ? `صباح الخير. صحة المؤسسة ${health}، التقدم الاستراتيجي ${strat}٪، وسرعة التنفيذ ${velocity}٪. لديك ${fabric.counts.openAlerts} تنبيه مفتوح و${fabric.counts.overdue} بند متأخر. من أين نبدأ؟`
        : `Good morning. Enterprise health ${health}, strategic progress ${strat}%, execution velocity ${velocity}%. You have ${fabric.counts.openAlerts} open alerts and ${fabric.counts.overdue} overdue items. Where shall we start?`,
    },
  ]);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    const u = input.trim();
    setMessages((m) => [...m, { role: "user", text: u }]);
    setInput("");
    setTimeout(() => {
      const topAlert = fabric.topAlerts[0];
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: ar
            ? `بناءً على بيانات النسيج الذكي الحالية، أوصي بمعالجة "${topAlert ? (ar ? topAlert.title : topAlert.title_en ?? topAlert.title) : "أعلى التنبيهات"}" أولاً. مستوى الفرص الحالي ${opp} والمخاطر ${risk}.`
            : `Based on live Fabric data, I recommend addressing "${topAlert ? (topAlert.title_en ?? topAlert.title) : "the top alert"}" first. Current opportunity index ${opp}, risk exposure ${risk}.`,
        },
      ]);
    }, 600);
  }

  return (
    <NexusPage
      eyebrow="EXECUTIVE AI · LIVE"
      title={ar ? "رئيس المستشارين التنفيذي" : "AI Chief of Staff"}
      subtitle={ar ? "مستشار استراتيجي مدفوع ببيانات النسيج الذكي مباشرة." : "Strategic advisor powered by live Intelligence Fabric data."}
      actions={<NexusPill tone="violet"><Crown className="h-3 w-3" /> EXECUTIVE</NexusPill>}
    >
      {/* Live KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "صحة المؤسسة" : "Enterprise Health"} value={`${health}`} tone="emerald" />
        <NexusStat label={ar ? "التقدم الاستراتيجي" : "Strategic Progress"} value={`${strat}%`} tone="cyan" />
        <NexusStat label={ar ? "تنبيهات مفتوحة" : "Open Alerts"} value={`${fabric.counts.openAlerts}`} tone="amber" />
        <NexusStat label={ar ? "متأخرة" : "Overdue"} value={`${fabric.counts.overdue}`} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chat */}
        <NexusCard glow className="flex h-[560px] flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-full bg-violet-500/40 blur-md" />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/40 bg-[#0a0a1f]">
                  <Crown className="h-4 w-4 text-violet-300" />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Nexus Chief</div>
                <div className="text-[10px] tracking-widest text-violet-300/70">STRATEGIC ADVISOR</div>
              </div>
            </div>
            <NexusPill tone="emerald">● LIVE</NexusPill>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ms-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-cyan-400/10 border border-cyan-400/20 px-4 py-2.5 text-sm text-slate-100"
                    : "me-auto max-w-[80%] rounded-2xl rounded-tl-sm border border-violet-400/20 bg-violet-500/[0.06] px-4 py-2.5 text-sm text-slate-200"
                }
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/5 pt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={ar ? "اطلب قراراً، توصية، أو تحليلاً تنفيذياً..." : "Request a decision, recommendation, or executive analysis..."}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/40 focus:outline-none"
            />
            <button
              onClick={send}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_0_25px_-5px_rgba(139,92,246,0.7)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </NexusCard>

        {/* Side: live priorities from Fabric topAlerts */}
        <NexusCard>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "محرك الأولويات · مباشر" : "PRIORITY ENGINE · LIVE"}
            </div>
          </div>
          {priorities.length === 0 ? (
            <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-slate-400">
              {ar ? "لا توجد تنبيهات نشطة." : "No active alerts."}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {priorities.map((p, i) => (
                <li key={i}>
                  <button
                    onClick={() => navigate({ to: p.route })}
                    className="w-full rounded-lg border border-white/5 bg-white/[0.02] p-3 text-start transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-200 line-clamp-2">{p.t}</span>
                      <NexusPill tone={p.tone}>{p.urgency}</NexusPill>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </NexusCard>
      </div>

      {/* Recommendations from predictive engine */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-violet-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
            {ar ? "توصيات تنفيذية · من المحرك التنبؤي" : "EXECUTIVE RECOMMENDATIONS · PREDICTIVE ENGINE"}
          </div>
        </div>
        {recommendations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-sm text-slate-400">
            {ar ? "النظام مستقر — لا توصيات حرجة الآن." : "System stable — no critical recommendations now."}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {recommendations.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-violet-400/15 bg-violet-500/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <NexusPill tone="violet">#{i + 1}</NexusPill>
                  <span className="text-[10px] font-bold tracking-widest text-violet-300/80">
                    {r.confidence}% {ar ? "ثقة" : "CONF"}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium text-white line-clamp-3">{ar ? r.title_ar : r.title_en}</div>
                <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">{ar ? r.detail_ar : r.detail_en}</div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
                  <Scale className="h-3 w-3" /> {r.impact} · {r.horizonDays}d
                </div>
                {r.route && (
                  <button
                    onClick={() => navigate({ to: r.route! })}
                    className="mt-3 w-full rounded-lg border border-violet-400/30 bg-violet-500/10 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  >
                    {ar ? "افتح المصدر" : "Open source"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </NexusCard>

      {/* Full predictions panel */}
      <PredictionsPanel />

      {/* Live signals summary */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "إشارات مباشرة من النسيج الذكي" : "LIVE INTELLIGENCE FABRIC SIGNALS"}
          </div>
        </div>
        <ul className="mt-3 divide-y divide-white/5">
          <li className="flex items-center justify-between py-2.5 text-sm text-slate-200">
            <span>{ar ? "أحداث متتبعة" : "Tracked events"}</span>
            <span className="font-mono text-cyan-300">{fabric.counts.events}</span>
          </li>
          <li className="flex items-center justify-between py-2.5 text-sm text-slate-200">
            <span>{ar ? "بنود منسية" : "Forgotten items"}</span>
            <span className="font-mono text-amber-300">{fabric.counts.forgotten}</span>
          </li>
          <li className="flex items-center justify-between py-2.5 text-sm text-slate-200">
            <span>{ar ? "مصادر متصلة" : "Connected sources"}</span>
            <span className="font-mono text-emerald-300">
              {fabric.sources.filter((s) => s.available).length}/{fabric.sources.length}
            </span>
          </li>
          <li className="flex items-center justify-between py-2.5 text-sm text-slate-200">
            <span>{ar ? "مؤشر الفرص" : "Opportunity index"}</span>
            <span className="font-mono text-violet-300">{opp}</span>
          </li>
        </ul>
      </NexusCard>
    </NexusPage>
  );
}
