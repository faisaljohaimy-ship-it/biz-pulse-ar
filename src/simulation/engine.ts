/**
 * Thirteen-agent live simulation engine (constitution art. 23).
 *
 * A DETERMINISTIC, seeded reference simulation of the thirteen NEXIOS agents by
 * their registry names. Given the same seed it produces the exact same event
 * sequence every session — so an executive demo is reproducible, never random.
 *
 * Design:
 *  - Pure core: `stepState(state)` advances one logical tick with a seeded RNG
 *    embedded in the state — no timers, no Date, no globals — so it is unit-
 *    testable and replay-stable. Wall-clock is added only for display, in the
 *    runtime wrapper, and never feeds the RNG.
 *  - Runtime wrapper: `SimulationEngine` drives the pure core on ONE central
 *    interval and auto-stops when the tab is hidden (visibilitychange), so a
 *    backgrounded demo burns no CPU. Subscribers get an immutable snapshot.
 *
 * Everything emitted is tagged `is_simulation: true` — this is reference
 * demonstration data, NEVER presented as real execution (constitution art. 23).
 */

// ── The thirteen agents (exact registry ids) ──────────────────────────────

export type AgentCategory =
  | "compliance"
  | "data-ai"
  | "agent-platform"
  | "executive"
  | "engineering"
  | "security"
  | "operations";

export interface AgentDescriptor {
  id: string;
  nameAr: string;
  nameEn: string;
  category: AgentCategory;
  specialtyAr: string;
  /** Rotating specialty tasks shown while the agent is analyzing/executing. */
  tasksAr: readonly string[];
}

/** The thirteen, named from packs/…/registry/agents.registry.json. Some roles
 *  map to the nearest registry agent where no exact one exists (noted in the
 *  task brief): RLS-audit→ISO 27001 auditor, Arabic/RTL→accessibility lead,
 *  PTW→HSE assurance, operational-reporting→records governance. */
