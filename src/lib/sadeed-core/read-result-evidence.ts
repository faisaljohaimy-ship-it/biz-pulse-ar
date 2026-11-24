import { isRouteHidden } from "@/lib/nav/hidden-routes";

/** Existing read-tool results only. This is a presentation adapter, never an executor. */
const SOURCES = {
  sec_list_incidents: {
    rows: "incidents",
    time: "reported_at",
    route: "/sec/incidents",
    ar: "قراءة البلاغات",
    en: "Incident read",
  },
  sec_list_work_orders: {
    rows: "work_orders",
    time: "opened_at",
    route: "/sec/maintenance",
    ar: "قراءة أوامر العمل",
    en: "Work-order read",
  },
  sec_list_permits: {
    rows: "permits",
    time: "starts_at",
    route: "/sec/permits",
    ar: "قراءة تصاريح العمل",
    en: "Permit read",
  },
  sec_list_patrols: {
    rows: "patrols",
    time: "started_at",
    route: "/sec/patrols",
    ar: "قراءة الدوريات",
    en: "Patrol read",
  },
  sec_list_cctv_alerts: {
    rows: "alerts",
    time: "detected_at",
    route: "/sec/cctv",
    ar: "قراءة تنبيهات الكاميرات",
    en: "Camera-alert read",
  },
} as const;

type ReadTool = keyof typeof SOURCES;
const MAX_ROWS = 50;
const MAX_RECORDS = 12;
const MAX_PARTS = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ReadResultEvidenceView {
  readonly tool: ReadTool;
  readonly title: { readonly ar: string; readonly en: string };
  readonly route: string | null;
  readonly status: "available" | "unavailable" | "invalid";
  /** Returned-list size, including a genuine empty result; never a tenant total. */
  readonly returnedCount: number | null;
  /** Existing tools' count also describes a bounded returned sample. */
  readonly reportedSampleCount: number | null;
  readonly countMismatch: boolean;
  readonly totalCount: null;
  readonly organization: null;
  readonly region: null;
  readonly site: null;
  readonly sourceUpdatedAt: null;
  readonly queryWindow: null;
  /** Observed timestamps in the returned sample, not a query window or update time. */
  readonly sampleRecordTimes: { readonly from: string; readonly to: string } | null;
  readonly records: readonly { readonly id: string; readonly reference: string | null }[];
  readonly bounded: boolean;
}

function field(value: unknown, key: string): unknown {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}

function count(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 1_000_000
    ? value
    : null;
}

function iso(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())
    return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** Never copies names, notes, ownership fields, raw errors, or arbitrary URLs. */
export function readResultEvidence(
  toolName: unknown,
  output: unknown,
): ReadResultEvidenceView | null {
  if (typeof toolName !== "string" || !Object.hasOwn(SOURCES, toolName)) return null;
  const tool = toolName as ReadTool;
  const source = SOURCES[tool];
  const empty: ReadResultEvidenceView = {
    tool,
    title: { ar: source.ar, en: source.en },
    route: isRouteHidden(source.route) ? null : source.route,
    status: "unavailable",
    returnedCount: null,
    reportedSampleCount: null,
    countMismatch: false,
    totalCount: null,
    organization: null,
    region: null,
    site: null,
    sourceUpdatedAt: null,
    queryWindow: null,
    sampleRecordTimes: null,
    records: [],
    bounded: false,
  };
  try {
    if (field(output, "ok") !== true) return empty;
    const rows = field(output, source.rows);
    if (!Array.isArray(rows)) return { ...empty, status: "invalid" };
    const length = count(Object.getOwnPropertyDescriptor(rows, "length")?.value);
    if (length === null) return { ...empty, status: "invalid" };
    const records: { id: string; reference: string | null }[] = [];
    const seen = new Set<string>();
    const times: string[] = [];
    let completeTimes = length > 0 && length <= MAX_ROWS;
    let bounded = length > MAX_ROWS;
    for (let index = 0; index < Math.min(length, MAX_ROWS); index++) {
      const row = Object.getOwnPropertyDescriptor(rows, String(index))?.value;
      const id = field(row, "id");
      if (typeof id === "string" && UUID.test(id) && !seen.has(id.toLowerCase())) {
        seen.add(id.toLowerCase());
        if (records.length < MAX_RECORDS) {
          const reference = field(row, "ref");
          records.push({
            id,
            reference:
              typeof reference === "string" &&
              /^(?:INC|WO|PTW|PT|CCTV|CAM|ALT)-[a-z0-9._/-]{1,48}$/i.test(reference)
                ? reference
                : null,
          });
        } else bounded = true;
      }
      const time = iso(field(row, source.time));
      if (time) times.push(time);
      else completeTimes = false;
    }
    times.sort();
    const reportedSampleCount = count(field(output, "count"));
    return {
      ...empty,
      status: "available",
      returnedCount: length,
      reportedSampleCount,
      countMismatch: reportedSampleCount !== null && reportedSampleCount !== length,
      sampleRecordTimes: completeTimes ? { from: times[0], to: times[times.length - 1] } : null,
      records,
      bounded,
    };
  } catch {
    return { ...empty, status: "invalid" };
  }
}

/** Only completed read outputs are inspected; action inputs and pending tools are ignored. */
export function readMessageResultEvidence(message: unknown): readonly ReadResultEvidenceView[] {
  try {
    const parts = field(message, "parts");
    if (!Array.isArray(parts)) return [];
    const length = count(Object.getOwnPropertyDescriptor(parts, "length")?.value);
    if (length === null) return [];
    const result: ReadResultEvidenceView[] = [];
    let scanned = 0;
    for (let index = 0; index < Math.min(length, MAX_PARTS) && result.length < 6; index++) {
      scanned = index + 1;
      const part = Object.getOwnPropertyDescriptor(parts, String(index))?.value;
      if (field(part, "state") !== "output-available") continue;
      const type = field(part, "type");
      const tool =
        type === "dynamic-tool"
          ? field(part, "toolName")
          : typeof type === "string" && type.startsWith("tool-")
            ? type.slice(5)
            : null;
      const view = readResultEvidence(tool, field(part, "output"));
      if (view) result.push(view);
    }
    return scanned < length ? result.map((view) => ({ ...view, bounded: true })) : result;
  } catch {
    return [];
  }
}
