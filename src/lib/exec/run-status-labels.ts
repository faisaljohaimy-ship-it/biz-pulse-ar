/**
 * تسميات حالات التشغيل — خريطة واحدة لكل سطح يعرض `agent_runs` أو
 * `tool_executions` أو `workflow_runs` (‏/exec · /agents · /execution ·
 * درج تفاصيل سير العمل).
 *
 * لماذا ملفٌّ واحد: كانت كل شاشة تطبع النصّ الإنجليزي الخام (`succeeded`،
 * `pending_approval`…) بخريطة ألوانٍ خاصّة بها، فلا عربية ولا اتفاق بينها،
 * ولا حالة «بانتظار الاعتماد» في سجلّ الوكلاء أصلًا (UI-2 · UI-5).
 *
 * قاعدتان من CLAUDE.md تحكمان النغمة والشكل:
 *   • «danger أحمر و warning كهرماني — لا يُوحَّدان»: الفشل خطرٌ أحمر،
 *     وانتظار الاعتماد تحذيرٌ كهرماني.
 *   • «اللون وحده لا يكفي» (WCAG 2.2 §1.4.1): لكل نغمةٍ شكلٌ بعرف لوحات
 *     السلامة — مثمّن = خطر · مثلث = تحذير · دائرة = سليم. والأشكال تُقرأ هنا
 *     وتُرسم في `RunStatusBadge`.
 *
 * الملفّ خالٍ من React ومن أصناف CSS، فيُختبر في node كما هو.
 */

export type RunStatusTone =
  | "neutral" // في الطابور
  | "info" // قيد التشغيل
  | "success" // نجح
  | "warning" // بانتظار الاعتماد (كهرماني)
  | "danger" // فشل (أحمر)
  | "muted" // أُلغي / رُفض / انقضت المهلة / استُبدل
  | "reverted"; // استُرجع (برتقالي — لا أحمر ولا كهرماني)

export type RunStatusShape = "octagon" | "triangle" | "circle" | "none";

export type RunStatusKey =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "pending_approval"
  | "waiting_approval"
  | "rejected"
  | "expired"
  | "superseded"
  | "rolled_back";

export type RunStatusMeta = {
  ar: string;
  en: string;
  tone: RunStatusTone;
  shape: RunStatusShape;
  /** الحالة ما زالت تتحرّك (تُعرض بنبض وتسمح بالإلغاء). */
  live: boolean;
};

export const RUN_STATUS_LABELS: Record<RunStatusKey, RunStatusMeta> = {
  queued: { ar: "في الطابور", en: "Queued", tone: "neutral", shape: "none", live: true },
  running: { ar: "قيد التشغيل", en: "Running", tone: "info", shape: "none", live: true },
  succeeded: { ar: "نجح", en: "Succeeded", tone: "success", shape: "circle", live: false },
  failed: { ar: "فشل", en: "Failed", tone: "danger", shape: "octagon", live: false },
  cancelled: { ar: "أُلغي", en: "Cancelled", tone: "muted", shape: "none", live: false },
  pending_approval: {
    ar: "بانتظار الاعتماد",
    en: "Awaiting approval",
    tone: "warning",
    shape: "triangle",
    live: false,
  },
  waiting_approval: {
    ar: "بانتظار الاعتماد",
    en: "Awaiting approval",
    tone: "warning",
    shape: "triangle",
    live: false,
  },
  rejected: { ar: "رُفض", en: "Rejected", tone: "muted", shape: "none", live: false },
  expired: {
    ar: "انقضت المهلة دون قرار",
    en: "Expired without decision",
    tone: "muted",
    shape: "none",
    live: false,
  },
  superseded: {
    ar: "استُبدل بطلب أحدث",
    en: "Superseded by a newer request",
    tone: "muted",
    shape: "none",
    live: false,
  },
  rolled_back: { ar: "استُرجع", en: "Rolled back", tone: "reverted", shape: "none", live: false },
};

export const RUN_STATUS_KEYS = Object.keys(RUN_STATUS_LABELS) as RunStatusKey[];

export function isKnownRunStatus(status: unknown): status is RunStatusKey {
  return typeof status === "string" && status in RUN_STATUS_LABELS;
}

