import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { Brain, Send, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/analyst")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AnalystPage,
});

type Msg = { role: "user" | "ai"; text: string; insights?: string[] };

const STARTERS_AR = [
  "لماذا انخفضت كفاءة العمليات؟",
  "أي قسم يحتاج تدخلاً عاجلاً؟",
  "ما المبادرة التي تحقق أعلى عائد؟",
  "هل سنحقق هدف الإيراد للربع الرابع؟",
];
const STARTERS_EN = [
  "Why did operational efficiency drop?",
  "Which department needs intervention?",
  "What initiative generates the highest ROI?",
  "Will we hit Q4 revenue target?",
];

const ANSWERS: Record<
  string,
  { ar: string; en: string; insights_ar: string[]; insights_en: string[] }
> = {
  q1: {
    ar: "انخفضت كفاءة العمليات (OEE) من 80٪ إلى 78٪ بسبب عنق زجاجة في بوابة 'مصادقة المشتريات' أضاف 4.2 ساعة لكل دورة، إضافة إلى زيادة 12٪ في الحوادث P2.",
    en: "Operational efficiency (OEE) dropped from 80% to 78% due to a bottleneck in the Purchase Validation gate adding 4.2h per cycle, plus a 12% increase in P2 incidents.",
    insights_ar: [
      "إعادة تصميم البوابة يستعيد 1.4pp",
      "نشر AI Copilot للعمليات يضيف 0.8pp",
      "أتمتة 14 عملية مالية يقلل التأخر 22٪",
    ],
    insights_en: [
      "Redesigning the gate recovers 1.4pp",
      "Ops AI Copilot adds 0.8pp",
      "Automating 14 finance processes cuts delays 22%",
    ],
  },
  q2: {
    ar: "قسم خدمة العملاء هو الأكثر إلحاحاً: درجة 69 مع اتجاه -4 وFCR عند 68٪ مقابل هدف 78٪.",
    en: "Customer Service needs intervention most urgently: score 69 with a -4 trend and FCR at 68% vs target 78%.",
    insights_ar: [
      "تدريب على 3 سيناريوهات أساسية يرفع FCR 8pp",
      "إضافة وكيل AI للدعم يخفض AHT 22٪",
      "مراجعة سلم الرواتب",
    ],
    insights_en: [
      "Top 3-scenario training lifts FCR 8pp",
      "Adding an AI support agent cuts AHT 22%",
      "Compensation band review",
    ],
  },
  q3: {
    ar: "مبادرة 'توسع الشرق الأوسط' تحقق أعلى عائد: +31٪ ROI بميزانية SAR 180M وتقدم 81٪.",
    en: "MENA Market Expansion delivers the highest ROI: +31% on a SAR 180M budget at 81% progress.",
    insights_ar: [
      "تسريع الإطلاق في الإمارات يضيف SAR 12M",
      "تخصيص رأس مال إضافي بمقدار 12٪",
      "إنشاء شراكة محلية",
    ],
    insights_en: [
      "Accelerating UAE launch adds SAR 12M",
      "Reallocate +12% capital",
      "Forge a local partnership",
    ],
  },
  q4: {
    ar: "النموذج التنبؤي يقدر بثقة 91٪ أن إيرادات Q4 ستتجاوز الخطة بنسبة 6.2٪، شريطة الحفاظ على معدل التحويل الحالي وتفادي ذروة دعم متوقعة.",
    en: "Predictive model estimates with 91% confidence that Q4 revenue will beat plan by 6.2%, conditional on keeping conversion stable and absorbing an expected support surge.",
    insights_ar: [
      "تجهيز مسبق لقدرة الدعم",
      "حملة احتفاظ بالعملاء قبل ذروة Q4",
      "قفل التحوط على العملة",
    ],
    insights_en: ["Pre-stage support capacity", "Pre-Q4 retention campaign", "Lock FX hedge"],
  },
};

function pickAnswer(q: string): {
  ar: string;
  en: string;
  insights_ar: string[];
  insights_en: string[];
} {
  const l = q.toLowerCase();
  if (l.includes("efficiency") || l.includes("oee") || l.includes("كفاءة") || l.includes("عملي"))
    return ANSWERS.q1;
  if (
    l.includes("intervention") ||
    l.includes("department") ||
    l.includes("قسم") ||
    l.includes("تدخل")
  )
    return ANSWERS.q2;
  if (l.includes("roi") || l.includes("initiative") || l.includes("مبادرة") || l.includes("عائد"))
    return ANSWERS.q3;
  if (l.includes("revenue") || l.includes("q4") || l.includes("إيراد") || l.includes("ربع"))
    return ANSWERS.q4;
  return ANSWERS.q1;
}

function AnalystPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const starters = ar ? STARTERS_AR : STARTERS_EN;
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: ar
        ? "مرحباً، أنا محلل الأعمال الذكي. اسأل عن الأداء، المخاطر، الفرص، أو أي مؤشر."
        : "Hello, I'm your AI Business Analyst. Ask me about performance, risk, opportunity, or any KPI.",
    },
  ]);
  const [input, setInput] = useState("");

  function send(q: string) {
    const ans = pickAnswer(q);
    setMsgs((m) => [
      ...m,
      { role: "user", text: q },
      { role: "ai", text: ar ? ans.ar : ans.en, insights: ar ? ans.insights_ar : ans.insights_en },
    ]);
    setInput("");
  }

  return (
    <NexusPage
      eyebrow="AI BUSINESS ANALYST"
      title={ar ? "محلل الأعمال الذكي" : "AI Business Analyst"}
      subtitle={
        ar
          ? "اسأل بلغة طبيعية واحصل على إجابات مدعومة ببيانات المؤسسة."
          : "Ask in natural language and get answers grounded in enterprise data."
      }
      actions={
        <NexusPill tone="violet">
          <Brain className="h-3 w-3" /> NEXUS AI
        </NexusPill>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
        <NexusCard glow className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <div className="text-[11px] font-bold tracking-[0.25em] text-violet-300/80">
              {ar ? "المحادثة" : "CONVERSATION"}
            </div>
          </div>
          <div className="mt-4 min-h-[420px] space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl border p-3 text-sm ${m.role === "user" ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-50" : "border-violet-400/20 bg-violet-500/[0.05] text-slate-200"}`}
                >
                  <div>{m.text}</div>
                  {m.insights && (
                    <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-[11px]">
                      {m.insights.map((it, k) => (
                        <li key={k} className="flex items-start gap-2 text-slate-300">
                          <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-violet-400/40 text-[9px] font-bold text-violet-300">
                            {k + 1}
                          </span>
                          {it}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) send(input.trim());
            }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ar ? "اطرح سؤالاً..." : "Ask a question..."}
              aria-label={ar ? "اطرح سؤالاً" : "Ask a question"}
              className="flex-1 bg-transparent px-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              aria-label={ar ? "إرسال" : "Send"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/80 text-white hover:bg-violet-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </NexusCard>

        <NexusCard>
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "أسئلة سريعة" : "QUICK QUESTIONS"}
          </div>
          <div className="mt-3 space-y-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-start text-[12px] text-slate-300 transition hover:border-violet-400/40 hover:bg-violet-500/[0.06] hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </NexusCard>
      </div>
    </NexusPage>
  );
}
