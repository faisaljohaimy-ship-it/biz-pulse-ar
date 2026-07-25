/**
 * /nx-cockpit · قمرة القيادة التنفيذية — Phase 6 showcase surface.
 *
 * ADDITIVE ONLY: this route demonstrates the ratified Nx design language
 * (docs/design + docs/components + docs/motion) assembled into the
 * executive cockpit composition. It is intentionally NOT wired into any
 * navigation — architecture, nav and existing pages are untouched. All
 * data is static reference simulation, badged per the transparency law.
 */
import { createFileRoute } from "@tanstack/react-router";
import { REGIONS } from "@/lib/regions";
import { DOMAIN_URL } from "@/lib/domain";
import {
  NxLayerStack,
  NxPipelineFlow,
  NxEventTicker,
  NxPanel,
  NxKpiCard,
  NxFinnPresence,
  NxVoiceButton,
  NxButton,
  NxRegionPulse,
  NxTwinNode,
  NxStatusIndicator,
  type NxTickerEvent,
} from "@/components/nx";

export const Route = createFileRoute("/nx-cockpit")({
  head: () => ({
    meta: [
      { title: "قمرة القيادة التنفيذية · NX Cockpit — NEXIOS AI OS" },
      {
        name: "description",
        content: "عرض لغة التصميم التنفيذية الموحّدة لنظام نكسيوس — محاكاة مرجعية.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${DOMAIN_URL}/nx-cockpit` }],
  }),
  component: NxCockpitPage,
});

const SIM_UPDATED = "قبل دقيقتين · محاكاة";

const KPIS = [
  {
    label: "جاهزية المنشآت",
    value: 97.2,
    unit: "٪",
    delta: { value: 1.4, goodDirection: "up" as const },
  },
  { label: "تصاريح نشطة", value: 128, delta: { value: 6, goodDirection: "up" as const } },
  { label: "بلاغات مفتوحة", value: 9, delta: { value: -3, goodDirection: "down" as const } },
  {
    label: "امتثال HCIS",
    value: 94.6,
    unit: "٪",
    delta: { value: 0.8, goodDirection: "up" as const },
  },
  {
    label: "زمن استجابة الوكلاء",
    value: 1.8,
    unit: "ث",
    delta: { value: -0.2, goodDirection: "down" as const },
  },
];

const TICKER_EVENTS: readonly NxTickerEvent[] = [
  {
    id: "t1",
    kind: "decision",
    text: "اعتُمدت خطة الاستجابة الموسمية للمنطقة الشرقية",
    time: "09:41",
  },
  { id: "t2", kind: "approval", text: "تصريح عمل ساخن بانتظار اعتماد مدير المنطقة", time: "09:38" },
  {
    id: "t3",
    kind: "execution",
    text: "أُنجزت جولة التفتيش الدورية — محطة التحلية الغربية",
    time: "09:27",
  },
  { id: "t4", kind: "alert", text: "ارتفاع حرارة المحول رقم 4 ضمن النطاق المراقب", time: "09:15" },
  { id: "t5", kind: "audit", text: "اكتمل تدقيق صلاحيات الوصول للربع الحالي", time: "08:52" },
];

const TWIN_NODES = [
  { name: "محطة التوليد", status: "success" as const },
  { name: "شبكة النقل", status: "success" as const },
  { name: "المحول 4", status: "warning" as const },
  { name: "مركز التحكم", status: "info" as const },
];

const QUICK_ACTIONS = ["ملخص الوردية", "حالة التصاريح", "خريطة المخاطر"];

function NxCockpitPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-nx-obsidian text-nx-pearl">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        {/* Header: identity + the five strata */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">قمرة القيادة التنفيذية</h1>
            <p className="text-sm text-nx-pearl/56">
              نظام نكسيوس التشغيلي — عرض مرجعي بلغة التصميم الموحّدة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NxStatusIndicator status="success" label="بث مباشر" live />
            <span className="rounded-nx-8 border border-nx-warning/40 px-2 py-0.5 text-[11px] text-nx-warning">
              محاكاة مرجعية
            </span>
          </div>
        </header>

        <NxLayerStack activeLayer="intelligence" />

        {/* KPI row */}
        <section
          aria-label="مؤشرات الأداء"
          className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
        >
          {KPIS.map((kpi) => (
            <NxKpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              updatedAt={SIM_UPDATED}
              simulation
            />
          ))}
        </section>

        {/* Runtime pipeline */}
        <NxPanel title="مسار التشغيل" layer="runtime" density="operations">
          <NxPipelineFlow activeStage="approval" approvalPending />
        </NxPanel>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Digital twin zone */}
          <NxPanel
            title="التوأم الرقمي"
            layer="twin"
            density="command"
            className="lg:col-span-2"
            footer={<span>{SIM_UPDATED}</span>}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-around gap-4">
                {REGIONS.map((region) => (
                  <div key={region.id} className="flex flex-col items-center gap-2">
                    <NxRegionPulse regionId={region.id} live size={56} />
                    <span className="text-xs text-nx-pearl/72">{region.shortAr}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-around gap-4 border-t border-white/10 pt-4">
                {TWIN_NODES.map((node) => (
                  <NxTwinNode key={node.name} name={node.name} status={node.status} />
                ))}
              </div>
            </div>
          </NxPanel>

          {/* FINN holographic panel */}
          <NxPanel
            title="FINN"
            layer="agent"
            density="command"
            headerSlot={<NxStatusIndicator status="info" label="استشاري" />}
            footer={<span>لا تنفيذ دون اعتماد بشري</span>}
          >
            <div className="flex flex-col items-center gap-4">
              <NxFinnPresence state="thinking" mode="advisory" size="lg" />
              <p className="text-center text-sm text-nx-pearl/72">
                التوصية الحالية: تقديم موعد صيانة المحول رقم 4 قبل ذروة الحمل — بانتظار الاعتماد.
              </p>
              <NxVoiceButton state="idle" aria-label="تحدث إلى FINN" />
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <NxButton key={action} variant="ghost" size="lg">
                    {action}
                  </NxButton>
                ))}
              </div>
            </div>
          </NxPanel>
        </div>

        {/* Live event ticker */}
        <NxPanel title="الأحداث" layer="analytics" density="operations">
          <NxEventTicker events={TICKER_EVENTS} />
        </NxPanel>
      </main>
    </div>
  );
}
