import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { Brain, TrendingUp, ShieldAlert, Lightbulb, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/intelligence")({
  component: IntelligencePage,
});

function IntelligencePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const predictions = [
    { t: ar ? "إيرادات Q4 ستتجاوز الخطة بنسبة 6.2٪" : "Q4 revenue likely to beat plan by 6.2%", c: 91 },
    { t: ar ? "ارتفاع متوقع في الطلب على دعم العملاء بنسبة 18٪" : "18% surge expected in support demand", c: 84 },
    { t: ar ? "احتمال تأخر مشروع SAP إلى Q1" : "SAP rollout likely to slip into Q1", c: 76 },
    { t: ar ? "نمو 12٪ في تبني AI Copilot الداخلي" : "12% growth in internal AI Copilot adoption", c: 88 },
  ];

  const risks = [
    { t: ar ? "تذبذب سعر العملة قد يكلف SAR 1.8M" : "FX volatility may cost SAR 1.8M", sev: ar ? "حرج" : "Critical", tone: "rose" as const },
    { t: ar ? "ضعف خطة استمرارية مزود سحابي" : "Single-cloud BCP weakness", sev: ar ? "مرتفع" : "High", tone: "amber" as const },
    { t: ar ? "مخاطر تنظيمية في سوق جديدة" : "Regulatory risk in new market", sev: ar ? "متوسط" : "Medium", tone: "amber" as const },
  ];

  const opps = [
    { t: ar ? "إطلاق منتج جديد في سوق الإمارات" : "Launch new product in UAE market", up: "SAR 12M" },
    { t: ar ? "أتمتة 14 عملية متبقية في المالية" : "Automate 14 remaining finance processes", up: "SAR 4.6M" },
    { t: ar ? "إعادة التفاوض على 3 عقود كبرى" : "Renegotiate 3 major contracts", up: "SAR 2.9M" },
  ];

  const recs = [
    ar ? "قفل عقود تحوط للعملة لمدة 6 أشهر" : "Lock 6-month FX hedging contracts",
    ar ? "تفعيل مزود سحابي ثانوي خلال 30 يوماً" : "Activate secondary cloud provider within 30 days",
    ar ? "بدء حملة مسبقة لدعم العملاء قبل ذروة Q4" : "Pre-stage support capacity before Q4 peak",
    ar ? "تسريع نشر AI Copilot لأقسام التشغيل" : "Accelerate AI Copilot rollout to ops divisions",
  ];

  return (
    <NexusPage
      eyebrow="DECISION INTELLIGENCE"
      title={ar ? "طبقة ذكاء القرارات" : "Decision Intelligence Layer"}
      subtitle={ar ? "تنبؤات، مخاطر، فرص، وتوصيات استراتيجية مدعومة بالذكاء الاصطناعي." : "Predictions, risks, opportunities and strategic AI recommendations."}
      actions={<NexusPill tone="violet"><Brain className="h-3 w-3" /> AI MODELED</NexusPill>}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NexusStat label={ar ? "إشارات نشطة" : "Live signals"} value="186" tone="cyan" />
        <NexusStat label={ar ? "دقة النموذج" : "Model accuracy"} value="91.4%" tone="emerald" />
        <NexusStat label={ar ? "مخاطر مرصودة" : "Risks flagged"} value="9" tone="rose" />
        <NexusStat label={ar ? "فرص مكتشفة" : "Opportunities"} value="14" tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NexusCard>
          <Header icon={TrendingUp} label={ar ? "تنبؤات استراتيجية" : "STRATEGIC PREDICTIONS"} tone="cyan" />
          <ul className="mt-3 space-y-3">
            {predictions.map((p, i) => (
              <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-slate-200">{p.t}</span>
                  <NexusPill tone="cyan">{p.c}%</NexusPill>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${p.c}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </NexusCard>

        <NexusCard>
          <Header icon={ShieldAlert} label={ar ? "كشف المخاطر" : "RISK DETECTION"} tone="rose" />
          <ul className="mt-3 space-y-2">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <NexusPill tone={r.tone}>{r.sev}</NexusPill>
                <span className="text-sm text-slate-200">{r.t}</span>
              </li>
            ))}
          </ul>
        </NexusCard>

        <NexusCard>
          <Header icon={Lightbulb} label={ar ? "اكتشاف الفرص" : "OPPORTUNITY DETECTION"} tone="emerald" />
          <ul className="mt-3 space-y-2">
            {opps.map((o, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <span className="text-sm text-slate-200">{o.t}</span>
                <NexusPill tone="emerald">+{o.up}</NexusPill>
              </li>
            ))}
          </ul>
        </NexusCard>

        <NexusCard>
          <Header icon={Sparkles} label={ar ? "توصيات الذكاء" : "AI RECOMMENDATIONS"} tone="violet" />
          <ul className="mt-3 space-y-2">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-violet-400/15 bg-violet-500/[0.04] p-3 text-sm text-slate-200">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-violet-400/40 text-[10px] font-bold text-violet-300">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </NexusCard>
      </div>

      {/* Intelligence stream */}
      <NexusCard glow>
        <Header icon={Brain} label={ar ? "تيار الذكاء الاستراتيجي" : "STRATEGIC INTELLIGENCE STREAM"} tone="cyan" />
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {[
            { l: ar ? "اتجاه السوق" : "Market trend", v: ar ? "الطلب على AI يتسارع 2.3x" : "AI demand accelerating 2.3x", tone: "cyan" },
            { l: ar ? "حركة منافس" : "Competitor move", v: ar ? "Acme أطلقت منتجاً مماثلاً" : "Acme launched a rival product", tone: "amber" },
            { l: ar ? "تنبيه تنظيمي" : "Regulatory alert", v: ar ? "تحديث لائحة حماية البيانات" : "Data protection regulation update", tone: "rose" },
            { l: ar ? "شذوذ تشغيلي" : "Operational anomaly", v: ar ? "هبوط مفاجئ في معدل تحويل قمع البيع" : "Funnel conversion dropped sharply", tone: "amber" },
            { l: ar ? "نمو داخلي" : "Internal growth", v: ar ? "تبني AI الداخلي +14٪" : "Internal AI adoption +14%", tone: "emerald" },
            { l: ar ? "إشارة استثمار" : "Investment signal", v: ar ? "تدفقات رأسمالية إلى قطاع الطاقة" : "Capital inflows into energy sector", tone: "violet" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <NexusPill tone={s.tone as "cyan" | "amber" | "rose" | "emerald" | "violet"}>{s.l}</NexusPill>
              <div className="mt-2 text-sm text-slate-200">{s.v}</div>
            </div>
          ))}
        </div>
      </NexusCard>
    </NexusPage>
  );
}

function Header({ icon: Icon, label, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; tone: "cyan" | "rose" | "emerald" | "violet" }) {
  const c = tone === "cyan" ? "text-cyan-300" : tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-violet-300";
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${c}`} />
      <div className={`text-[11px] font-bold tracking-[0.25em] ${c}/80`}>{label}</div>
    </div>
  );
}
