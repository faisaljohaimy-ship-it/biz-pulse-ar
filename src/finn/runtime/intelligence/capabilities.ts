/**
 * Executive Capability Registry — a read-only description of what the
 * intelligence layer can do. Fixed at construction, deep-frozen; the runtime
 * READS capabilities and can never modify the registry (there is no mutation
 * API). Every capability is advisory — kinds are evaluate / explain /
 * advise / observe; there is deliberately no "execute" kind.
 */
import { IntelError } from "./types";

export type ExecutiveCapabilityKind = "evaluate" | "explain" | "advise" | "observe";

export interface ExecutiveCapability {
  readonly id: string;
  readonly kind: ExecutiveCapabilityKind;
  readonly title: string;
  readonly description: string;
}

export class ExecutiveCapabilityRegistry {
  private readonly capabilities: ReadonlyMap<string, ExecutiveCapability>;
  private readonly frozen: readonly ExecutiveCapability[];

  constructor(capabilities: readonly ExecutiveCapability[]) {
    const map = new Map<string, ExecutiveCapability>();
    for (const capability of capabilities) {
      if (map.has(capability.id)) {
        throw new IntelError("capabilities", `duplicate capability "${capability.id}"`);
      }
      map.set(capability.id, Object.freeze({ ...capability }));
    }
    this.capabilities = map;
    this.frozen = Object.freeze([...map.values()]);
  }

  list(): readonly ExecutiveCapability[] {
    return this.frozen;
  }

  get(id: string): ExecutiveCapability | undefined {
    return this.capabilities.get(id);
  }

  has(id: string): boolean {
    return this.capabilities.has(id);
  }
}

/** The canonical executive capability set — descriptive data only. */
export const EXECUTIVE_CAPABILITIES: readonly ExecutiveCapability[] = [
  {
    id: "intel.evaluate-kpis",
    kind: "evaluate",
    title: "تحليل المؤشرات",
    description: "اتجاهات وشذوذ وتنبؤ وتتبع أهداف",
  },
  {
    id: "intel.draft-decision",
    kind: "advise",
    title: "صياغة قرار تنفيذي",
    description: "قرار كامل الحقول بدليل وأثر واعتمادات",
  },
  {
    id: "intel.recommend",
    kind: "advise",
    title: "توصية تنفيذية",
    description: "توصية باعتماد بشري إلزامي — لا تنفيذ تلقائي",
  },
  {
    id: "intel.explain",
    kind: "explain",
    title: "تفسير القرار",
    description: "لماذا، لماذا لا، البدائل، الأثر، الثقة، الدليل",
  },
  {
    id: "intel.snapshot",
    kind: "observe",
    title: "لقطة تنفيذية",
    description: "صورة لحظية مجمّدة للمؤشرات والمخاطر والقرارات",
  },
  {
    id: "intel.timeline",
    kind: "observe",
    title: "الخط الزمني الاستراتيجي",
    description: "أهداف وتوصيات واعتمادات وحوادث ومعالم",
  },
  {
    id: "intel.event-stream",
    kind: "observe",
    title: "سجل الأحداث التنفيذية",
    description: "أحداث مرتبة قابلة للبحث وإعادة التشغيل",
  },
  {
    id: "intel.insights",
    kind: "evaluate",
    title: "الرؤى التنفيذية",
    description: "استخلاص رؤى مرتبة بالخطورة من المؤشرات والمخاطر",
  },
];