export const THIRTEEN_AGENTS: readonly AgentDescriptor[] = [
  {
    id: "nx_hcis_compliance_lead",
    nameAr: "قائد امتثال HCIS",
    nameEn: "HCIS Compliance Lead",
    category: "compliance",
    specialtyAr: "توجيهات SEC-01..19",
    tasksAr: ["يفحص توجيه SEC-18", "يطابق حالة المحطات", "يحدّث مصفوفة الامتثال"],
  },
  {
    id: "nx_rag_knowledge_director",
    nameAr: "مدير المعرفة وRAG",
    nameEn: "RAG & Knowledge Director",
    category: "data-ai",
    specialtyAr: "الاسترجاع والفهرسة",
    tasksAr: ["يفهرس مقاطع المعرفة", "يسترجع أدلة مرجعية", "يحدّث فهرس المتجهات"],
  },
  {
    id: "nx_human_approval_coordinator",
    nameAr: "منسّق الموافقات البشرية",
    nameEn: "Human-Approval Coordinator",
    category: "agent-platform",
    specialtyAr: "بوابة الاعتماد البشري",
    tasksAr: ["يعرض طلبًا بانتظار اعتماد بشري", "يوثّق قرار المعتمِد", "يقفل الطلب المنفّذ"],
  },
  {
    id: "nx_iso27001_auditor",
    nameAr: "مدقّق ISO 27001",
    nameEn: "ISO 27001 Auditor",
    category: "compliance",
    specialtyAr: "تدقيق عزل الصفوف RLS",
    tasksAr: ["يتحقق من عزل المؤسسات", "يفحص سياسة صف", "يوثّق نتيجة التدقيق"],
  },
  {
    id: "nx_observability_trace_agent",
    nameAr: "وكيل تتبّع الرصد",
    nameEn: "Observability Trace Agent",
    category: "agent-platform",
    specialtyAr: "صحة النظام والمؤشرات",
    tasksAr: ["يراقب زمن الاستجابة", "يرصد انحراف مؤشر", "يجمّع أثر تتبّع"],
  },
  {
    id: "nx_board_briefing_director",
    nameAr: "مدير إحاطات مجلس الإدارة",
    nameEn: "Board-Briefing Director",
    category: "executive",
    specialtyAr: "التقارير التنفيذية",
    tasksAr: ["يلخّص موقفًا للإدارة", "يجهّز إحاطة مجلس", "يبرز القرار المطلوب"],
  },
  {
    id: "nx_enterprise_risk_director",
    nameAr: "مدير المخاطر المؤسسية",
    nameEn: "Enterprise-Risk Director",
    category: "executive",
    specialtyAr: "إدارة المخاطر",
    tasksAr: ["يقيّم مخاطرة محطة", "يقارن بالحدود المعتمدة", "يصعّد بلاغًا حرجًا"],
  },
  {
    id: "nx_governance_assurance_director",
    nameAr: "مدير ضمان الحوكمة",
    nameEn: "Governance-Assurance Director",
    category: "executive",
    specialtyAr: "الحوكمة والسياسات",
    tasksAr: ["يراجع سياسة وصول", "يتحقق من مسار تدقيق", "يوثّق ضبطًا حوكميًا"],
  },
  {
    id: "nx_accessibility_quality_lead",
    nameAr: "قائد جودة إمكانية الوصول",
    nameEn: "Accessibility-Quality Lead",
    category: "engineering",
    specialtyAr: "العربية وRTL",
    tasksAr: ["يفحص اتجاه RTL", "يتحقق من تباين لوني", "يدقّق تسمية عنصر"],
  },
  {
    id: "nx_hse_assurance_director",
    nameAr: "مدير ضمان الصحة والسلامة",
    nameEn: "HSE-Assurance Director",
    category: "security",
    specialtyAr: "تصاريح العمل PTW",
    tasksAr: ["يراجع تصريح عمل", "يتحقق من سلسلة الاعتماد", "يرصد تعليقًا طارئًا"],
  },
  {
    id: "nx_integration_architecture_lead",
    nameAr: "قائد معمارية التكامل",
    nameEn: "Integration-Architecture Lead",
    category: "engineering",
    specialtyAr: "جاهزية SAP/Graph",
    tasksAr: ["يتحقق من جاهزية SAP", "يفحص موصّل Graph", "يوثّق عقد تكامل"],
  },
  {
    id: "nx_operations_command_director",
    nameAr: "مدير قيادة العمليات",
    nameEn: "Operations-Command Director",
    category: "operations",
    specialtyAr: "الجدولة والعمليات اليومية",
    tasksAr: ["يجدول مهمة ميدانية", "يوازن أحمال الفرق", "يتابع بلاغًا مفتوحًا"],
  },
  {
    id: "nx_records_governance_lead",
    nameAr: "قائد حوكمة السجلات",
    nameEn: "Records-Governance Lead",
    category: "compliance",
    specialtyAr: "التقارير التشغيلية والامتثالية",
    tasksAr: ["يوثّق تقرير PTW دوري", "يؤرشف سجل امتثال", "يجهّز مخرج تدقيق"],
  },
];

// ── State model ───────────────────────────────────────────────────────────

export type AgentPhase = "idle" | "analyzing" | "executing" | "reporting";

/** The seven-stage data-flow, mirrored by the cockpit's runtime flow band. */
export const FLOW_STAGES = [
  "request",
  "analysis",
  "retrieval",
  "recommendation",
  "approval",
  "execution",
  "result",
] as const;
export type FlowStage = (typeof FLOW_STAGES)[number];

const PHASE_ORDER: readonly AgentPhase[] = ["idle", "analyzing", "executing", "reporting"];

export interface AgentRuntime {
  descriptor: AgentDescriptor;
  phase: AgentPhase;
  taskAr: string;
  /** Monotonic count of completed report cycles — a stable activity gauge. */
  cycles: number;
}

export interface SimEvent {
  id: string;
  tick: number;
  agentId: string;
  phase: AgentPhase;
  messageAr: string;
  severity: "info" | "success" | "warning";
  is_simulation: true;
}

export interface SimState {
  seed: number;
  rng: number;
  tick: number;
  agents: AgentRuntime[];
  flowStage: FlowStage;
  events: SimEvent[];
  is_simulation: true;
}

export interface SimSnapshot {
  tick: number;
  agents: readonly AgentRuntime[];
  flowStage: FlowStage;
  events: readonly SimEvent[];
  agentCount: number;
  is_simulation: true;
}

const EVENT_CAP = 60;

// ── Seeded RNG (mulberry32) — deterministic, embedded in state ────────────

