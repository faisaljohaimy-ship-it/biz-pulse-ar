/**
 * Executive cockpit data layer — typed view-model contracts + the demo
 * repository (reference simulation).
 *
 * Boundary law (package 05): raw network JSON never reaches components —
 * everything below is a validated, normalized view model. The demo
 * repository is the EXPLICIT Demo Mode adapter of this showcase page: all
 * values are reference simulation (is_simulation semantics, amber badge in
 * the page header), derived from the package seed and adapted to the four
 * frozen regions of src/lib/regions.ts. It is never a silent fallback for
 * a failed production API — it IS the declared mode of this page.
 */
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

// ── Reference types (package §6) ─────────────────────────────────────────

export type HealthState = "healthy" | "warning" | "critical" | "unknown";
export type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "stale";
export type MapMode = "3d" | "layers" | "heat" | "live";
export type ExperienceLevel = "executive" | "operational" | "technical";

export interface MetricValue {
  id: string;
  labelAr: string;
  labelEn?: string;
  value: number;
  unit?: string;
  trend?: number;
  /** Direction that is GOOD for this metric (deltas are direction-aware). */
  goodDirection: "up" | "down";
  status: HealthState;
  source: string;
  lastUpdatedAt: string;
  history: readonly number[];
}

export interface ArchitectureLayerInfo {
  id: "shell" | "intelligence" | "platform" | "agents" | "output";
  order: number;
  labelAr: string;
  labelEn: string;
  status: HealthState;
  latencyMs: number;
  errorRate: number;
  inputAr: string;
  outputAr: string;
  lastTraceId: string;
}

export interface RuntimeStageInfo {
  id: "request" | "analysis" | "retrieval" | "recommendation" | "approval" | "execution" | "result";
  labelAr: string;
  status: HealthState;
  durationMs: number;
  traceId: string;
}

export interface RegionSnapshot {
  regionId: RegionId;
  labelAr: string;
  accentHex: string;
  readiness: number;
  trend: number;
  status: HealthState;
  openIncidents: number;
  activePermits: number;
  history: readonly number[];
  recommendationAr: string;
}

export interface SadeedSnapshot {
  status: "connected" | "disconnected" | "busy" | "not-configured";
  recommendationAr: string;
  recommendationRegionId: RegionId;
  confidence: number;
  sourceCount: number;
}

export interface CapabilityInfo {
  id: "shell" | "agents" | "rag" | "integrations" | "performance" | "risk";
  labelAr: string;
  labelEn: string;
  primaryValue: number;
  primaryLabelAr: string;
  secondaryAr: string;
  status: HealthState;
}

export type EventSeverity = "success" | "warning" | "critical" | "info";

export interface CockpitEvent {
  id: string;
  time: string;
  severity: EventSeverity;
  titleAr: string;
  detailAr: string;
  source: string;
}

export interface NotificationItem {
  id: string;
  titleAr: string;
  detailAr: string;
  time: string;
  severity: EventSeverity;
  read: boolean;
}

export interface CockpitSnapshot {
  generatedAtLabel: string;
  simulation: true;
  processingSpeed: number;
  layers: readonly ArchitectureLayerInfo[];
  runtimeFlow: readonly RuntimeStageInfo[];
  metrics: readonly MetricValue[];
  regions: readonly RegionSnapshot[];
  sadeed: SadeedSnapshot;
  capabilities: readonly CapabilityInfo[];
  events: readonly CockpitEvent[];
  notifications: readonly NotificationItem[];
  pendingDecisions: readonly {
    id: string;
    titleAr: string;
    regionId: RegionId;
    impactAr: string;
  }[];
}

export interface CockpitCommand {
  actionId: string;
  payload?: Readonly<Record<string, string | number | boolean>>;
}

export interface ActionResult {
  ok: boolean;
  messageAr: string;
  correlationId: string;
}

