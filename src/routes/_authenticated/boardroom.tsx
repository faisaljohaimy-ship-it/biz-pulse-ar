import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { Presentation, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/boardroom")({
  component: BoardroomPage,
});

function BoardroomPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [idx, setIdx] = useState(0);
  const [fs, setFs] = useState(false);

  const slides = [
    {
      eyebrow: ar ? "نظرة المجلس" : "BOARD OVERVIEW",
      title: ar ? "أداء يفوق التوقعات" : "Performance Above Expectations",
      kpis: [
        { l: ar ? "الإيرادات السنوية" : "Annual Revenue", v: "SAR 1.42B", d: "+18.6%" },
        { l: ar ? "هامش EBITDA" : "EBITDA Margin", v: "34.2%", d: "+3.1pp" },
        { l: ar ? "صافي الربح" : "Net Profit", v: "SAR 412M", d: "+22%" },
        { l: ar ? "تدفق نقدي" : "Free Cash Flow", v: "SAR 386M", d: "+14%" },
      ],
      body: ar ? "تجاوزت المؤسسة جميع أهداف الخطة الاستراتيجية للسنة المالية مع نمو متسارع في القطاعات الرقمية والذكاء الاصطناعي." : "The enterprise exceeded all strategic plan targets for the fiscal year, with accelerating growth in digital and AI segments.",
    },
    {
      eyebrow: ar ? "الأولويات الاستراتيجية" : "STRATEGIC PRIORITIES",
      title: ar ? "خارطة الطريق 2027" : "2027 Roadmap",
      kpis: [
        { l: ar ? "تحول AI" : "AI Transformation", v: "78%", d: ar ? "مكتمل" : "complete" },
        { l: ar ? "توسعة إقليمية" : "Regional Expansion", v: "3", d: ar ? "أسواق" : "markets" },
        { l: ar ? "أتمتة" : "Automation", v: "86", d: ar ? "عملية" : "processes" },
        { l: ar ? "استثمار R&D" : "R&D Investment", v: "SAR 240M", d: "+32%" },
      ],
      body: ar ? "ثلاث ركائز محورية: التحول الذكي، التوسع الجغرافي، وتعزيز الكفاءة التشغيلية بالأتمتة." : "Three core pillars: intelligent transformation, geographic expansion, and operational efficiency via automation.",
    },
    {
      eyebrow: ar ? "المخاطر والمرونة" : "RISK & RESILIENCE",
      title: ar ? "محفظة مخاطر متوازنة" : "A Balanced Risk Portfolio",
      kpis: [
        { l: ar ? "مخاطر حرجة" : "Critical risks", v: "3", d: ar ? "مخفّضة" : "mitigated" },
        { l: ar ? "خطة استمرارية" : "BCP coverage", v: "94%", d: "+12pp" },
        { l: ar ? "حوادث أمن" : "Security incidents", v: "0", d: ar ? "هذا الربع" : "this Q" },
        { l: ar ? "امتثال" : "Compliance", v: "100%", d: ar ? "كامل" : "full" },
      ],
      body: ar ? "تحسّن جوهري في إطار المخاطر مع تعزيز خطط استمرارية الأعمال وامتثال تنظيمي كامل." : "Material improvement in risk posture with strengthened BCP and full regulatory compliance.",
    },
    {
      eyebrow: ar ? "توصيات المجلس" : "BOARD RECOMMENDATIONS",
      title: ar ? "قرارات للموافقة" : "Decisions for Approval",
      kpis: [
        { l: ar ? "ميزانية AI 2027" : "AI Budget 2027", v: "SAR 320M", d: ar ? "للاعتماد" : "to approve" },
        { l: ar ? "توسع" : "Expansion", v: "EU + UAE", d: ar ? "للاعتماد" : "to approve" },
        { l: ar ? "توزيعات أرباح" : "Dividends", v: "SAR 180M", d: ar ? "مقترح" : "proposed" },
        { l: ar ? "إعادة شراء" : "Buyback", v: "SAR 90M", d: ar ? "اختياري" : "optional" },
      ],
      body: ar ? "أربعة قرارات رئيسية معروضة على المجلس مدعومة بتحليل مالي واستراتيجي شامل من Nexus AI." : "Four key decisions presented to the board, supported by comprehensive financial and strategic analysis from Nexus AI.",
    },
  ];

  const s = slides[idx];

  return (
    <NexusPage
      eyebrow="BOARDROOM"
      title={ar ? "وضع قاعة الاجتماع التنفيذية" : "Executive Boardroom Mode"}
      subtitle={ar ? "عرض تنفيذي للمجلس والمستثمرين بإيقاع سينمائي." : "Cinematic presentation mode for board, leadership, and investor reviews."}
      actions={
        <>
          <NexusPill tone="violet"><Presentation className="h-3 w-3" /> PRESENTATION</NexusPill>
          <button
            onClick={() => setFs((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
            aria-label="Toggle fullscreen"
          >
            {fs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </>
      }
    >
      <NexusCard glow className={fs ? "fixed inset-4 z-50 flex flex-col" : "min-h-[520px] flex flex-col"}>
        {/* Slide content */}
        <div className="flex-1">
          <div className="text-[10px] font-bold tracking-[0.35em] text-cyan-300/80">{s.eyebrow}</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-5xl">{s.title}</h2>
          <p className="mt-4 max-w-3xl text-base text-slate-300">{s.body}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.kpis.map((k) => (
              <div key={k.l} className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.l}</div>
                <div className="mt-2 text-3xl font-bold text-cyan-300">{k.v}</div>
                <div className="mt-1 text-xs text-emerald-300">{k.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {ar ? "السابق" : "Prev"}
          </button>

          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-cyan-300" : "w-2 bg-white/15"}`}
              />
            ))}
            <span className="ms-2 font-mono text-[10px] text-slate-500">
              {String(idx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
          </div>

          <button
            onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
            disabled={idx === slides.length - 1}
            className="flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 disabled:opacity-30"
          >
            {ar ? "التالي" : "Next"} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </NexusCard>

      {!fs && (
        <NexusCard>
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "أنماط العرض" : "PRESENTATION MODES"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { l: ar ? "مراجعة المجلس" : "Board Review", d: ar ? "ربع سنوي" : "Quarterly", tone: "cyan" },
              { l: ar ? "إيجاز قيادي" : "Leadership Brief", d: ar ? "أسبوعي" : "Weekly", tone: "violet" },
              { l: ar ? "عرض مستثمرين" : "Investor Demo", d: ar ? "حسب الطلب" : "On-demand", tone: "emerald" },
              { l: ar ? "تحديث الجمعية" : "AGM Update", d: ar ? "سنوي" : "Annual", tone: "amber" },
            ].map((m, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <NexusPill tone={m.tone as "cyan" | "violet" | "emerald" | "amber"}>{m.d}</NexusPill>
                <div className="mt-2 text-sm font-semibold text-white">{m.l}</div>
                <button className="mt-3 w-full rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-400/20">
                  {ar ? "بدء العرض" : "Launch"}
                </button>
              </div>
            ))}
          </div>
        </NexusCard>
      )}
    </NexusPage>
  );
}