/** الحالة المجهولة لا تُلبَس لباس حالةٍ معروفة: نغمةٌ محايدة ونصٌّ يقول إنها غير معروفة. */
export const UNKNOWN_RUN_STATUS: RunStatusMeta = {
  ar: "حالة غير معروفة",
  en: "Unknown status",
  tone: "muted",
  shape: "none",
  live: false,
};

export function runStatusMeta(status: unknown): RunStatusMeta {
  return isKnownRunStatus(status) ? RUN_STATUS_LABELS[status] : UNKNOWN_RUN_STATUS;
}

export function runStatusLabel(status: unknown, locale: "ar" | "en" = "ar"): string {
  const meta = runStatusMeta(status);
  const base = locale === "ar" ? meta.ar : meta.en;
  if (isKnownRunStatus(status)) return base;
  // النصّ الخام يُلحق بين قوسين كي يبقى الجواب صادقًا دون أن يُقدَّم إنجليزيًّا وحده.
  return typeof status === "string" && status ? `${base} (${status})` : base;
}

/* ── أحواض /execution (UI-3) ────────────────────────────────────────────── */

export const RUN_STATUS_BUCKETS = [
  "queued",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "rolled_back",
  "unknown",
] as const;

export type RunStatusBucket = (typeof RUN_STATUS_BUCKETS)[number];

export const RUN_BUCKET_LABELS: Record<RunStatusBucket, { ar: string; en: string }> = {
  queued: { ar: "في الطابور", en: "Queued" },
  running: { ar: "قيد التشغيل", en: "Running" },
  awaiting_approval: { ar: "بانتظار الاعتماد", en: "Awaiting approval" },
  completed: { ar: "اكتمل", en: "Completed" },
  failed: { ar: "فشل", en: "Failed" },
  cancelled: { ar: "أُلغي", en: "Cancelled" },
  rolled_back: { ar: "استُرجع", en: "Rolled back" },
  unknown: { ar: "غير معروف", en: "Unknown" },
};

/**
 * حوض الحالة في الخطّ الزمني. كان المجهول يُعدّ «قيد التشغيل» بأيقونة دوّارة،
 * فبدا طلبُ اعتمادٍ معلّق أو تنفيذٌ انقضت مهلته كأنه يعمل الآن (UI-3).
 */
export function runStatusBucket(status: unknown): RunStatusBucket {
  switch (status) {
    case "pending":
    case "queued":
      return "queued";
    case "running":
    case "approved":
      return "running";
    case "pending_approval":
    case "waiting_approval":
      return "awaiting_approval";
    case "succeeded":
    case "completed":
      return "completed";
    case "failed":
    case "error":
    case "timeout":
      return "failed";
    case "cancelled":
    case "rejected":
    case "expired":
    case "superseded":
      return "cancelled";
    case "rolled_back":
      return "rolled_back";
    default:
      return "unknown";
  }
}

/* ── الحالة المشتقّة لتشغيل وكيل (UI-2) ─────────────────────────────────── */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asCount = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (Array.isArray(v)) return v.length;
  if (isRecord(v) && typeof v.count === "number" && Number.isFinite(v.count))
    return Math.max(0, Math.floor(v.count));
  return null;
};

/**
 * عدد الإجراءات المعلّقة على اعتمادٍ بشري في `audit_json.pendingApprovals`
 * (يكتبه `agent-runtime` بصيغة `{ count, executionIds }`؛ وتُقبل الصيغة الرقمية
 * والمصفوفة احتياطًا). غيابه ⇐ `0` لأن الزمن الحيّ يكتبه دائمًا عند النجاح.
 */
export function pendingApprovalCount(auditJson: unknown): number {
  if (!isRecord(auditJson)) return 0;
  return asCount(auditJson.pendingApprovals) ?? 0;
}

/**
 * عدّاد نداءات الأدوات التي فشلت فعلًا — `audit_json.toolFailures` كما يكتبه زمن التشغيل
 * `{ attempted, succeeded, failed, rejected, failures }` (المرفوض قبل التنفيذ يُعدّ فشلًا
 * للعرض)؛ وتُقبل الصيغة الرقمية والمصفوفة و`{count}` احتياطًا. الغياب ⇐ `null` «لم يُقَس».
 * **المستبعَد ليس فشلًا** — له عدّاده (`excludedToolCount`).
 */
