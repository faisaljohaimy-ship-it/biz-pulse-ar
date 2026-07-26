/**
 * NxCockpitPage — the cockpit page implementation, colocated as a
 * non-route helper (dash prefix) so the router auto-code-splits the
 * route: the entry bundle no longer carries this page, and hydration
 * on every route gets lighter. Logic unchanged.
 */
import * as React from "react";
import { REGIONS } from "@/lib/regions";
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
  type NxFinnState,
  type NxPipelineStage,
  type NxStackLayerId,
  type NxTickerEvent,
} from "@/components/nx";

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

const SEED_EVENTS: readonly NxTickerEvent[] = [
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

/** Quick actions: each drives FINN to a new advisory recommendation. */
const QUICK_ACTIONS: readonly { label: string; recommendation: string }[] = [
  {
    label: "ملخص الوردية",
    recommendation:
      "ملخص الوردية: 128 تصريحًا نشطًا، 9 بلاغات مفتوحة، لا أحداث حرجة — يُوصى بمراجعة بلاغَي المحول 4 قبل التسليم.",
  },
  {
    label: "حالة التصاريح",
    recommendation:
      "حالة التصاريح: 3 تصاريح عمل ساخن تنتظر اعتماد مدير المنطقة — يُوصى بالبت قبل ذروة الظهيرة.",
  },
  {
    label: "خريطة المخاطر",
    recommendation:
      "خريطة المخاطر: تركّز المخاطر في محيط المحول 4 — يُوصى بتقديم موعد الصيانة قبل ذروة الحمل.",
  },
];

const DEFAULT_RECOMMENDATION =
  "التوصية الحالية: تقديم موعد صيانة المحول رقم 4 قبل ذروة الحمل — بانتظار الاعتماد.";

export function NxCockpitPage() {
  const [activeLayer, setActiveLayer] = React.useState<NxStackLayerId>("intelligence");
  const [activeStage, setActiveStage] = React.useState<NxPipelineStage>("approval");
  const [approvalPending, setApprovalPending] = React.useState(true);
  const [finnState, setFinnState] = React.useState<NxFinnState>("idle");
  const [recommendation, setRecommendation] = React.useState(DEFAULT_RECOMMENDATION);
  const [voice, setVoice] = React.useState<"idle" | "listening">("idle");
  const [events, setEvents] = React.useState<readonly NxTickerEvent[]>(SEED_EVENTS);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const pushEvent = (kind: NxTickerEvent["kind"], text: string) => {
    setEvents((current) => [
      { id: `live-${current.length + 1}`, kind, text, time: "الآن" },
      ...current,
    ]);
  };

  /** Quick action: FINN thinks, then speaks a new advisory recommendation. */
  const runQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setActiveLayer("intelligence");
    setFinnState("thinking");
    pushEvent("decision", `طُلبت توصية: ${action.label}`);
    later(900, () => {
      setRecommendation(action.recommendation);
      setFinnState("speaking");
      later(2200, () => setFinnState("idle"));
    });
  };

  /** The gold gate — the ONLY road across approval (explicit human click). */
  const approveExecution = () => {
    if (!approvalPending) return;
    setApprovalPending(false);
    setActiveStage("execution");
    setActiveLayer("agents");
    setFinnState("executing");
    pushEvent("approval", "اعتمد الإنسان التوصية — بدأ التنفيذ المُشرف");
    later(1800, () => {
      setActiveStage("result");
      setActiveLayer("output-gateway");
      setFinnState("completed");
      pushEvent("execution", "اكتمل التنفيذ المعتمد — النتيجة في بوابة المخرجات");
      later(2000, () => setFinnState("idle"));
    });
  };

  /** New advisory round: back to recommendation + pending gate. */
  const newRound = () => {
    setActiveStage("approval");
    setApprovalPending(true);
    setActiveLayer("intelligence");
    setFinnState("thinking");
    setRecommendation(DEFAULT_RECOMMENDATION);
    pushEvent("audit", "بدأت جولة استشارية جديدة");
    later(900, () => setFinnState("idle"));
  };

  const toggleVoice = () => {
    setVoice((v) => {
      const next = v === "idle" ? "listening" : "idle";
      setFinnState(next === "listening" ? "listening" : "idle");
      return next;
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-nx-obsidian text-nx-pearl">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        {/* Header: identity + working navigation + live status */}
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
            <a
              href="/"
              className="inline-flex min-h-11 items-center rounded-nx-8 border border-white/14 px-3 py-1.5 text-xs text-nx-pearl/72 transition-[border-color,color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-nx-cyan hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
            >
              العودة للرئيسية
            </a>
          </div>
        </header>

        <NxLayerStack activeLayer={activeLayer} onSelectLayer={setActiveLayer} />

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

        {/* Runtime pipeline + the human gate */}
        <NxPanel
          title="مسار التشغيل"
          layer="runtime"
          density="operations"
          headerSlot={
            approvalPending ? (
              <NxButton variant="executive" size="lg" onClick={approveExecution}>
                اعتماد التنفيذ
              </NxButton>
            ) : (
              <NxButton variant="ghost" size="lg" onClick={newRound}>
                جولة جديدة
              </NxButton>
            )
          }
        >
          <NxPipelineFlow activeStage={activeStage} approvalPending={approvalPending} />
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

          {/* FINN advisory panel */}
          <NxPanel
            title="FINN"
            layer="agent"
            density="command"
            headerSlot={<NxStatusIndicator status="info" label="استشاري" />}
            footer={<span>لا تنفيذ دون اعتماد بشري</span>}
          >
            <div className="flex flex-col items-center gap-4">
              <NxFinnPresence state={finnState} mode="advisory" size="lg" />
              <p aria-live="polite" className="text-center text-sm text-nx-pearl/72">
                {recommendation}
              </p>
              <NxVoiceButton state={voice} onClick={toggleVoice} aria-label="تحدث إلى FINN" />
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <NxButton
                    key={action.label}
                    variant="ghost"
                    size="lg"
                    onClick={() => runQuickAction(action)}
                  >
                    {action.label}
                  </NxButton>
                ))}
              </div>
            </div>
          </NxPanel>
        </div>

        {/* Live event ticker — grows as the cockpit is used */}
        <NxPanel title="الأحداث" layer="analytics" density="operations">
          <NxEventTicker events={events} />
        </NxPanel>
      </main>
    </div>
  );
}