export interface ExecutiveCockpitRepository {
  getSnapshot(signal?: AbortSignal): Promise<CockpitSnapshot>;
  getRegion(regionId: RegionId, signal?: AbortSignal): Promise<RegionSnapshot>;
  getEventStream(signal?: AbortSignal): AsyncIterable<CockpitEvent>;
  executeAction(command: CockpitCommand, signal?: AbortSignal): Promise<ActionResult>;
}

// ── Demo repository (reference simulation, four regions) ─────────────────

const SIM_TIME = "قبل دقيقتين · محاكاة مرجعية";

interface RegionSeed {
  readiness: number;
  trend: number;
  status: HealthState;
  openIncidents: number;
  activePermits: number;
  history: readonly number[];
  recommendationAr: string;
}

const REGION_SEED: Record<RegionId, RegionSeed> = {
  central: {
    readiness: 97,
    trend: 6.2,
    status: "healthy",
    openIncidents: 2,
    activePermits: 41,
    history: [91, 93, 92, 95, 96, 97],
    recommendationAr:
      "المنطقة الوسطى: يوصى بتثبيت وتيرة الجولات الوقائية الحالية — الجاهزية مستقرة فوق 95٪.",
  },
  western: {
    readiness: 96,
    trend: 7.3,
    status: "healthy",
    openIncidents: 3,
    activePermits: 38,
    history: [88, 90, 92, 93, 95, 96],
    recommendationAr:
      "المنطقة الغربية: يوصى بتقديم صيانة محطة التحلية قبل ذروة الصيف لتثبيت الجاهزية.",
  },
  eastern: {
    readiness: 98,
    trend: 9.1,
    status: "healthy",
    openIncidents: 1,
    activePermits: 52,
    history: [90, 92, 94, 95, 97, 98],
    recommendationAr:
      "المنطقة الشرقية: يوصى بزيادة الاستثمار التشغيلي لتعظيم العائد وتقليل المخاطر في الربع القادم.",
  },
  southern: {
    readiness: 93,
    trend: 4.8,
    status: "warning",
    openIncidents: 5,
    activePermits: 27,
    history: [89, 90, 91, 90, 92, 93],
    recommendationAr:
      "المنطقة الجنوبية: يوصى بمعالجة البلاغات الخمسة المفتوحة قبل نهاية الأسبوع — الاتجاه إيجابي لكنه الأبطأ.",
  },
};

function buildRegions(): RegionSnapshot[] {
  return REGIONS.map((region) => {
    const seed = REGION_SEED[region.id];
    return {
      regionId: region.id,
      labelAr: region.shortAr,
      accentHex: REGION_ACCENT_HEX[region.id],
      ...seed,
    };
  });
}