export function toolFailureCount(auditJson: unknown): number | null {
  if (!isRecord(auditJson)) return null;
  const v = auditJson.toolFailures;
  if (isRecord(v) && typeof v.count !== "number") {
    const failed = typeof v.failed === "number" ? v.failed : 0;
    const rejected = typeof v.rejected === "number" ? v.rejected : 0;
    if (typeof v.failed !== "number" && typeof v.rejected !== "number") return null;
    return Math.max(0, Math.floor(failed + rejected));
  }
  return asCount(v);
}

/** الأدوات التي لم تُعرض على النموذج أصلًا (`audit_json.excludedTools`) — غيابه `null`. */
export function excludedToolCount(auditJson: unknown): number | null {
  if (!isRecord(auditJson)) return null;
  return asCount(auditJson.excludedTools);
}

export type DerivedRunStatus = {
  /** المفتاح المعروض: `waiting_approval` حين نجح التشغيل وبقيت إجراءات معلّقة. */
  key: RunStatusKey | string;
  meta: RunStatusMeta;
  /** التسمية العربية/الإنجليزية مع العدّاد بين قوسين عند الانتظار. */
  label: string;
  pendingApprovals: number;
  toolFailures: number | null;
  /** الأدوات المستبعَدة من العرض (صلاحية/تعطيل/تسجيل) — ليست فشلًا. */
  excludedTools: number | null;
};

/**
 * `agent_runs.status` لا يحمل «بانتظار الاعتماد» (قيد CHECK في القاعدة)، فيُنهي
 * الزمن الحيّ التشغيل «نجح» ويضع العدّاد في `audit_json.pendingApprovals`.
 * الاشتقاق هنا للعرض وحده — لا يمسّ القاعدة ولا دوال الخادم.
 */
export function deriveRunStatus(
  row: { status: unknown; audit_json?: unknown },
  locale: "ar" | "en" = "ar",
): DerivedRunStatus {
  const pending = pendingApprovalCount(row.audit_json);
  const toolFailures = toolFailureCount(row.audit_json);
  const excludedTools = excludedToolCount(row.audit_json);
  if (row.status === "succeeded" && pending > 0) {
    const meta = RUN_STATUS_LABELS.waiting_approval;
    const base = locale === "ar" ? meta.ar : meta.en;
    return {
      key: "waiting_approval",
      meta,
      label: `${base} (${pending})`,
      pendingApprovals: pending,
      toolFailures,
      excludedTools,
    };
  }
  return {
    key: typeof row.status === "string" ? row.status : "unknown",
    meta: runStatusMeta(row.status),
    label: runStatusLabel(row.status, locale),
    pendingApprovals: pending,
    toolFailures,
    excludedTools,
  };
}

/**
 * عدد الخطوات نصًّا: رقمٌ صحيح أو «—». صفوف المحاكاة تحمل `steps: []`
 * (مصفوفة) وكانت تُطبع فارغةً؛ والمصفوفة ليست عددًا مقيسًا فلا تُحوَّل إلى صفر.
 */
export function runStepsLabel(steps: unknown): string {
  if (typeof steps === "number" && Number.isFinite(steps) && steps >= 0) {
    return String(Math.floor(steps));
  }
  return "—";
}

/** شارة الصفوف المرجعية — نصّها الواحد في كل سطح. */
// لفظها «مرجعية» لا «محاكاة» (أمر المالك ٢٠٢٦/١٠/١٨: نصوص العرض تُسمّي المرجعيّ مرجعيًّا وتُعلن أنه ليس حيًّا).
export const SIMULATION_BADGE_AR = "بيانات مرجعية — ليست حيّة";
export const SIMULATION_BADGE_TITLE_AR = "بيانات مرجعية موسومة is_simulation — ليست حيّة";

export function isSimulatedRow(row: unknown): boolean {
  return isRecord(row) && row.is_simulation === true;
}
