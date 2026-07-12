import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { PredictionsPanel } from "@/components/predictions-panel";
import { getFabricSnapshot } from "@/lib/intelligence.functions";
import { Presentation, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

const boardroomQuery = queryOptions({
  queryKey: ["fabric-snapshot"],
  queryFn: () => getFabricSnapshot(),
  staleTime: 60_000,
  refetchInterval: 30_000,
});

export const Route = createFileRoute("/_authenticated/boardroom")({
  loader: ({ context }) => context.queryClient.ensureQueryData(boardroomQuery),
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
  component: BoardroomPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-rose-300" role="alert">
      Boardroom error: {error.message}
    </div>
  ),
});

function BoardroomPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data } = useSuspenseQuery(boardroomQuery);
  const [idx, setIdx] = useState(0);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(3, i + 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "Escape" && fs) setFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fs]);

  const m = Object.fromEntries(data.metrics.map((x) => [x.id, x]));
  const health = m.enterpriseHealth;
  const strat = m.strategicProgress;
  const velocity = m.executionVelocity;
  const latency = m.decisionLatency;
  const risk = m.riskExposure;
  const opp = m.opportunityIndex;

  const critical = data.topAlerts.filter((a) => a.severity === "critical").length;
  const high = data.topAlerts.filter((a) => a.severity === "high").length;
  const lbl = (x: { label_ar: string; label_en: string }) => (ar ? x.label_ar : x.label_en);
  const why = (x: { why_ar: string; why_en: string }) => (ar ? x.why_ar : x.why_en);

  const slides = [
    {
      eyebrow: ar ? "نظرة المجلس · مباشر" : "BOARD OVERVIEW · LIVE",
      title: ar ? "حالة المؤسسة الآن" : "Enterprise State — Live",
      kpis: [
        { l: lbl(health), v: `${health.value}`, d: ar ? "صحة" : "health" },
        { l: lbl(strat), v: `${strat.value}%`, d: ar ? "تقدم" : "progress" },
        { l: lbl(velocity), v: `${velocity.value}%`, d: ar ? "سرعة" : "velocity" },
        {
          l: ar ? "تنبيهات مفتوحة" : "Open alerts",
          v: `${data.counts.openAlerts}`,
          d: `${critical} crit / ${high} high`,
        },
      ],
      body: why(health),
    },
    {
      eyebrow: ar ? "الأولويات الاستراتيجية" : "STRATEGIC PRIORITIES",
      title: ar ? "محفظة المبادرات والقرارات" : "Initiatives & Decisions Portfolio",
      kpis: [
        { l: lbl(strat), v: `${strat.value}%`, d: ar ? "مرجَّح بالأثر" : "impact-weighted" },
        { l: lbl(latency), v: `${latency.value}`, d: ar ? "أقل = أبطأ" : "lower = slower" },
        {
          l: ar ? "أحداث متتبعة" : "Tracked events",
          v: `${data.counts.events}`,
          d: ar ? "إجمالي" : "total",
        },
        {
          l: ar ? "منسية" : "Forgotten",
          v: `${data.counts.forgotten}`,
          d: ar ? "تحتاج متابعة" : "need follow-up",
        },
      ],
      body: `${why(strat)} ${why(latency)}`,
    },
    {
      eyebrow: ar ? "المخاطر والمرونة" : "RISK & RESILIENCE",
      title: ar ? "محفظة المخاطر التشغيلية" : "Operational Risk Portfolio",
      kpis: [
        { l: lbl(risk), v: `${risk.value}`, d: ar ? "أعلى = أأمن" : "higher = safer" },
        { l: ar ? "حرجة" : "Critical", v: `${critical}`, d: ar ? "نشطة" : "active" },
        { l: ar ? "عالية" : "High", v: `${high}`, d: ar ? "نشطة" : "active" },
        { l: ar ? "متأخرة" : "Overdue", v: `${data.counts.overdue}`, d: ar ? "بنود" : "items" },
      ],
      body: why(risk),
    },
    {
      eyebrow: ar ? "توصيات تنفيذية" : "EXECUTIVE RECOMMENDATIONS",
      title: ar ? "فرص جاهزة للقرار" : "Opportunities Ready for Decision",
      kpis: [
        { l: lbl(opp), v: `${opp.value}`, d: ar ? "مؤشر فرص" : "opportunity index" },
        {
          l: ar ? "تنبيهات أعلى" : "Top alerts",
          v: `${data.topAlerts.length}`,
          d: ar ? "مرتبة" : "ranked",
        },
        {
          l: ar ? "مصادر مفعّلة" : "Live sources",
          v: `${data.sources.filter((s) => s.available).length}/${data.sources.length}`,
          d: ar ? "متصلة" : "connected",
        },
        { l: ar ? "صحة" : "Health", v: `${health.value}`, d: health.tone },
      ],
      body: why(opp),
    },
  ];

  const s = slides[idx];

  return (
    <NexusPage
      backdropImage="/executive-desk-bg.jpeg"
      eyebrow="BOARDROOM · LIVE"
      title={ar ? "وضع قاعة الاجتماع التنفيذية" : "Executive Boardroom Mode"}
      subtitle={
        ar
          ? "عرض تنفيذي مدفوع ببيانات النسيج الذكي مباشرة."
          : "Cinematic executive view powered by live Intelligence Fabric data."
      }
      actions={
        <>
          <NexusPill tone="violet">
            <Presentation className="h-3 w-3" /> LIVE
          </NexusPill>
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
      <NexusCard
        glow
        className={fs ? "fixed inset-4 z-50 flex flex-col" : "min-h-[520px] flex flex-col"}
      >
        <div className="flex-1">
          <div className="text-[10px] font-bold tracking-[0.35em] text-cyan-300/80">
            {s.eyebrow}
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-5xl">
            {s.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base text-slate-300">{s.body}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.kpis.map((k) => (
              <div
                key={k.l}
                className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {k.l}
                </div>
                <div className="mt-2 text-3xl font-bold text-cyan-300">{k.v}</div>
                <div className="mt-1 text-xs text-emerald-300">{k.d}</div>
              </div>
            ))}
          </div>
        </div>

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
                aria-label={`Slide ${i + 1}`}
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

      {!fs && data.topAlerts.length > 0 && (
        <NexusCard>
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "أعلى التنبيهات النشطة" : "TOP LIVE ALERTS"}
          </div>
          <div className="mt-3 grid gap-2">
            {data.topAlerts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-3">
                  <NexusPill
                    tone={
                      a.severity === "critical" ? "rose" : a.severity === "high" ? "amber" : "cyan"
                    }
                  >
                    {a.severity.toUpperCase()}
                  </NexusPill>
                  <div className="text-sm text-white">{ar ? a.title : (a.title_en ?? a.title)}</div>
                </div>
                <div className="font-mono text-xs text-slate-400">
                  impact {a.business_impact_score}
                </div>
              </div>
            ))}
          </div>
        </NexusCard>
      )}

      {!fs && <PredictionsPanel />}
    </NexusPage>
  );
}