function buildSnapshot(): CockpitSnapshot {
  return {
    generatedAtLabel: SIM_TIME,
    simulation: true,
    processingSpeed: 2548,
    layers: [
      {
        id: "shell",
        order: 1,
        labelAr: "القشرة التنفيذية",
        labelEn: "EXECUTIVE SHELL",
        status: "healthy",
        latencyMs: 18,
        errorRate: 0.1,
        inputAr: "طلبات القادة والسياق التنفيذي",
        outputAr: "نوايا مهيكلة نحو طبقة الذكاء",
        lastTraceId: "trc-sh-4821",
      },
      {
        id: "intelligence",
        order: 2,
        labelAr: "ذكاء القيادة التنفيذي",
        labelEn: "EXECUTIVE INTELLIGENCE",
        status: "healthy",
        latencyMs: 42,
        errorRate: 0.2,
        inputAr: "النوايا المهيكلة والسياسات",
        outputAr: "تحليل وتفسير وخطط مرشحة",
        lastTraceId: "trc-in-4821",
      },
      {
        id: "platform",
        order: 3,
        labelAr: "منصة التشغيل",
        labelEn: "PLATFORM RUNTIME",
        status: "healthy",
        latencyMs: 31,
        errorRate: 0.1,
        inputAr: "استعلامات البيانات المصرح بها",
        outputAr: "لقطات بيانات موثوقة الموارد",
        lastTraceId: "trc-pl-4821",
      },
      {
        id: "agents",
        order: 4,
        labelAr: "تشغيل الوكلاء",
        labelEn: "AGENT RUNTIME",
        status: "healthy",
        latencyMs: 67,
        errorRate: 0.4,
        inputAr: "خطط معتمدة من البوابة البشرية",
        outputAr: "توصيات وتنفيذ مُشرف عليه",
        lastTraceId: "trc-ag-4821",
      },
      {
        id: "output",
        order: 5,
        labelAr: "بوابة الإخراج",
        labelEn: "OUTPUT GATEWAY",
        status: "warning",
        latencyMs: 84,
        errorRate: 1.2,
        inputAr: "نتائج التنفيذ الموقعة",
        outputAr: "تقارير ونتائج نحو القنوات",
        lastTraceId: "trc-ou-4821",
      },
    ],
    runtimeFlow: [
      { id: "request", labelAr: "الطلب", status: "healthy", durationMs: 12, traceId: "trc-fl-01" },
      {
        id: "analysis",
        labelAr: "التحليل",
        status: "healthy",
        durationMs: 40,
        traceId: "trc-fl-02",
      },
      {
        id: "retrieval",
        labelAr: "الاسترجاع",
        status: "healthy",
        durationMs: 27,
        traceId: "trc-fl-03",
      },
      {
        id: "recommendation",
        labelAr: "التوصية",
        status: "healthy",
        durationMs: 64,
        traceId: "trc-fl-04",
      },
      {
        id: "approval",
        labelAr: "الاعتماد",
        status: "warning",
        durationMs: 310,
        traceId: "trc-fl-05",
      },
      {
        id: "execution",
        labelAr: "التنفيذ",
        status: "healthy",
        durationMs: 91,
        traceId: "trc-fl-06",
      },
      { id: "result", labelAr: "النتيجة", status: "healthy", durationMs: 16, traceId: "trc-fl-07" },
    ],
    metrics: [
      {
        id: "systemHealth",
        labelAr: "صحة النظام",
        labelEn: "SYSTEM HEALTH",
        value: 97,
        unit: "٪",
        trend: 2.1,
        goodDirection: "up",
        status: "healthy",
        source: "المراقبة التشغيلية",
        lastUpdatedAt: SIM_TIME,
        history: [94, 95, 96, 95, 96, 97],
      },
      {
        id: "overallProgress",
        labelAr: "معدل الإنجاز العام",
        labelEn: "OVERALL PROGRESS",
        value: 84,
        unit: "٪",
        trend: 8.6,
        goodDirection: "up",
        status: "healthy",
        source: "محفظة المبادرات",
        lastUpdatedAt: SIM_TIME,
        history: [70, 74, 77, 80, 82, 84],
      },
      {
        id: "smartDecisions",
        labelAr: "القرارات الذكية",
        labelEn: "SMART DECISIONS",
        value: 348,
        goodDirection: "up",
        trend: 26,
        status: "healthy",
        source: "محرك القرار",
        lastUpdatedAt: SIM_TIME,
        history: [280, 295, 310, 322, 340, 348],
      },
      {
        id: "criticalAlerts",
        labelAr: "التنبيهات الحرجة",
        labelEn: "CRITICAL ALERTS",
        value: 3,
        goodDirection: "down",
        trend: -1,
        status: "critical",
        source: "المخاطر والتنبيهات",
        lastUpdatedAt: SIM_TIME,
        history: [7, 6, 5, 5, 4, 3],
      },
      {
        id: "financialImpact",
        labelAr: "التأثير المالي",
        labelEn: "FINANCIAL IMPACT",
        value: 18.7,
        unit: "م.ر",
        trend: 12,
        goodDirection: "up",
        status: "healthy",
        source: "التحليلات المالية",
        lastUpdatedAt: SIM_TIME,
        history: [11, 13, 14.5, 16, 17.6, 18.7],
      },
    ],
    regions: buildRegions(),
    sadeed: {
      status: "connected",
      recommendationAr: REGION_SEED.eastern.recommendationAr,
      recommendationRegionId: "eastern",
      confidence: 0.91,
      sourceCount: 24,
    },
    capabilities: [
      {
        id: "shell",
        labelAr: "القشرة التكيفية",
        labelEn: "ADAPTIVE SHELL",
        primaryValue: 248,
        primaryLabelAr: "مهارة موصوفة",
        secondaryAr: "72 وكيلًا · 180 أداة — وضع الوصف فقط",
        status: "healthy",
      },
      {
        id: "agents",
        labelAr: "شبكة الوكلاء",
        labelEn: "AGENT ORCHESTRATION",
        primaryValue: 24,
        primaryLabelAr: "وكيلًا نشطًا",
        secondaryAr: "6 شبكات فرعية تحت الإشراف البشري",
        status: "healthy",
      },
      {
        id: "rag",
        labelAr: "المعرفة وRAG",
        labelEn: "KNOWLEDGE & RAG",
        primaryValue: 24856,
        primaryLabelAr: "وثيقة مفهرسة",
        secondaryAr: "دقة استرجاع 98.3٪",
        status: "healthy",
      },
      {
        id: "integrations",
        labelAr: "التكاملات",
        labelEn: "INTEGRATIONS",
        primaryValue: 6,
        primaryLabelAr: "تكاملات نشطة",
        secondaryAr: "تكاملان بانتظار التهيئة",
        status: "warning",
      },
      {
        id: "performance",
        labelAr: "الأداء الاستراتيجي",
        labelEn: "STRATEGIC PERFORMANCE",
        primaryValue: 12,
        primaryLabelAr: "نمو ٪ عن الربع",
        secondaryAr: "الأداء المالي والكفاءة التشغيلية",
        status: "healthy",
      },
      {
        id: "risk",
        labelAr: "المخاطر والامتثال",
        labelEn: "RISK & COMPLIANCE",
        primaryValue: 98,
        primaryLabelAr: "امتثال ٪",
        secondaryAr: "3 مخاطر مفتوحة قيد المعالجة",
        status: "healthy",
      },
    ],
    events: [
      {
        id: "evt-1145",
        time: "11:45",
        severity: "success",
        titleAr: "تم تنفيذ مبادرة بنجاح",
        detailAr: "تحسين سلسلة الإمداد",
        source: "سَدِيد",
      },
      {
        id: "evt-1143",
        time: "11:43",
        severity: "critical",
        titleAr: "تنبيه مخاطر عالٍ",
        detailAr: "المنطقة الشرقية — مراقبة الحمل",
        source: "SENTRY",
      },
      {
        id: "evt-1141",
        time: "11:41",
        severity: "warning",
        titleAr: "طلب موافقة",
        detailAr: "موازنة مشروع الخريطة الشمسية",
        source: "الموافقات",
      },
      {
        id: "evt-1139",
        time: "11:39",
        severity: "success",
        titleAr: "تم تحديث البيانات",
        detailAr: "المنطقة الوسطى",
        source: "منصة التشغيل",
      },
      {
        id: "evt-1137",
        time: "11:37",
        severity: "info",
        titleAr: "تقرير يومي جاهز",
        detailAr: "الذكاء التنفيذي",
        source: "سَدِيد",
      },
      {
        id: "evt-1135",
        time: "11:35",
        severity: "success",
        titleAr: "تم إنشاء مهمة",
        detailAr: "مراجعة عقود الموردين",
        source: "سير العمل",
      },
    ],
    notifications: [
      {
        id: "ntf-1",
        titleAr: "3 تنبيهات حرجة تحتاج تدخلًا",
        detailAr: "محول المنطقة الغربية ضمن النطاق المراقب",
        time: "11:43",
        severity: "critical",
        read: false,
      },
      {
        id: "ntf-2",
        titleAr: "طلب اعتماد معلق",
        detailAr: "موازنة مشروع الخريطة الشمسية",
        time: "11:41",
        severity: "warning",
        read: false,
      },
      {
        id: "ntf-3",
        titleAr: "تقرير الأداء الأسبوعي جاهز",
        detailAr: "بانتظار المراجعة التنفيذية",
        time: "10:58",
        severity: "info",
        read: false,
      },
      {
        id: "ntf-4",
        titleAr: "اكتمل تدقيق الصلاحيات",
        detailAr: "دورة الربع الحالي",
        time: "09:12",
        severity: "success",
        read: true,
      },
    ],
    pendingDecisions: [
      {
        id: "dec-1",
        titleAr: "تقديم صيانة المحول 4",
        regionId: "western",
        impactAr: "خفض مخاطر انقطاع الذروة",
      },
      {
        id: "dec-2",
        titleAr: "توسعة فريق الاستجابة الجنوبي",
        regionId: "southern",
        impactAr: "تقليص زمن الاستجابة 18٪",
      },
      {
        id: "dec-3",
        titleAr: "اعتماد موازنة الخريطة الشمسية",
        regionId: "eastern",
        impactAr: "أثر مالي +2.1 م.ر",
      },
    ],
  };
}

