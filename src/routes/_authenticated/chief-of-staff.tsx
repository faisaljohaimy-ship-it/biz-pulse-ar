import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { Crown, Send, Compass, Scale, Target, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chief-of-staff")({
  component: ChiefOfStaffPage,
});

type Msg = { role: "user" | "ai"; text: string };

function ChiefOfStaffPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: ar
        ? "صباح الخير. أعددت لك 3 توصيات استراتيجية لقرارات اليوم، وحللت أداء 5 مبادرات رئيسية. ما الذي يهمك أن نبدأ به؟"
        : "Good morning. I've prepared 3 strategic recommendations for today's decisions and analyzed 5 key initiatives. Where would you like to begin?",
    },
  ]);
  const [input, setInput] = useState("");

  const recommendations = [
    {
      t: ar ? "إعادة توجيه 18٪ من ميزانية التسويق التقليدي إلى قنوات الأداء" : "Reallocate 18% of traditional marketing to performance channels",
      impact: "+SAR 4.1M",
      conf: 92,
    },
    {
      t: ar ? "تعليق توسعة المكتب الإقليمي حتى Q1 2027" : "Defer regional office expansion to Q1 2027",
      impact: "-SAR 6.8M risk",
      conf: 81,
    },
    {
      t: ar ? "استبدال 3 موردين بمزود واحد موحد" : "Consolidate 3 vendors into a single provider",
      impact: "+12% margin",
      conf: 77,
    },
  ];

  const priorities = [
    { t: ar ? "اعتماد ميزانية AI 2027" : "Approve 2027 AI budget", urgency: ar ? "اليوم" : "Today", tone: "rose" as const },
    { t: ar ? "مراجعة عقد المورد الرئيسي" : "Review primary vendor contract", urgency: ar ? "هذا الأسبوع" : "This week", tone: "amber" as const },
    { t: ar ? "اجتماع مجلس الإدارة Q3" : "Q3 board meeting prep", urgency: ar ? "خلال 3 أيام" : "In 3 days", tone: "amber" as const },
    { t: ar ? "خطة الخلافة التنفيذية" : "Executive succession plan", urgency: ar ? "هذا الشهر" : "This month", tone: "cyan" as const },
  ];

  function send() {
    if (!input.trim()) return;
    const u = input.trim();
    setMessages((m) => [...m, { role: "user", text: u }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: ar
            ? "بناءً على البيانات الحالية، أوصي بالمضي في الخيار (أ) مع مراقبة مؤشرين تشغيليين خلال الأسبوعين القادمين. هل تريد أن أعد قراراً جاهزاً للتوقيع؟"
            : "Based on current signals, I recommend Option A while monitoring two operational KPIs over the next two weeks. Want me to draft a ready-to-sign decision memo?",
        },
      ]);
    }, 600);
  }

  return (
    <NexusPage
      eyebrow="EXECUTIVE AI"
      title={ar ? "رئيس المستشارين التنفيذي" : "AI Chief of Staff"}
      subtitle={ar ? "مستشار استراتيجي ذكي يدعم قراراتك ويرتب أولوياتك." : "Strategic advisor surfacing decisions, priorities, and recommendations."}
      actions={<NexusPill tone="violet"><Crown className="h-3 w-3" /> EXECUTIVE</NexusPill>}
    >
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
                <div className="text-sm font-semibold text-white">{ar ? "Nexus Chief" : "Nexus Chief"}</div>
                <div className="text-[10px] tracking-widest text-violet-300/70">STRATEGIC ADVISOR</div>
              </div>
            </div>
            <NexusPill tone="emerald">● ACTIVE</NexusPill>
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

        {/* Side: priorities */}
        <NexusCard>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
              {ar ? "محرك الأولويات" : "PRIORITY ENGINE"}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {priorities.map((p, i) => (
              <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200">{p.t}</span>
                  <NexusPill tone={p.tone}>{p.urgency}</NexusPill>
                </div>
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>

      {/* Recommendations */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-violet-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
            {ar ? "توصيات تنفيذية" : "EXECUTIVE RECOMMENDATIONS"}
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {recommendations.map((r, i) => (
            <div key={i} className="rounded-xl border border-violet-400/15 bg-violet-500/[0.04] p-4">
              <div className="flex items-center justify-between">
                <NexusPill tone="violet">#{i + 1}</NexusPill>
                <span className="text-[10px] font-bold tracking-widest text-violet-300/80">
                  {r.conf}% {ar ? "ثقة" : "CONF"}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-white">{r.t}</div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
                <Scale className="h-3 w-3" /> {r.impact}
              </div>
              <button className="mt-3 w-full rounded-lg border border-violet-400/30 bg-violet-500/10 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20">
                {ar ? "اعتماد القرار" : "Approve decision"}
              </button>
            </div>
          ))}
        </div>
      </NexusCard>

      {/* Recent conversations */}
      <NexusCard>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "محادثات تنفيذية حديثة" : "RECENT EXECUTIVE CONVERSATIONS"}
          </div>
        </div>
        <ul className="mt-3 divide-y divide-white/5">
          {[
            ar ? "مراجعة استراتيجية التوسعة الإقليمية" : "Regional expansion strategy review",
            ar ? "خطة الاستجابة لحادثة الأمن السيبراني" : "Cybersecurity incident response plan",
            ar ? "هيكلة لجنة الذكاء الاصطناعي التنفيذية" : "AI executive committee structure",
            ar ? "تقييم عرض الاستحواذ من شركة Acme" : "Evaluation of Acme acquisition offer",
          ].map((t, i) => (
            <li key={i} className="flex items-center justify-between py-2.5 text-sm text-slate-200">
              <span>{t}</span>
              <span className="text-[11px] text-slate-500">{[2, 6, 14, 28][i]}{ar ? " س" : "h"}</span>
            </li>
          ))}
        </ul>
      </NexusCard>
    </NexusPage>
  );
}