/** Advance the RNG state and return [nextRngState, unitFloat]. Pure. */
function nextRandom(rngState: number): [number, number] {
  let t = (rngState + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [next, value];
}

// ── Pure core ─────────────────────────────────────────────────────────────

export function createState(seed = 0x1e5): SimState {
  return {
    seed,
    rng: seed | 0,
    tick: 0,
    agents: THIRTEEN_AGENTS.map((descriptor) => ({
      descriptor,
      phase: "idle" as AgentPhase,
      taskAr: descriptor.specialtyAr,
      cycles: 0,
    })),
    flowStage: "request",
    events: [],
    is_simulation: true,
  };
}

function phaseMessage(agent: AgentRuntime): { messageAr: string; severity: SimEvent["severity"] } {
  switch (agent.phase) {
    case "analyzing":
      return { messageAr: `${agent.descriptor.nameAr}: ${agent.taskAr}`, severity: "info" };
    case "executing":
      return { messageAr: `${agent.descriptor.nameAr}: ${agent.taskAr}`, severity: "info" };
    case "reporting":
      return {
        messageAr: `${agent.descriptor.nameAr}: اكتملت الدورة — النتيجة موثّقة`,
        severity: "success",
      };
    default:
      return { messageAr: `${agent.descriptor.nameAr}: بانتظار مهمة`, severity: "info" };
  }
}

/**
 * Advance exactly one logical tick. On each tick a single agent (chosen by the
 * seeded RNG) advances to its next phase, picks its next rotating task, and
 * emits one event; the seven-stage flow advances in lock-step. Pure and
 * deterministic — same input state → same output state.
 */
export function stepState(state: SimState): SimState {
  const [rngAfterPick, pick] = nextRandom(state.rng);
  const idx = Math.floor(pick * state.agents.length) % state.agents.length;
  const [rngAfterTask, taskPick] = nextRandom(rngAfterPick);

  const tick = state.tick + 1;
  const agents = state.agents.map((agent, i) => {
    if (i !== idx) return agent;
    const nextPhase = PHASE_ORDER[(PHASE_ORDER.indexOf(agent.phase) + 1) % PHASE_ORDER.length];
    const cycles =
      nextPhase === "idle" && agent.phase === "reporting" ? agent.cycles + 1 : agent.cycles;
    const taskAr =
      nextPhase === "idle"
        ? agent.descriptor.specialtyAr
        : agent.descriptor.tasksAr[Math.floor(taskPick * agent.descriptor.tasksAr.length)];
    return { ...agent, phase: nextPhase, taskAr, cycles };
  });

  const active = agents[idx];
  const { messageAr, severity } = phaseMessage(active);
  const event: SimEvent = {
    id: `sim-${tick}-${active.descriptor.id}`,
    tick,
    agentId: active.descriptor.id,
    phase: active.phase,
    messageAr,
    severity,
    is_simulation: true,
  };

  const flowStage = FLOW_STAGES[tick % FLOW_STAGES.length];

  return {
    ...state,
    rng: rngAfterTask,
    tick,
    agents,
    flowStage,
    events: [event, ...state.events].slice(0, EVENT_CAP),
    is_simulation: true,
  };
}

export function toSnapshot(state: SimState): SimSnapshot {
  return {
    tick: state.tick,
    agents: state.agents,
    flowStage: state.flowStage,
    events: state.events,
    agentCount: state.agents.length,
    is_simulation: true,
  };
}

// ── Runtime wrapper (single interval + idle-tab auto-stop) ────────────────

export interface EngineOptions {
  seed?: number;
  /** Milliseconds between ticks (one central interval). Default 1400ms. */
  intervalMs?: number;
}

type Listener = (snapshot: SimSnapshot) => void;

export class SimulationEngine {
  private state: SimState;
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<Listener>();
  private started = false;
  private readonly onVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") this.pause();
    else if (this.started) this.resume();
  };

  constructor(options: EngineOptions = {}) {
    this.state = createState(options.seed);
    this.intervalMs = Math.max(250, options.intervalMs ?? 1400);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(toSnapshot(this.state));
    return () => this.listeners.delete(listener);
  }

  /** Begin ticking on the single central interval; auto-stops when hidden. */
  start(): void {
    if (this.started) return;
    this.started = true;
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.onVisibility);
      if (document.visibilityState === "hidden") return; // wait until visible
    }
    this.resume();
  }

  /** Stop entirely and detach listeners hooks (idempotent). */
  stop(): void {
    this.started = false;
    this.pause();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibility);
    }
  }

  private resume(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  private pause(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    this.state = stepState(this.state);
    const snapshot = toSnapshot(this.state);
    for (const listener of this.listeners) listener(snapshot);
  }
}