/** Simulated network latency that still honors AbortSignal. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

const LIVE_EVENT_POOL: readonly Omit<CockpitEvent, "id" | "time">[] = [
  {
    severity: "info",
    titleAr: "نبض بيانات جديد",
    detailAr: "تحدّثت لقطة المؤشرات التشغيلية",
    source: "منصة التشغيل",
  },
  {
    severity: "success",
    titleAr: "أُنجزت جولة تفتيش",
    detailAr: "محطة التوليد — بلا ملاحظات",
    source: "العمليات",
  },
  {
    severity: "warning",
    titleAr: "اقتراب موعد تصريح",
    detailAr: "تصريح عمل ساخن ينتهي خلال ساعة",
    source: "التصاريح",
  },
  {
    severity: "info",
    titleAr: "توصية جديدة من سَدِيد",
    detailAr: "إعادة جدولة صيانة وقائية",
    source: "سَدِيد",
  },
  {
    severity: "success",
    titleAr: "اكتمل تنفيذ معتمد",
    detailAr: "النتيجة في بوابة الإخراج",
    source: "بوابة الإخراج",
  },
];

export interface DemoRepositoryOptions {
  /** Base latency for reads (ms). Tests pass 0. */
  latencyMs?: number;
  /** Interval between live events (ms). Tests pass a small number. */
  eventIntervalMs?: number;
}

export function createDemoCockpitRepository(
  options: DemoRepositoryOptions = {},
): ExecutiveCockpitRepository {
  const { latencyMs = 300, eventIntervalMs = 14_000 } = options;
  let liveCounter = 0;

  return {
    async getSnapshot(signal) {
      await wait(latencyMs, signal);
      return buildSnapshot();
    },

    async getRegion(regionId, signal) {
      await wait(Math.max(80, latencyMs / 2), signal);
      const region = buildRegions().find((r) => r.regionId === regionId);
      if (!region) throw new Error("منطقة غير معروفة خارج المرجع الجغرافي");
      return region;
    },

    async *getEventStream(signal) {
      while (!signal?.aborted) {
        try {
          await wait(eventIntervalMs, signal);
        } catch {
          return; // aborted — end the stream quietly
        }
        const seed = LIVE_EVENT_POOL[liveCounter % LIVE_EVENT_POOL.length];
        liveCounter += 1;
        const now = new Date();
        yield {
          ...seed,
          id: `live-${now.getTime()}-${liveCounter}`,
          time: now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
        };
      }
    },

    async executeAction(command, signal) {
      await wait(Math.max(200, latencyMs), signal);
      const correlationId = `sim-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
      return {
        ok: true,
        messageAr: "سُجل الإجراء في بيئة المحاكاة المرجعية — لا أثر إنتاجي.",
        correlationId,
      };
    },
  };
}
