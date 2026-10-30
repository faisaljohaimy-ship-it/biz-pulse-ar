import { generateImage, tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
// اسم المساعد المعروض من مصدره الوحيد (قرار المالك ٢٠٢٦/٠٨/٠٩): هذه قيمٌ
// تُكتب في القاعدة ثمّ تُقرأ على الشاشة نسبةً للفاعل — نصّ عرض لا معرّف.
import { BRAND_ASSISTANT } from "@/lib/domain";
import {
  prepareSadeedOutboundMessage,
  sendSadeedOutboundMessageDirectInternal,
  sadeedAutoApproveEnabled,
} from "@/lib/sadeed/outbound-messaging.server";
import {
  resolveOwnerEmail,
  resolveOwnerSms,
  isOwnerEmail,
  isOwnerSms,
  hasExplicitOutboundIntent,
} from "@/lib/sadeed/outbound-recipient-policy.server";
import {
  claimConfirmation,
  isExplicitConfirmation,
  loadLatestProposalSet,
  openConfirmationDetails,
  readConfirmationUsage,
  recordConfirmationOutcome,
  recordPendingConfirmation,
  sealConfirmationDetails,
  signWriteConfirmation,
  verifyWriteConfirmation,
  writeConfirmationArgsHash,
  writeConfirmationAvailable,
} from "@/lib/sadeed/write-confirmation.server";
import { buildMakkahMoment } from "@/lib/sadeed/makkah-clock";

function genRef(prefix: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

function scoreRisk(severity: string, priority: string, category: string): number {
  const sevMap: Record<string, number> = {
    low: 20,
    medium: 45,
    high: 70,
    critical: 90,
  };
  const prioMap: Record<string, number> = {
    low: 0,
    medium: 5,
    high: 10,
    critical: 15,
  };
  const catBoost = ["intrusion", "fire", "explosion", "weapon"].some((k) =>
    category.toLowerCase().includes(k),
  )
    ? 10
    : 0;
  return Math.min(100, (sevMap[severity] ?? 40) + (prioMap[priority] ?? 5) + catBoost);
}

async function getActorOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  void supabase;
  const { getCurrentOrgIdForUser } = await import("@/lib/authz.server");
  return getCurrentOrgIdForUser(userId);
}

type AuditResult = { ok: true } | { ok: false; error: string };

async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  entity_type: string,
  entity_id: string,
  entity_ref: string | null,
  event: string,
  payload: Record<string, unknown> = {},
): Promise<AuditResult> {
  const org_id = await getActorOrgId(supabase, userId);
  if (!org_id) return { ok: false, error: "Actor is not assigned to an organization" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("sec_activity_events").insert({
    org_id,
    entity_type,
    entity_id,
    entity_ref,
    event,
    actor_id: userId,
    actor_name: BRAND_ASSISTANT.nameAr,
    payload: payload as Json,
  });
  if (error) {
    console.error("[aria-tools] security audit write failed", {
      entity_type,
      entity_id,
      event,
      error: error.message,
    });
    return { ok: false, error: `Audit write failed: ${error.message}` };
  }
  return { ok: true };
}

async function requireOperationalWriterRole(userId: string): Promise<string | null> {
  const { hasAnyPlatformRole } = await import("@/lib/authz.server");
  return (await hasAnyPlatformRole(userId, ["admin", "manager"]))
    ? null
    : "Forbidden: this industrial-security action requires admin or manager role.";
}

function safePostgrestSearchTerm(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── بوابة التأكيد البشري لأدوات الكتابة (الثابت: «أي إجراء كتابة أو طوارئ
// خلف بوابة تأكيد بشري») ──────────────────────────────────────────────────
// خطوتان عبر رسالتين: نداءٌ أوّل لا يكتب شيئًا، يعيد ملخّصًا عربيًّا ويحفظ
// الاقتراح على الخادم (`write-confirmation.server.ts`)؛ ونداءٌ ثانٍ بالوسائط
// نفسها لا يُنفَّذ إلا إن كانت رسالة المستخدم الحالية تأكيدًا صريحًا قصيرًا،
// وكان الاقتراح من آخر طلبٍ سابق رأى فيه المستخدم الملخّص. النموذج لا يحمل
// رمزًا: المسار لا يعيد نتائج الأدوات بين الطلبات. البريد والرسائل النصية خارج
// هذه البوابة: لهما سجلّ اعتمادهما الخاص.

const CONFIRMATION_PROTOCOL =
  " WRITE ACTION behind a human confirmation gate (two steps across two user messages). Step 1: call it normally — nothing is written; the result has status requires_confirmation and an Arabic action_summary. Show action_summary to the user, ask them to confirm, and stop. Step 2: only when the user's NEXT message is an explicit confirmation (e.g. «نعم» / «أؤكد» / confirm), call it again with the same arguments; the server matches the confirmation to the summary the user saw and executes it once. If the result is confirmed_arguments_differ, call again at once with exactly one of confirmed_proposals[].arguments, unchanged. Any other reply means do not execute; if the user changes the request, call again with the new arguments to get a new summary. Never claim the action happened unless the tool returned executed:true.";

type GatedWriteTool =
  | "create_task"
  | "update_task_status"
  | "record_executive_decision"
  | "create_intelligence_alert"
  | "sec_create_incident"
  | "sec_update_incident"
  | "sec_create_work_order"
  | "sec_close_work_order"
  | "sec_create_permit"
  | "sec_decide_permit"
  | "sec_schedule_patrol"
  | "sec_register_visitor"
  | "sec_checkout_visitor"
  | "sec_triage_cctv_alert"
  | "dispatch_agent";

type ConfirmationRefusal = {
  ok: false;
  executed: false;
  status:
    | "requires_confirmation"
    | "confirmation_required_from_user"
    | "confirmed_arguments_differ"
    | "already_executed"
    | "confirmation_unavailable";
  [key: string]: unknown;
};

/** معرّف ما كُتب للأثر: أول صفٍّ له `id` في نتيجة الأداة، أو `id`/`ref` في جذرها. */
function writtenEntity(result: Record<string, unknown>): Record<string, string> | undefined {
  for (const [kind, value] of Object.entries(result)) {
    const row = value as { id?: unknown; ref?: unknown } | null;
    if (row && typeof row === "object" && typeof row.id === "string") {
      return { kind, id: row.id, ...(typeof row.ref === "string" ? { ref: row.ref } : {}) };
    }
  }
  const entity: Record<string, string> = {};
  if (typeof result.id === "string") entity.id = result.id;
  if (typeof result.ref === "string") entity.ref = result.ref;
  return Object.keys(entity).length ? entity : undefined;
}

// ── ملخّص التأكيد يُقرأ ويُنطق (المادة ٢٢ §٥) ─────────────────────────────────
// يُعرض `action_summary` للمستخدم ويُنطق بصوت سَدِيد، فلا معرّفَ خامًا فيه (يُنطق
// «ثلاثةfاثنانb…»)، ولا ISO بتوقيت UTC (يُقرأ السادسة وهو التاسعة بتوقيت مكة)، ولا
// قيمةَ تعدادٍ إنجليزية وسط العربية، والصفة توافق موصوفها.

/** مؤنّثة: تتبع «الأولوية» و«الخطورة». */
const LEVEL_AR: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
};
/** مذكّرة: تتبع «الأثر» و«مستوى الخطر» — «الأثر: عالية» خطأٌ يُقرأ ويُنطق. */
const LEVEL_M_AR: Record<string, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "عالٍ",
  critical: "حرج",
};
// القيم التي تسمّيها أوصاف المخطّطات، ومعها ما ترسله شاشات الإدخال — بكلمات
// `oms-dialogs.tsx` وكتالوج تصاريح العمل نفسها حيث وُجدت (لا تُستورد من ملفّات
// الواجهة كي لا تُسحب حزمتها إلى الخادم). وما لا يُعرف يُعرض كما كُتب.
const INCIDENT_CATEGORY_AR: Record<string, string> = {
  intrusion: "اختراق محيط",
  fire: "حريق",
  leak: "تسرّب",
  gas_leak: "تسرّب غاز",
  access: "تحكم بالدخول",
  theft: "سرقة",
  safety: "سلامة",
  cctv: "كاميرات المراقبة",
  perimeter: "محيط أمني",
  other: "أخرى",
};
const ASSET_KIND_AR: Record<string, string> = {
  camera: "كاميرا",
  cctv: "كاميرات المراقبة",
  gate: "بوابة",
  sensor: "مستشعر",
  access: "تحكم بالدخول",
  access_control: "تحكم بالدخول",
  fence: "سياج",
  perimeter: "محيط أمني",
  fire_system: "منظومة مكافحة الحريق",
  alarm: "إنذار",
  other: "أخرى",
};
const PERMIT_WORK_TYPE_AR: Record<string, string> = {
  hot_work: "عمل ساخن",
  confined_space: "دخول مكان مغلق",
  electrical: "أعمال كهربائية",
  electrical_isolation: "عزل كهربائي",
  height: "عمل على ارتفاع",
  working_at_height: "عمل على ارتفاع",
  excavation: "حفر",
  lifting: "رفع ثقيل",
  restricted_area: "منطقة محظورة",
  general: "أعمال عامة",
};
/** كلمات نوع التنبيه نفسها في `sec-exec-kpis.functions.ts` (‏ALERT_TYPE_AR). */
const CCTV_ALERT_TYPE_AR: Record<string, string> = {
  motion: "رصد حركة",
  loitering: "تسكّع",
  intrusion: "تسلل",
  camera_offline: "انقطاع كاميرا",
  tamper: "عبث بالكاميرا",
};
const TASK_STATUS_AR: Record<string, string> = {
  todo: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  done: "مكتملة",
  blocked: "متعثّرة",
};
const MEMORY_KIND_AR: Record<string, string> = {
  decision: "قرار",
  commitment: "التزام",
  milestone: "مرحلة مفصلية",
  risk: "خطر",
  opportunity: "فرصة",
};
const INCIDENT_STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  investigating: "قيد التحقيق",
  contained: "محتوى",
  resolved: "محلول",
  closed: "مغلق",
};
const CCTV_STATUS_AR: Record<string, string> = {
  triaged: "مفروز",
  dispatched: "أُرسلت له استجابة",
  resolved: "محلول",
  false_positive: "إنذار كاذب",
};

function clip(value: unknown, max = 120): string {
  const s = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** مفتاح القيمة كما تكتبه النماذج والشاشات: «hot-work» و«Hot Work» و«hot_work» واحد. */
function enumKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function label(map: Record<string, string>, value: unknown): string {
  return map[String(value)] ?? map[enumKey(value)] ?? clip(value, 40);
}

/**
 * موعدٌ بتوقيت مكة المكرمة بصيغةٍ عربية: «20 أكتوبر 2026، 9:00 صباحًا» (المادة ٢).
 * التاريخ من `buildMakkahMoment` نفسه (ميلاديّ بأرقامٍ لاتينية، فيحوّلها مسار النطق
 * كلماتٍ)، والساعة بنظام الاثنتي عشرة كما في جملة الافتتاح. ما لا يُقرأ ⇐ `null`.
 */
function makkahDateTime(iso: unknown): { date: string; time: string } | null {
  if (typeof iso !== "string" || !iso.trim()) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const { dateG, time } = buildMakkahMoment(at);
  const [h, min] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  const hour = h % 24;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? "صباحًا" : "مساءً";
  return { date: dateG, time: `${hour12}:${String(min).padStart(2, "0")} ${period}` };
}

const MAKKAH_TIME_SUFFIX = "بتوقيت مكة المكرمة";

/** «25 أكتوبر 2026، 12:00 مساءً بتوقيت مكة المكرمة»، أو `null` فيُسقط المستدعي الجزء. */
function makkahWhen(iso: unknown): string | null {
  const at = makkahDateTime(iso);
  return at ? `${at.date}، ${at.time} ${MAKKAH_TIME_SUFFIX}` : null;
}

/** «من … إلى …» بتوقيت مكة؛ اليوم الواحد لا يُكرَّر تاريخه، والطرف التالف يسقط وحده. */
function makkahSpan(from: unknown, to: unknown): string | null {
  const start = makkahDateTime(from);
  const end = makkahDateTime(to);
  if (start && end) {
    const until = start.date === end.date ? end.time : `${end.date}، ${end.time}`;
    return `من ${start.date}، ${start.time} إلى ${until} ${MAKKAH_TIME_SUFFIX}`;
  }
  if (start) return `من ${start.date}، ${start.time} ${MAKKAH_TIME_SUFFIX}`;
  if (end) return `حتى ${end.date}، ${end.time} ${MAKKAH_TIME_SUFFIX}`;
  return null;
}

/** وصف السجلّ القائم في الملخّص: من صفّه، وبلا معرّفٍ أبدًا حين يتعذّر. */
const EXISTING_RECORD = {
  task: {
    table: "tasks",
    columns: "title",
    fallback: "المهمة المحدّدة",
    render: (row: Record<string, unknown>) => {
      const title = clip(row.title, 80);
      return title ? `المهمة «${title}»` : null;
    },
  },
  incident: {
    table: "sec_incidents",
    columns: "title_ar",
    fallback: "البلاغ المحدّد",
    render: (row: Record<string, unknown>) => {
      const title = clip(row.title_ar, 80);
      return title ? `البلاغ «${title}»` : null;
    },
  },
  work_order: {
    table: "sec_work_orders",
    columns: "title_ar",
    fallback: "أمر العمل المحدّد",
    render: (row: Record<string, unknown>) => {
      const title = clip(row.title_ar, 80);
      return title ? `أمر العمل «${title}»` : null;
    },
  },
  permit: {
    table: "sec_permits",
    columns: "work_type,contractor",
    fallback: "تصريح العمل المحدّد",
    render: (row: Record<string, unknown>) => {
      const type = clip(row.work_type, 40) ? ` (${label(PERMIT_WORK_TYPE_AR, row.work_type)})` : "";
      const contractor = clip(row.contractor, 80);
      const forWhom = contractor ? ` للمقاول «${contractor}»` : "";
      return type || forWhom ? `تصريح العمل${type}${forWhom}` : null;
    },
  },
  visitor: {
    table: "sec_visitors",
    columns: "full_name",
    fallback: "الزائر المحدّد",
    render: (row: Record<string, unknown>) => {
      const name = clip(row.full_name, 80);
      return name ? `الزائر «${name}»` : null;
    },
  },
  cctv_alert: {
    table: "sec_cctv_alerts",
    columns: "alert_type,camera_code",
    fallback: "تنبيه الكاميرا المحدّد",
    render: (row: Record<string, unknown>) => {
      // نوعٌ لا تعرفه الخريطة لا يُطبع إنجليزيًّا؛ ورمز الكاميرا مرجعها المعروض في شاشتها.
      const type = CCTV_ALERT_TYPE_AR[enumKey(row.alert_type)];
      const camera = clip(row.camera_code, 40);
      if (type) return `تنبيه «${type}»${camera ? ` من الكاميرا ${camera}` : ""}`;
      return camera ? `تنبيه الكاميرا ${camera}` : null;
    },
  },
} satisfies Record<
  string,
  {
    table: string;
    columns: string;
    fallback: string;
    render: (row: Record<string, unknown>) => string | null;
  }
>;

const RECORD_LABEL_TIMEOUT_MS = 1500;

/**
 * يصف سجلًّا قائمًا تستهدفه أداة كتابة بقراءةٍ واحدة رخيصة بعميل الطلب نفسه (تحت
 * RLS، وبمرشّحات الكتابة نفسها)، في خطوة الاقتراح وحدها، بمهلة. تعذّر القراءة أو
 * فراغها أو تجاوز المهلة ⇐ العبارة المحايدة («البلاغ المحدّد») بلا معرّف. لا كتابة.
 */
async function describeExisting(
  supabase: SupabaseClient,
  kind: keyof typeof EXISTING_RECORD,
  match: Record<string, string>,
): Promise<string> {
  const spec = EXISTING_RECORD[kind];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    let query = supabase.from(spec.table).select(spec.columns);
    for (const [column, value] of Object.entries(match)) query = query.eq(column, value);
    const read = Promise.resolve(query.limit(1)).then(
      ({ data, error }) => {
        const row: unknown = !error && Array.isArray(data) ? data[0] : null;
        return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
      },
      () => null,
    );
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), RECORD_LABEL_TIMEOUT_MS);
    });
    const row = await Promise.race([read, timedOut]);
    return (row && spec.render(row)) || spec.fallback;
  } catch {
    return spec.fallback;
  } finally {
    clearTimeout(timer);
  }
}

export type SadeedToolRuntimeContext = {
  /**
   * Trimmed concatenation of the text parts of the newest user message, as the
   * chat route builds it after request validation and history sanitising:
   * consecutive user turns are merged, and textual attachments of that turn
   * arrive inlined as `<attachment>` text blocks. Client-supplied and
   * untrusted — it is the user's own turn, never RAG or tool output, but it may
   * contain attachment content, so it is not by itself proof of intent.
   */
  lastUserText?: string;
  /** Verified active tenant; RAG is unavailable when this is absent. */
  orgId?: string | null;
  /**
   * هل مشغّل الوكلاء متاح لهذا الدور؟ المسار يمرّر `plan.selected === "gemini"`
   * (الوكلاء على Gemini وحده، كما مجلس الوضع العميق): بدونه لا تُسجَّل أداة
   * `dispatch_agent` أصلًا — لا تبديل مورّدٍ صامت ولا وعدٌ بتشغيلٍ لن يقع.
   * الافتراض `false` (فشلٌ مغلق).
   */
  agentsAvailable?: boolean;
};

/**
 * ميزانية دور الدردشة لتشغيل الوكيل من `dispatch_agent`: تحت سقف الدور
 * (45 ث) بهامش، لأن AI SDK لا يسابق الأداة ضدّ `abortSignal` بنفسه — الأداة
 * هي من تقرأ الإشارة وتُلغي التشغيل عندها.
 */
export const DISPATCH_AGENT_BUDGET_MS = 30_000;
/**
 * مهلة سماحٍ بعد انقضاء الميزانية: التشغيل يُلغى بالإشارة ويكتب `cancelled`
 * بنفسه — فتُنتظر نتيجته الحقيقية (معرّف التشغيل وحالته) ثوانيَ قبل الاكتفاء
 * بسطر «جارٍ؛ تابع بـexecution_status».
 */
export const DISPATCH_AGENT_GRACE_MS = 3_000;

/**
 * Build the SADEED executive toolbelt. All tools are RLS-scoped via the
 * request supabase client and gated by connector availability.
 */
export function buildSadeedTools(
  supabase: SupabaseClient,
  userId: string,
  runtime: SadeedToolRuntimeContext = {},
) {
  // معرّف هذا الطلب في سجلّ الاقتراحات: ما يُقترح فيه لا يُؤكَّد فيه، بل في طلبٍ
  // لاحق رأى فيه المستخدم الملخّص — ولو كانت رسالته الحالية «نعم» جوابًا عن
  // سؤالٍ آخر للنموذج.
  const turnId = crypto.randomUUID();
  // ما اقتُرح في هذا الطلب (أداة|بصمة ⇐ الانتهاء): نداءٌ مكرَّر لا يكتب صفًّا ثانيًا.
  const proposedThisTurn = new Map<string, string>();

  /**
   * يغلّف كتابةً قائمة ببوابة التأكيد. فحوص الدور والمؤسسة تسبقه عند المستدعي
   * (بلا تغيير)؛ و`orgId` هو المؤسسة التي تُنسب إليها الكتابة. منع الإعادة لكل
   * الأدوات — ومنها أدوات المستخدم (المهام والذاكرة والتنبيهات) التي لا أثر أمنيًّا
   * لها — مطالبةٌ دائمة في سجلّ الاقتراحات تُكتب قبل الكتابة؛ و`ledger` يعني أن
   * الأداة تكتب أثرها في `sec_activity_events` أيضًا فيُفحص فيه الرقم العابر.
   * و`summary` نصٌّ أو دالّةٌ تبنيه عند عرضه وحده: وصف السجلّ القائم يُقرأ في خطوة
   * الاقتراح، لا في التنفيذ ولا حين لا يُعرض ملخّص.
   */
  async function confirmedWrite<R extends { ok: boolean }>(
    toolName: GatedWriteTool,
    input: Record<string, unknown>,
    ctx: { orgId: string | null; ledger: boolean; summary: string | (() => Promise<string>) },
    write: (nonce: string) => Promise<R>,
  ): Promise<(R & { executed: boolean; next_step?: string }) | ConfirmationRefusal> {
    const unavailable = (
      error = "Write confirmation is not configured on the server; nothing was written.",
    ): ConfirmationRefusal => ({
      ok: false,
      executed: false,
      status: "confirmation_unavailable",
      error,
    });
    if (!writeConfirmationAvailable()) return unavailable();
    const orgId = ctx.orgId ?? null;
    const subject = { tool: toolName, userId, orgId, args: input };
    const scope = { userId, orgId, tool: toolName };
    const argsHash = await writeConfirmationArgsHash(input);
    const confirming = isExplicitConfirmation(runtime.lastUserText);

    // اقتراحات آخر طلبٍ سابق — لا يُعرف بغيرها إن رأى المستخدم الملخّص ⇐ يفشل مغلقًا.
    const latest = await loadLatestProposalSet(userId, turnId);
    if (!latest.ok)
      return unavailable("Pending confirmations cannot be read; nothing was written.");
    const sameAction = latest.proposals.filter((p) => p.tool === toolName && p.org === orgId);
    let shownNonce: string | null = null;
    for (const proposal of sameAction) {
      if (proposal.argsHash !== argsHash) continue;
      // الختم يربط الصفّ بالأداة والمستخدم والمؤسسة والوسائط والصلاحية.
      const verdict = await verifyWriteConfirmation(proposal.seal, subject);
      if (verdict.ok && verdict.nonce === proposal.nonce) {
        shownNonce = verdict.nonce;
        break;
      }
    }

    let summaryText: string | null = null;
    const summary = async (): Promise<string> => {
      if (summaryText === null) {
        summaryText = typeof ctx.summary === "string" ? ctx.summary : await ctx.summary();
      }
      return summaryText;
    };

    const propose = async (
      status: "requires_confirmation" | "confirmation_required_from_user",
      reason?: string,
    ): Promise<ConfirmationRefusal> => {
      const key = `${toolName}|${argsHash}`;
      let expiresAt = proposedThisTurn.get(key);
      if (!expiresAt) {
        const signed = await signWriteConfirmation(subject);
        if (!signed.ok) return unavailable();
        const details = await sealConfirmationDetails(
          { args: input, summary: await summary() },
          { userId, tool: toolName, nonce: signed.nonce, argsHash },
        );
        if (!details) return unavailable();
        const recorded = await recordPendingConfirmation({
          ...scope,
          turn: turnId,
          nonce: signed.nonce,
          argsHash,
          seal: signed.token,
          details,
          expiresAt: signed.expiresAt,
        });
        // اقتراحٌ لم يُحفظ لا يمكن تأكيده لاحقًا ⇐ لا يُعرض ملخّصٌ لن يُنفَّذ.
        if (!recorded.ok) {
          return unavailable(
            "The pending confirmation could not be recorded; nothing was written.",
          );
        }
        expiresAt = signed.expiresAt;
        proposedThisTurn.set(key, expiresAt);
      }
      return {
        ok: false,
        executed: false,
        status,
        action_summary: await summary(),
        expires_at: expiresAt,
        ...(reason ? { reason } : {}),
        next_step:
          status === "confirmation_required_from_user"
            ? "Nothing was written. The user has seen this summary, but their latest message is not an explicit confirmation. Do not execute and do not claim the action happened; wait for their explicit confirmation."
            : "Nothing was written. Show action_summary to the user and ask for explicit confirmation. Only after their next message confirms, call this tool again with the same arguments.",
      };
    };

    if (!confirming) {
      return shownNonce
        ? propose("confirmation_required_from_user", "no_explicit_confirmation")
        : propose("requires_confirmation");
    }
    if (!shownNonce) {
      // أكّد المستخدم، والنموذج أعاد بناء الوسائط بصياغةٍ أخرى: تُعاد إليه الوسائط
      // التي رآها المستخدم حرفًا — يُنفَّذ ما أُكِّد، لا ما أُعيد تأليفه.
      const confirmedProposals: Array<{
        arguments: Record<string, unknown>;
        action_summary: string;
      }> = [];
      for (const proposal of sameAction) {
        const details = await openConfirmationDetails(proposal.details, {
          userId,
          tool: toolName,
          nonce: proposal.nonce,
          argsHash: proposal.argsHash,
        });
        if (!details) continue;
        // لا تُعاد إلا وسائطُ يقبلها الختم الآن (لم تنتهِ صلاحيتها) — وإلا دار النموذج.
        const verdict = await verifyWriteConfirmation(proposal.seal, {
          ...subject,
          args: details.args,
        });
        if (verdict.ok && verdict.nonce === proposal.nonce) {
          confirmedProposals.push({ arguments: details.args, action_summary: details.summary });
        }
      }
      if (confirmedProposals.length) {
        return {
          ok: false,
          executed: false,
          status: "confirmed_arguments_differ",
          confirmed_proposals: confirmedProposals,
          next_step:
            "Nothing was written yet. The user confirmed a summary built from different arguments. Call this tool again now with exactly one of confirmed_proposals[].arguments, unchanged, to execute what the user confirmed.",
        };
      }
      return propose("requires_confirmation", "no_earlier_summary_for_this_action");
    }

    const alreadyExecuted: ConfirmationRefusal = {
      ok: false,
      executed: false,
      status: "already_executed",
      next_step:
        "This confirmation was already used. Do not repeat the action; read the current state before reporting it.",
    };
    const usage = await readConfirmationUsage(userId, shownNonce);
    if (!usage.ok) return unavailable("Replay check is unavailable; nothing was written.");
    // محاولةٌ سابقة فشلت ولم تكتب شيئًا ⇐ اقتراحٌ جديد يؤكّده المستخدم من جديد.
    if (usage.failed) return propose("requires_confirmation", "previous_attempt_failed");
    if (usage.claimed) return alreadyExecuted;
    if (ctx.ledger) {
      if (!orgId) return unavailable("Replay check is unavailable; nothing was written.");
      // العميل نفسه الذي يكتب به `logEvent` الأثر، مقيّدًا بالمؤسسة.
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: seen, error: seenError } = await supabaseAdmin
          .from("sec_activity_events")
          .select("id")
          .eq("org_id", orgId)
          .contains("payload", { confirmation_nonce: shownNonce })
          .limit(1);
        // لا يُعرف إن نُفّذ الاقتراح من قبل ⇐ يفشل مغلقًا ولا يكتب.
        if (seenError) return unavailable("Replay check is unavailable; nothing was written.");
        if ((seen ?? []).length > 0) return alreadyExecuted;
      } catch {
        return unavailable("Replay check is unavailable; nothing was written.");
      }
    }
    // المطالبة قبل الكتابة: تعذّرها ⇐ لا كتابة، وأقدم مطالبةٍ وحدها تُنفَّذ.
    const claim = await claimConfirmation({ ...scope, turn: turnId, nonce: shownNonce, argsHash });
    if (!claim.ok) {
      return unavailable("The confirmation could not be recorded; nothing was written.");
    }
    if (!claim.first) return alreadyExecuted;

    let result: R;
    try {
      result = await write(shownNonce);
    } catch (error) {
      await recordConfirmationOutcome({
        ...scope,
        nonce: shownNonce,
        executed: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    const executed = result.ok === true;
    await recordConfirmationOutcome({
      ...scope,
      nonce: shownNonce,
      executed,
      entity: executed ? writtenEntity(result) : undefined,
      error: executed ? undefined : String((result as { error?: unknown }).error ?? "write failed"),
    });
    if (executed) return { ...result, executed };
    // الاقتراح استُهلك بمطالبته ولو فشلت الكتابة: إعادة المحاولة تبدأ باقتراحٍ جديد.
    return {
      ...result,
      executed,
      next_step:
        "Nothing was written and this confirmation is now used. If the user still wants it, call this tool again to get a fresh summary and ask them to confirm again.",
    };
  }

  return {
    create_task: tool({
      description:
        "Create an executive task in SADEED for the current user. Use when the user asks to add a to-do, assign work, or schedule a deliverable." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        description: z.string().max(2000).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        assigned_agent: z.string().max(80).optional(),
        due_at: z.string().datetime().optional().describe("ISO 8601 due date"),
      }),
      execute: async (args) =>
        confirmedWrite(
          "create_task",
          args,
          {
            orgId: runtime.orgId ?? null,
            ledger: false,
            summary: async () => {
              const due = makkahWhen(args.due_at);
              return `إنشاء مهمة «${clip(args.title)}» — الأولوية: ${label(LEVEL_AR, args.priority)}${due ? ` — الاستحقاق: ${due}` : ""}`;
            },
          },
          async () => {
            const { data, error } = await supabase
              .from("tasks")
              .insert({
                user_id: userId,
                title: args.title,
                description: args.description ?? null,
                priority: args.priority,
                assigned_agent: args.assigned_agent ?? null,
                due_at: args.due_at ?? null,
                status: "todo",
              })
              .select("id,title,priority,due_at")
              .single();
            if (error) return { ok: false, error: error.message };
            return { ok: true, task: data };
          },
        ),
    }),

    query_kpis: tool({
      description:
        "Query live enterprise KPIs (value, delta, trend, tone). Optional label filter (partial match).",
      inputSchema: z.object({
        name_contains: z.string().max(80).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      execute: async (args) => {
        let q = supabase
          .from("pulse_kpis")
          .select("key,label,label_en,value,delta,trend,tone")
          .limit(args.limit);
        if (args.name_contains) {
          const safe = safePostgrestSearchTerm(args.name_contains);
          if (safe) {
            const term = `%${safe}%`;
            q = q.or(`label.ilike.${term},label_en.ilike.${term},key.ilike.${term}`);
          }
        }
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, kpis: data ?? [] };
      },
    }),

    list_open_crises: tool({
      description: "List currently open crises with risk score and owner.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (args) => {
        const { data, error } = await supabase
          .from("pulse_crises")
          .select(
            "id,title,title_en,risk_score,probability,owner,impact,impact_en,action,action_en,category",
          )
          .order("risk_score", { ascending: false })
          .limit(args.limit);
        if (error) return { ok: false, error: error.message };
        return { ok: true, crises: data ?? [] };
      },
    }),

    // ── HCIS Compliance + Digital PTW (new modules) ──────────────────────
    hcis_compliance_status: tool({
      description:
        "HCIS compliance percentage — overall and per region (central/western/eastern/southern). Use for questions like 'ما نسبة امتثال المنطقة الغربية؟'.",
      inputSchema: z.object({
        region: z.enum(["central", "western", "eastern", "southern"]).optional(),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        const seeded = await db
          .from("hcis_compliance_status")
          .select("region_code,status,is_simulation");
        let source = "hcis_compliance_status";
        type HcisStatusRow = {
          region: string;
          status: string;
          isSimulation: boolean;
        };
        let rows: HcisStatusRow[] = (
          (seeded.data ?? []) as Array<{
            region_code: string;
            status: string;
            is_simulation?: boolean;
          }>
        ).map((row) => ({
          region: row.region_code,
          status: row.status,
          isSimulation: row.is_simulation === true,
        }));
        if (seeded.error) {
          const legacy = await db.from("hcis_assessments").select("region,status");
          if (legacy.error) {
            return {
              ok: false,
              error: `${seeded.error.message}; fallback failed: ${legacy.error.message}`,
            };
          }
          source = "hcis_assessments";
          rows = (legacy.data ?? []).map((row: { region: string; status: string }) => ({
            ...row,
            isSimulation: false,
          }));
        }
        const pct = (rs: Array<{ status: string }>) => {
          const scored = rs.filter(
            (r) => r.status !== "not_applicable" && r.status !== "not_assessed",
          );
          if (!scored.length) return null;
          const w = (s: string) => (s === "compliant" ? 1 : s === "partial" ? 0.5 : 0);
          return Math.round((scored.reduce((a, r) => a + w(r.status), 0) / scored.length) * 100);
        };
        const byRegion: Record<string, number | null> = {};
        for (const r of ["central", "western", "eastern", "southern"])
          byRegion[r] = pct(rows.filter((x) => x.region === r));
        const assessedCount = rows.filter(
          (row) => row.status !== "not_assessed" && row.status !== "not_applicable",
        ).length;
        return {
          ok: true,
          overallPct: pct(rows),
          byRegion: args.region ? { [args.region]: byRegion[args.region] } : byRegion,
          assessedCount,
          totalCount: rows.length,
          dataAvailable: assessedCount > 0,
          isSimulation: rows.some((row) => row.isSimulation),
          source,
        };
      },
    }),

    hcis_critical_findings: tool({
      description:
        "List critical/high-severity or overdue HCIS compliance findings (gaps) with their target dates. Use for 'ما الفجوات الحرجة المتأخرة؟'.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(8),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        const { data, error } = await db
          .from("hcis_findings")
          .select("title_ar,region,severity,status,target_date")
          .neq("status", "resolved")
          .order("target_date", { ascending: true })
          .limit(50);
        if (error) return { ok: false, error: error.message };
        const rows = (data ?? []) as Array<{
          severity: string;
          status: string;
        }>;
        const critical = rows.filter(
          (r) => r.status === "overdue" || r.severity === "critical" || r.severity === "high",
        );
        return {
          ok: true,
          findings: critical.slice(0, args.limit),
          count: critical.length,
        };
      },
    }),

    ptw_active_permits: tool({
      description:
        "List currently ACTIVE work permits (PTW), optionally filtered by region or type (hot_work, confined_space, restricted_area, excavation, lifting, electrical_isolation). Use for 'كم تصريح عمل ساخن ساري في الشرقية؟' / 'من يعمل في المنطقة المحظورة الآن؟'.",
      inputSchema: z.object({
        region: z.enum(["central", "western", "eastern", "southern"]).optional(),
        type_key: z.string().max(40).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table not yet in generated types
        const db = supabase as unknown as { from: (t: string) => any };
        let q = db
          .from("permits")
          .select("ref,type_key,region,location,contractor,worker_count,ends_at,status")
          .eq("status", "active")
          .order("ends_at", { ascending: true })
          .limit(args.limit);
        if (args.region) q = q.eq("region", args.region);
        if (args.type_key) q = q.eq("type_key", args.type_key);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, permits: data ?? [], count: (data ?? []).length };
      },
    }),

    send_executive_email: tool({
      description:
        "Send an HTML executive email. Direct send is allowed only when the recipient is the registered SADEED owner AND the current user message explicitly asks to send an email; otherwise the message is routed to the reviewed approval flow so it is not silently dropped.",
      inputSchema: z.object({
        to: z.string().email().optional(),
        cc: z.string().email().optional(),
        subject: z.string().min(2).max(300),
        html: z.string().min(5).max(120000),
      }),
      execute: async (args) => {
        try {
          const intentText = runtime.lastUserText ?? "";
          const isOwner = isOwnerEmail(args.to);
          const explicit = hasExplicitOutboundIntent(intentText, "email");
          if (isOwner && explicit && sadeedAutoApproveEnabled()) {
            const payload = {
              channel: "email" as const,
              ...args,
              to: resolveOwnerEmail(args.to),
            };
            return await sendSadeedOutboundMessageDirectInternal({
              userId,
              payload,
              explicitIntentText: intentText,
            });
          }
          // Non-owner recipient OR non-explicit intent OR direct-send disabled
          // → route through the reviewed approval flow with the requested
          // recipient instead of failing.
          const payload = {
            channel: "email" as const,
            ...args,
            to: args.to ?? resolveOwnerEmail(undefined),
          };
          return await prepareSadeedOutboundMessage(supabase, userId, payload);
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    send_executive_sms: tool({
      description:
        "Send an executive SMS/MMS. Direct send is allowed only when the recipient is the registered SADEED owner AND the current user message explicitly asks to send an SMS; otherwise the message is routed to the reviewed approval flow so it is not silently dropped.",
      inputSchema: z.object({
        to: z.string().min(8).max(24).optional().describe("Optional E.164 recipient"),
        body: z.string().min(1).max(1600),
        media_urls: z.array(z.string().url()).max(10).optional(),
      }),
      execute: async (args) => {
        try {
          const intentText = runtime.lastUserText ?? "";
          const isOwner = isOwnerSms(args.to);
          const explicit = hasExplicitOutboundIntent(intentText, "sms");
          if (isOwner && explicit && sadeedAutoApproveEnabled()) {
            const payload = {
              channel: "sms" as const,
              to: resolveOwnerSms(args.to),
              body: args.body,
              mediaUrls: args.media_urls,
            };
            return await sendSadeedOutboundMessageDirectInternal({
              userId,
              payload,
              explicitIntentText: intentText,
            });
          }
          const payload = {
            channel: "sms" as const,
            to: args.to ?? resolveOwnerSms(undefined),
            body: args.body,
            mediaUrls: args.media_urls,
          };
          return await prepareSadeedOutboundMessage(supabase, userId, payload);
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),

    record_executive_decision: tool({
      description:
        "Record an executive decision / commitment / milestone in the pulse memory so it is tracked." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        title: z.string().min(2).max(200),
        kind: z.enum(["decision", "commitment", "milestone", "risk", "opportunity"]),
        owner: z.string().max(120).default(""),
        department: z.string().max(120).default(""),
        impact: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        due_at: z.string().datetime().optional(),
      }),
      execute: async (args) =>
        confirmedWrite(
          "record_executive_decision",
          args,
          {
            orgId: runtime.orgId ?? null,
            ledger: false,
            summary: `تسجيل ${label(MEMORY_KIND_AR, args.kind)} «${clip(args.title)}» — الأثر: ${label(LEVEL_M_AR, args.impact)}${args.owner ? ` — المسؤول: ${clip(args.owner, 60)}` : ""}`,
          },
          async () => {
            const key = `aria-${Date.now().toString(36)}`;
            const { data, error } = await supabase
              .from("pulse_memory")
              .insert({
                user_id: userId,
                key,
                kind: args.kind,
                title: args.title,
                title_en: args.title,
                owner: args.owner,
                department: args.department,
                impact: args.impact,
                due_at: args.due_at ?? null,
                source: BRAND_ASSISTANT.nameAr,
                source_en: BRAND_ASSISTANT.nameEn,
                status: "open",
              })
              .select("id,key,title,kind,impact")
              .single();
            if (error) return { ok: false, error: error.message };
            return { ok: true, memory: data };
          },
        ),
    }),

    query_tasks: tool({
      description:
        "List the current user's tasks. Filter by status and/or priority. Use when the user asks about their tasks, to-do list, deliverables, pending work, مهامي, قائمة المهام.",
      inputSchema: z.object({
        status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("tasks")
          .select("id,title,status,priority,assigned_agent,due_at,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.priority) q = q.eq("priority", args.priority);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, tasks: data ?? [], count: data?.length ?? 0 };
      },
    }),

    update_task_status: tool({
      description:
        "Update the status of an existing task. Use when the user says 'mark X as done', 'أنهي مهمة', 'علّم كمكتمل', 'block task'." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        task_id: z.string().uuid(),
        status: z.enum(["todo", "in_progress", "done", "blocked"]),
      }),
      execute: async (args) =>
        confirmedWrite(
          "update_task_status",
          args,
          {
            orgId: runtime.orgId ?? null,
            ledger: false,
            summary: async () =>
              `تغيير حالة ${await describeExisting(supabase, "task", { id: args.task_id, user_id: userId })} إلى «${label(TASK_STATUS_AR, args.status)}»`,
          },
          async () => {
            const { data, error } = await supabase
              .from("tasks")
              .update({ status: args.status })
              .eq("id", args.task_id)
              .eq("user_id", userId)
              .select("id,title,status")
              .single();
            if (error) return { ok: false, error: error.message };
            return { ok: true, task: data };
          },
        ),
    }),

    search_knowledge: tool({
      description:
        "Search the current tenant's verified industrial-security corpus through Gemini embeddings, hybrid retrieval and the SADEED evidence gate. Use for policies, procedures and domain references. Never cite a result unless gate_result is passed. When embeddings are unavailable the search degrades to text matching: those matches arrive as unverified_matches, which you may mention but must never cite as verified evidence.",
      inputSchema: z.object({
        query: z.string().trim().min(3).max(2000),
        limit: z.number().int().min(2).max(12).default(8),
      }),
      execute: async (args) => {
        if (!runtime.orgId) {
          return { ok: false, gate_result: "error", reason: "missing_org_context" };
        }
        try {
          const [
            { retrieveWithEvidenceGate, unverifiedMentions, UNVERIFIED_MENTION_NOTE },
            { safeExcerpt },
          ] = await Promise.all([
            import("@/lib/sadeed/rag/retrieve.server"),
            import("@/lib/sadeed/rag/sanitize.server"),
          ]);
          const outcome = await retrieveWithEvidenceGate(supabase, {
            query: args.query,
            orgId: runtime.orgId,
            userId,
            limit: args.limit,
            route: "chat-tool:search_knowledge",
          });
          if (outcome.gate_result !== "passed") {
            // Article 26: no capture inside the request path. Gap capture is the
            // job of the after-the-fact reader, never written here (a
            // gap-recording RPC used to sit at this spot).
            const mentions = unverifiedMentions(outcome);
            return {
              ok: false,
              gate_result: outcome.gate_result,
              reason: outcome.reason ?? "insufficient_evidence",
              results: [],
              ...(mentions.length > 0
                ? { unverified_matches: mentions, unverified_note: UNVERIFIED_MENTION_NOTE }
                : {}),
            };
          }
          const results = outcome.hits.map((hit) => ({
            id: hit.id,
            citation: `[KB:${hit.doc_code ?? hit.id}]`,
            title: hit.title_ar ?? hit.title_en ?? hit.doc_code ?? hit.id,
            excerpt: safeExcerpt(hit.summary_ar ?? hit.summary_en ?? "", 900),
            similarity: hit.similarity,
          }));
          return {
            ok: true,
            gate_result: outcome.gate_result,
            max_similarity: outcome.max_similarity,
            citation_count: outcome.citation_count,
            results,
          };
        } catch {
          // Honest and non-throwing: nothing citable, and the model is told so.
          return { ok: false, gate_result: "error", reason: "retrieval_failed", results: [] };
        }
      },
    }),

    create_intelligence_alert: tool({
      description:
        "Raise an intelligence alert (risk signal, market event, operational anomaly) so it appears on the Intelligence dashboard. Use when the user reports a new risk/threat/signal to track." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        title: z.string().min(3).max(200),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        owner: z.string().max(120).optional(),
        business_impact_score: z.number().int().min(0).max(100).default(50),
        summary: z.string().max(2000).optional(),
      }),
      execute: async (args) =>
        confirmedWrite(
          "create_intelligence_alert",
          args,
          {
            orgId: runtime.orgId ?? null,
            ledger: false,
            summary: `رفع تنبيه استخباري «${clip(args.title)}» — الخطورة: ${label(LEVEL_AR, args.severity)} — أثر الأعمال: ${args.business_impact_score} من 100`,
          },
          async () => {
            const { data, error } = await supabase
              .from("intelligence_alerts")
              .insert({
                user_id: userId,
                title: args.title,
                severity: args.severity,
                owner: args.owner ?? null,
                business_impact_score: args.business_impact_score,
                detail: args.summary ?? null,
                source: BRAND_ASSISTANT.nameAr,
              })
              .select("id,title,severity,business_impact_score")
              .single();
            if (error) return { ok: false, error: error.message };
            return { ok: true, alert: data };
          },
        ),
    }),

    // ====================================================================
    // INDUSTRIAL SECURITY — OMS TOOLS
    // ====================================================================

    sec_create_incident: tool({
      description:
        "Create a new security incident (بلاغ/حادثة). Use ALWAYS when user reports an incident, intrusion, fire, leak, breach, تسرّب, اختراق, حريق, بلاغ, حادث." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        category: z
          .string()
          .min(2)
          .max(80)
          .describe("intrusion|fire|leak|access|theft|safety|other"),
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        owner: z.string().max(120).optional(),
        assigned_to: z.string().max(120).optional(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_create_incident",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: `تسجيل بلاغ أمني «${clip(args.title_ar)}» — الفئة: ${label(INCIDENT_CATEGORY_AR, args.category)} — الخطورة: ${label(LEVEL_AR, args.severity)} — الأولوية: ${label(LEVEL_AR, args.priority)}`,
          },
          async (confirmation_nonce) => {
            const ref = genRef("INC");
            const ai_risk_score = scoreRisk(args.severity, args.priority, args.category);
            const { data, error } = await supabase
              .from("sec_incidents")
              .insert({
                ref,
                org_id,
                category: args.category,
                title_ar: args.title_ar,
                title_en: args.title_en || args.title_ar,
                severity: args.severity,
                priority: args.priority,
                status: "open",
                owner: args.owner ?? null,
                assigned_to: args.assigned_to ?? null,
                reported_at: new Date().toISOString(),
                ai_risk_score,
                created_by: userId,
              })
              .select("id,ref,title_ar,severity,priority,ai_risk_score,status")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(
              supabase,
              userId,
              "incident",
              data.id,
              data.ref,
              "registered",
              {
                severity: args.severity,
                priority: args.priority,
                ai_risk_score,
                notes: args.notes ?? null,
                confirmation_nonce,
              },
            );
            return { ok: true, incident: data, audit };
          },
        );
      },
    }),

    sec_update_incident: tool({
      description:
        "Update incident status/priority/assignee/root cause. Status: open|investigating|contained|resolved|closed." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assigned_to: z.string().max(120).optional(),
        root_cause: z.string().max(2000).optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        // بلا مؤسسةٍ للفاعل لا أثر ولا سجلّ إعادة ⇐ يفشل مغلقًا قبل أي كتابة.
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        const { id, ...patch } = args;
        const changes = [
          patch.status ? `الحالة إلى «${label(INCIDENT_STATUS_AR, patch.status)}»` : null,
          patch.priority ? `الأولوية إلى ${label(LEVEL_AR, patch.priority)}` : null,
          patch.assigned_to ? `المسند إليه: ${clip(patch.assigned_to, 60)}` : null,
          patch.root_cause ? `السبب الجذري: «${clip(patch.root_cause, 80)}»` : null,
        ].filter(Boolean);
        return confirmedWrite(
          "sec_update_incident",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () =>
              `تحديث ${await describeExisting(supabase, "incident", { id })}: ${changes.length ? changes.join(" — ") : "بلا تغيير محدّد"}`,
          },
          async (confirmation_nonce) => {
            const { data, error } = await supabase
              .from("sec_incidents")
              .update(patch)
              .eq("id", id)
              .select("id,ref,status,priority")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(supabase, userId, "incident", id, data.ref, "updated", {
              ...patch,
              confirmation_nonce,
            });
            return { ok: true, incident: data, audit };
          },
        );
      },
    }),

    sec_list_incidents: tool({
      description: "List recent security incidents. Filter by status/severity.",
      inputSchema: z.object({
        status: z.enum(["open", "investigating", "contained", "resolved", "closed"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_incidents")
          .select(
            "id,ref,title_ar,category,severity,priority,status,ai_risk_score,reported_at,assigned_to",
          )
          .order("reported_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.severity) q = q.eq("severity", args.severity);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, incidents: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_create_work_order: tool({
      description:
        "Create a maintenance work order (أمر عمل). preventive or corrective. Optionally link to a source incident." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        title_ar: z.string().min(3).max(200),
        title_en: z.string().max(200).optional(),
        kind: z.enum(["preventive", "corrective"]),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        asset_kind: z
          .string()
          .min(2)
          .max(80)
          .describe("camera|gate|sensor|access|fence|fire-system|other"),
        asset_code: z.string().max(80).optional(),
        assigned_to: z.string().max(120).optional(),
        contractor: z.string().max(120).optional(),
        due_at: z.string().datetime().optional(),
        source_incident_id: z.string().uuid().optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_create_work_order",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () => {
              const linked = args.source_incident_id
                ? ` — مرتبط ب${await describeExisting(supabase, "incident", { id: args.source_incident_id })}`
                : "";
              return `إنشاء أمر عمل ${args.kind === "preventive" ? "وقائي" : "تصحيحي"} «${clip(args.title_ar)}» — الأصل: ${label(ASSET_KIND_AR, args.asset_kind)}${args.asset_code ? ` (${clip(args.asset_code, 40)})` : ""} — الأولوية: ${label(LEVEL_AR, args.priority)}${linked}`;
            },
          },
          async (confirmation_nonce) => {
            const ref = genRef("WO");
            const { data, error } = await supabase
              .from("sec_work_orders")
              .insert({
                ref,
                org_id,
                title_ar: args.title_ar,
                title_en: args.title_en || args.title_ar,
                kind: args.kind,
                priority: args.priority,
                status: "open",
                asset_kind: args.asset_kind,
                asset_code: args.asset_code ?? null,
                assigned_to: args.assigned_to ?? null,
                contractor: args.contractor ?? null,
                due_at: args.due_at ?? null,
                opened_at: new Date().toISOString(),
                source_incident_id: args.source_incident_id ?? null,
                created_by: userId,
              })
              .select("id,ref,title_ar,kind,priority,status,due_at")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(
              supabase,
              userId,
              "work_order",
              data.id,
              data.ref,
              "created",
              {
                kind: args.kind,
                priority: args.priority,
                source_incident_id: args.source_incident_id ?? null,
                confirmation_nonce,
              },
            );
            return { ok: true, work_order: data, audit };
          },
        );
      },
    }),

    sec_close_work_order: tool({
      description:
        "Close/complete a work order with completion notes. Auto-contains the source incident if linked." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        id: z.string().uuid(),
        completion_notes: z.string().min(3).max(2000),
      }),
      execute: async (args) => {
        const { id, completion_notes } = args;
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_close_work_order",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () =>
              `إغلاق ${await describeExisting(supabase, "work_order", { id })} بملاحظات الإنجاز «${clip(completion_notes, 100)}» — ويُحوَّل البلاغ المرتبط به (إن وُجد) إلى «محتوى»`,
          },
          async (confirmation_nonce) => {
            const { data, error } = await supabase
              .from("sec_work_orders")
              .update({
                status: "closed",
                closed_at: new Date().toISOString(),
                completion_notes,
                notes: completion_notes,
              })
              .eq("id", id)
              .select("ref,source_incident_id")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(
              supabase,
              userId,
              "work_order",
              id,
              data.ref,
              "completed",
              {
                completion_notes,
                confirmation_nonce,
              },
            );
            let linkedIncidentAudit: AuditResult | null = null;
            if (data.source_incident_id) {
              const { error: incidentError } = await supabase
                .from("sec_incidents")
                .update({ status: "contained" })
                .eq("id", data.source_incident_id);
              linkedIncidentAudit = incidentError
                ? {
                    ok: false,
                    error: `Linked incident update failed: ${incidentError.message}`,
                  }
                : await logEvent(
                    supabase,
                    userId,
                    "incident",
                    data.source_incident_id,
                    null,
                    "auto_contained_by_work_order",
                    { work_order_ref: data.ref },
                  );
            }
            return { ok: true, id, ref: data.ref, audit, linkedIncidentAudit };
          },
        );
      },
    }),

    sec_list_work_orders: tool({
      description: "List work orders. Filter by status/kind/priority.",
      inputSchema: z.object({
        status: z
          .enum(["open", "assigned", "in-progress", "on-hold", "closed", "cancelled"])
          .optional(),
        kind: z.enum(["preventive", "corrective"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_work_orders")
          .select("id,ref,title_ar,kind,priority,status,asset_kind,assigned_to,due_at,opened_at")
          .order("opened_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        if (args.kind) q = q.eq("kind", args.kind);
        if (args.priority) q = q.eq("priority", args.priority);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, work_orders: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_create_permit: tool({
      description: "Create a Permit-To-Work (تصريح عمل) for a contractor." + CONFIRMATION_PROTOCOL,
      inputSchema: z
        .object({
          work_type: z
            .string()
            .min(2)
            .max(80)
            .describe("hot-work|confined-space|electrical|height|excavation|general"),
          contractor: z.string().min(2).max(160),
          risk_level: z.enum(["low", "medium", "high", "critical"]),
          starts_at: z.string().datetime(),
          ends_at: z.string().datetime(),
          notes: z.string().max(2000).optional(),
        })
        .refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
          message: "ends_at must be later than starts_at",
          path: ["ends_at"],
        }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_create_permit",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () => {
              const span = makkahSpan(args.starts_at, args.ends_at);
              return `إنشاء تصريح عمل (${label(PERMIT_WORK_TYPE_AR, args.work_type)}) للمقاول «${clip(args.contractor, 80)}» — مستوى الخطر: ${label(LEVEL_M_AR, args.risk_level)}${span ? ` — ${span}` : ""}`;
            },
          },
          async (confirmation_nonce) => {
            const ref = genRef("PTW");
            const { data, error } = await supabase
              .from("sec_permits")
              .insert({
                ref,
                org_id,
                created_by: userId,
                work_type: args.work_type,
                contractor: args.contractor,
                risk_level: args.risk_level,
                status: "pending",
                starts_at: args.starts_at,
                ends_at: args.ends_at,
                notes: args.notes ?? null,
              })
              .select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(supabase, userId, "permit", data.id, data.ref, "created", {
              risk_level: args.risk_level,
              confirmation_nonce,
            });
            return { ok: true, permit: data, audit };
          },
        );
      },
    }),

    sec_decide_permit: tool({
      description: "Approve or reject a pending permit-to-work." + CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      }),
      execute: async (args) => {
        const { id, decision, note } = args;
        // Defense-in-depth: faithfully mirror the effective RLS policy
        // `sec_permits_admin_write` (has_role(auth.uid(),'admin')) — writing to
        // sec_permits requires the platform admin role. Checking it here gives
        // a clear early 403 instead of an opaque RLS rejection. Additive only
        // (never loosens); RLS remains the primary enforcement.
        const { hasPlatformRole } = await import("@/lib/authz.server");
        if (!(await hasPlatformRole(userId, "admin"))) {
          return {
            ok: false,
            error: "Forbidden: deciding a permit-to-work requires the admin role.",
          };
        }
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_decide_permit",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () =>
              `${decision === "approved" ? "اعتماد" : "رفض"} ${await describeExisting(supabase, "permit", { id })}${note ? ` — ملاحظة: «${clip(note, 80)}»` : ""}`,
          },
          async (confirmation_nonce) => {
            const { data, error } = await supabase
              .from("sec_permits")
              .update({ status: decision })
              .eq("id", id)
              .select("ref")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(supabase, userId, "permit", id, data.ref, decision, {
              note: note ?? null,
              confirmation_nonce,
            });
            return { ok: true, id, ref: data.ref, decision, audit };
          },
        );
      },
    }),

    sec_list_permits: tool({
      description: "List permits-to-work. Filter by status.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "approved", "rejected", "active", "expired", "closed"])
          .optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_permits")
          .select("id,ref,work_type,contractor,risk_level,status,starts_at,ends_at")
          .order("starts_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, permits: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_schedule_patrol: tool({
      description:
        "Schedule a security patrol round (دورية). Provide team, route, and number of checkpoints." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        team: z.string().min(2).max(120),
        route: z.string().min(2).max(200),
        checkpoints_total: z.number().int().min(1).max(100).default(10),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_schedule_patrol",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: `جدولة دورية للفريق «${clip(args.team, 80)}» على المسار «${clip(args.route)}» — نقاط التفتيش: ${args.checkpoints_total}`,
          },
          async (confirmation_nonce) => {
            const ref = genRef("PT");
            const { data, error } = await supabase
              .from("sec_patrols")
              .insert({
                ref,
                org_id,
                team: args.team,
                route: args.route,
                checkpoints_total: args.checkpoints_total,
                checkpoints_done: 0,
                status: "scheduled",
              })
              .select("id,ref,team,route,status,checkpoints_total")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(
              supabase,
              userId,
              "patrol",
              data.id,
              data.ref,
              "scheduled",
              {
                team: args.team,
                route: args.route,
                confirmation_nonce,
              },
            );
            return { ok: true, patrol: data, audit };
          },
        );
      },
    }),

    sec_list_patrols: tool({
      description: "List patrol rounds. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["scheduled", "active", "completed", "missed"]).optional(),
        limit: z.number().int().min(1).max(50).default(15),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_patrols")
          .select("id,ref,team,route,status,checkpoints_total,checkpoints_done,started_at,ended_at")
          .order("created_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, patrols: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_register_visitor: tool({
      description:
        "Register a visitor (زائر) checking into a site. Issues a badge ref." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        full_name: z.string().min(2).max(160),
        host: z.string().min(2).max(160),
        organization: z.string().max(160).optional(),
        purpose: z.string().max(300).optional(),
        badge_no: z.string().max(40).optional(),
      }),
      execute: async (args) => {
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_register_visitor",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: `تسجيل دخول الزائر «${clip(args.full_name, 80)}» لدى المضيف «${clip(args.host, 80)}»${args.organization ? ` — الجهة: ${clip(args.organization, 80)}` : ""}${args.purpose ? ` — الغرض: ${clip(args.purpose, 80)}` : ""}`,
          },
          async (confirmation_nonce) => {
            const ref = genRef("V");
            const { data, error } = await supabase
              .from("sec_visitors")
              .insert({
                ref,
                org_id,
                created_by: userId,
                full_name: args.full_name,
                host: args.host,
                organization: args.organization ?? null,
                purpose: args.purpose ?? null,
                badge_no: args.badge_no ?? ref,
                status: "inside",
                check_in_at: new Date().toISOString(),
              })
              .select("id,ref,full_name,host,badge_no,status")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(
              supabase,
              userId,
              "visitor",
              data.id,
              data.ref,
              "checked_in",
              {
                host: args.host,
                confirmation_nonce,
              },
            );
            return { ok: true, visitor: data, audit };
          },
        );
      },
    }),

    sec_checkout_visitor: tool({
      description:
        "Check out a visitor by id. Marks status=left and sets check_out_at." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async (args) => {
        const { id } = args;
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_checkout_visitor",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () =>
              `تسجيل خروج ${await describeExisting(supabase, "visitor", { id })}`,
          },
          async (confirmation_nonce) => {
            const { data, error } = await supabase
              .from("sec_visitors")
              .update({ status: "left", check_out_at: new Date().toISOString() })
              .eq("id", id)
              .select("ref,full_name")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(supabase, userId, "visitor", id, data.ref, "checked_out", {
              confirmation_nonce,
            });
            return { ok: true, id, ref: data.ref, audit };
          },
        );
      },
    }),

    sec_list_visitors: tool({
      description: "List recent visitors. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["expected", "inside", "left", "overdue"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_visitors")
          .select("id,ref,full_name,organization,host,status,check_in_at,check_out_at")
          .order("check_in_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, visitors: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_list_cctv_alerts: tool({
      description: "List CCTV / AI camera alerts. Filter by status.",
      inputSchema: z.object({
        status: z.enum(["new", "triaged", "dispatched", "resolved", "false_positive"]).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async (args) => {
        let q = supabase
          .from("sec_cctv_alerts")
          .select("id,ref,camera_code,alert_type,confidence,status,detected_at,notes")
          .order("detected_at", { ascending: false })
          .limit(args.limit);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q;
        if (error) return { ok: false, error: error.message };
        return { ok: true, alerts: data ?? [], count: data?.length ?? 0 };
      },
    }),

    sec_triage_cctv_alert: tool({
      description:
        "Triage a CCTV alert: set status to triaged/dispatched/resolved/false_positive with notes." +
        CONFIRMATION_PROTOCOL,
      inputSchema: z.object({
        id: z.string().uuid(),
        status: z.enum(["triaged", "dispatched", "resolved", "false_positive"]),
        notes: z.string().max(1000).optional(),
        acknowledged_by: z.string().max(160).optional(),
      }),
      execute: async (args) => {
        const { id, status, notes, acknowledged_by } = args;
        const denied = await requireOperationalWriterRole(userId);
        if (denied) return { ok: false, error: denied };
        const org_id = await getActorOrgId(supabase, userId);
        if (!org_id)
          return {
            ok: false,
            error: "Actor is not assigned to an organization",
          };
        return confirmedWrite(
          "sec_triage_cctv_alert",
          args,
          {
            orgId: org_id,
            ledger: true,
            summary: async () =>
              `فرز ${await describeExisting(supabase, "cctv_alert", { id })} إلى «${label(CCTV_STATUS_AR, status)}»${notes ? ` — ملاحظات: «${clip(notes, 80)}»` : ""}`,
          },
          async (confirmation_nonce) => {
            const { data, error } = await supabase
              .from("sec_cctv_alerts")
              .update({
                status,
                notes: notes ?? null,
                acknowledged_by: acknowledged_by ?? BRAND_ASSISTANT.nameAr,
              })
              .eq("id", id)
              .select("ref,camera_code")
              .single();
            if (error) return { ok: false, error: error.message };
            const audit = await logEvent(supabase, userId, "cctv_alert", id, data.ref, status, {
              notes: notes ?? null,
              confirmation_nonce,
            });
            return { ok: true, id, ref: data.ref, audit };
          },
        );
      },
    }),

    // ─── FINN → agent dispatch (RT-10/FINN-1) ────────────────────────────
    // الحلقة المفقودة: الدردشة كانت تقرأ حالة الوكلاء ولا تملك أن تشغّل واحدًا.
    // الأداة الخامسة عشرة خلف بوابة التأكيد البشري؛ تُسجَّل للمسجَّل وحده وحين
    // يقول سياق الدور إن الوكلاء متاحون (Gemini). الفحوص قبل الاقتراح تطابق
    // ما يفحصه `runAgent` (وجود الوكيل وتفعيله ودور الفاعل ومؤسسته) كي لا يُعرض
    // ملخّصٌ لتشغيلٍ سيُرفض. التشغيل بعميل المستخدم (RLS) كما `runAgentFn`:
    // التنسيق داخله بمفتاح الخدمة، والمنفّذون يقرؤون بيانات المستأجر تحت RLS
    // المستخدم مقيَّدين بـ`ctx.orgId`، و`actorId` المستخدم و`requiredOrgId` المتحقَّق.
    ...(runtime.agentsAvailable
      ? {
          dispatch_agent: tool({
            description:
              "Start one SADEED autonomous agent run (agent_runs) for the verified organization with a goal, on the user's own identity. Use when the user explicitly asks to run / dispatch / launch an agent (e.g. «شغّل وكيل الإحاطات», «أطلق وكيل المخاطر على …»). The run spends one chat AI-quota unit of the user in addition to this turn, and is bounded to about 30 seconds inside this turn: when the budget ends the run is cancelled and its real outcome (run.id, status cancelled) is returned; only if that outcome has not arrived within a few more seconds does the result carry run.status running with a note — then follow up with execution_status. Report run.status verbatim (succeeded / failed / cancelled / running) and the summary; never claim a result the run did not return. Agents and their IDs are listed on the /agents page (e.g. briefing, risk, incidents)." +
              CONFIRMATION_PROTOCOL,
            inputSchema: z.object({
              agentId: z
                .string()
                .trim()
                .min(1)
                .max(80)
                .regex(/^[A-Za-z0-9_-]+$/)
                .describe("agent_definitions.id"),
              goal: z
                .string()
                .trim()
                .min(4)
                // سقفٌ يُعرض كاملًا في ملخّص التأكيد: ما يُؤكَّد هو ما يُنفَّذ حرفًا.
                .max(500)
                .describe("Mission for this run, in the user's language (max 500 chars)"),
            }),
            execute: async ({ agentId, goal }, options) => {
              // فشلٌ مغلق بلا مؤسسةٍ متحقَّقة — كما `execution_status`.
              if (!runtime.orgId) {
                return {
                  ok: false,
                  error: "missing_org_context",
                  message: "لا تتوفّر مؤسسة متحقَّقة لهذه الجلسة، فلا يُشغَّل وكيل.",
                };
              }
              const orgId = runtime.orgId;
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { data: agents, error: agentError } = await supabaseAdmin
                .from("agent_definitions")
                .select("id, name, enabled, permissions, org_id")
                .eq("id", agentId)
                .eq("org_id", orgId)
                .limit(1);
              if (agentError)
                return { ok: false, error: `agent_definitions: ${agentError.message}` };
              const agent = (agents ?? [])[0] as
                | { id: string; name: string; enabled: boolean; permissions: string[] | null }
                | undefined;
              if (!agent) return { ok: false, error: "agent_not_found", agentId };
              if (!agent.enabled) return { ok: false, error: "agent_disabled", agentId };
              // قاعدة `runAgent` نفسها: الأدوار المسمّاة في `permissions`، وإلا admin/manager.
              const namedPlatformRoles = (agent.permissions ?? []).filter(
                (p) => p === "admin" || p === "manager" || p === "member",
              );
              const requiredRoles = namedPlatformRoles.length
                ? namedPlatformRoles
                : ["admin", "manager"];
              const { hasAnyPlatformRole } = await import("@/lib/authz.server");
              if (!(await hasAnyPlatformRole(userId, requiredRoles))) {
                return {
                  ok: false,
                  error: `Forbidden: missing role for agent ${agentId}`,
                  required_roles: requiredRoles,
                };
              }
              return confirmedWrite(
                "dispatch_agent",
                { agentId, goal },
                {
                  orgId,
                  ledger: false,
                  // الهدف كاملًا لا مقصوصًا: المستخدم يؤكّد ما سيُنفَّذ حرفًا.
                  summary: `تشغيل الوكيل «${clip(agent.name, 80)}» على: «${goal}»`,
                },
                async () => {
                  const { runAgent } = await import("@/lib/exec/agent-runtime.server");
                  const budget = AbortSignal.timeout(DISPATCH_AGENT_BUDGET_MS);
                  const turnSignal = (options as { abortSignal?: AbortSignal } | undefined)
                    ?.abortSignal;
                  const signal = turnSignal ? AbortSignal.any([turnSignal, budget]) : budget;
                  const budgetNote = "انتهت مهلة الدور؛ تابع بـexecution_status";
                  const aborted = new Promise<null>((resolve) =>
                    signal.addEventListener("abort", () => resolve(null), { once: true }),
                  );
                  // عميل المستخدم (RLS) للمنفّذين — كما `runAgentFn`؛ التنسيق بمفتاح الخدمة داخلًا.
                  const runPromise = runAgent(supabase, {
                    agentId,
                    actorId: userId,
                    requiredOrgId: orgId,
                    goalOverride: goal,
                    context: { source: "chat.dispatch_agent" },
                    signal,
                  });
                  // إن تركناه في مسار الميزانية فرفضُه اللاحق لا يبقى بلا معالِج.
                  runPromise.catch(() => undefined);
                  let run = await Promise.race([runPromise, aborted]);
                  if (!run) {
                    // انقضت الميزانية: الإشارة تُلغي التشغيل ويكتب `cancelled` بنفسه —
                    // تُنتظر نتيجته الحقيقية مهلة سماحٍ قصيرة قبل الاكتفاء بـ«جارٍ».
                    let grace: ReturnType<typeof setTimeout> | undefined;
                    try {
                      run = await Promise.race([
                        runPromise,
                        new Promise<null>((resolve) => {
                          grace = setTimeout(() => resolve(null), DISPATCH_AGENT_GRACE_MS);
                        }),
                      ]);
                    } finally {
                      clearTimeout(grace);
                    }
                  }
                  if (!run) {
                    // لم يعد حتى بعد السماح (عملٌ قبل الحلقة لم ينتهِ): الحالة الصادقة
                    // «جارٍ» حتى تُقرأ من `execution_status`.
                    return {
                      ok: true,
                      run: { id: null, status: "running", note: budgetNote },
                    };
                  }
                  return {
                    ok: true,
                    run: {
                      id: run.runId,
                      status: run.status,
                      summary: run.summary,
                      steps: run.steps,
                      ...(run.error ? { error: run.error } : {}),
                      ...(run.pendingApprovals ? { pendingApprovals: run.pendingApprovals } : {}),
                      ...(signal.aborted ? { note: budgetNote } : {}),
                    },
                  };
                },
              );
            },
          }),
        }
      : {}),

    execution_status: tool({
      description:
        "Read the authoritative execution state of SADEED agents for the verified organization: the latest 10 agent runs and up to 10 tool executions that are pending approval, queued or running. Use when the user asks what the agents are doing, whether an action is awaiting approval, or whether a run finished. Read-only. Report only what it returns; rows are those visible to the caller under RLS, so an empty list is not proof that nothing exists.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!runtime.orgId) {
          return {
            ok: false,
            error: "missing_org_context",
            message: "لا تتوفّر مؤسسة متحقَّقة لهذه الجلسة، فلا تُقرأ حالة تنفيذ الوكلاء.",
          };
        }
        const { readExecutionStatus } = await import("@/lib/exec/execution-status.server");
        return readExecutionStatus(supabase, runtime.orgId);
      },
    }),

    sec_navigate: tool({
      description:
        "Navigate the user to a specific page in سَدِيد. Use when user says 'open X', 'go to', 'افتح', 'انتقل'. Returns a target route the UI will navigate to.",
      inputSchema: z.object({
        target: z.enum([
          "/dashboard",
          "/sec",
          "/sec/exec",
          "/sec/twin",
          "/sec/incidents",
          "/sec/maintenance",
          "/sec/permits",
          "/sec/patrols",
          "/sec/visitors",
          "/sec/cctv",
          // «مؤشرات الأداء» /sec/kpi حُجبت ٢٠٢٦/٠٨/٢٠ — فتحها يرتدّ إلى /sec.
          "/sec/ai",
          "/sec/projects",
          "/sec/risks",
          // «الدوائر» و«الأقسام» حُجبتا ٢٠٢٦/٠٨/٢٠ — فتحهما يرتدّ إلى /sec.
          "/tasks",
          "/executive",
          "/sec/reports",
          "/briefing",
          "/integrations",
        ]),
        reason: z.string().max(200).optional(),
      }),
      execute: async ({ target, reason }) => ({
        ok: true,
        navigate_to: target,
        reason: reason ?? null,
      }),
    }),

    // ─── Article 24 §5 — Generative image tool ───────────────────────────
    // Calls the native Google Gemini image model, stores the result
    // in the caller's private aria-attachments bucket, and returns a
    // 1-hour signed URL for inline markdown embedding.
    generate_image: tool({
      description:
        "Generate a new image from a text prompt (Arabic or English). Use when the user asks to draw / render / produce / design an image, diagram, poster, mock-up, or illustration. Returns a signed URL you MUST embed inline as ![alt](url).",
      inputSchema: z.object({
        prompt: z.string().min(4).max(1500).describe("Concrete visual prompt."),
        alt: z.string().max(200).optional().describe("Accessible alt text."),
        aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      }),
      execute: async ({ prompt, alt, aspect_ratio }) => {
        const imageRate = await enforceRateLimit(`aria-image:${userId}`, 5, 600);
        if (imageRate.unavailable) {
          return { ok: false, error: "image_rate_limit_unavailable" };
        }
        if (!imageRate.allowed) return { ok: false, error: "image_rate_limit_exceeded" };

        try {
          const { resolveSadeedGeminiRuntime } =
            await import("@/lib/sadeed/gemini-provider.server");
          const runtimeModel = resolveSadeedGeminiRuntime();
          const generated = await generateImage({
            model: runtimeModel.provider.image("gemini-3.1-flash-image"),
            prompt,
            aspectRatio: aspect_ratio,
            n: 1,
            maxRetries: 2,
            abortSignal: AbortSignal.timeout(60_000),
          });
          const image = generated.image;
          const mime = image.mediaType;
          if (!/^(?:image\/png|image\/jpeg|image\/webp)$/.test(mime)) {
            return { ok: false, error: "unsupported_generated_image_type" };
          }
          const bytes = Buffer.from(image.uint8Array);
          if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
            return { ok: false, error: "generated_image_too_large" };
          }
          const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
          const objectPath = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: upErr } = await supabaseAdmin.storage
            .from("aria-attachments")
            .upload(objectPath, bytes, { contentType: mime, upsert: false });
          if (upErr) return { ok: false, error: `upload_failed:${upErr.message}` };
          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from("aria-attachments")
            .createSignedUrl(objectPath, 60 * 60);
          if (signErr || !signed?.signedUrl) {
            return {
              ok: false,
              error: `sign_failed:${signErr?.message ?? "unknown"}`,
            };
          }
          const safeAlt = (alt ?? prompt.slice(0, 80)).replace(/[[\]\r\n]/g, " ").trim();
          return {
            ok: true,
            kind: "image",
            mime,
            size_bytes: bytes.length,
            url: signed.signedUrl,
            path: objectPath,
            prompt,
            alt: safeAlt,
            markdown: `![${safeAlt}](${signed.signedUrl})`,
          };
        } catch (e) {
          return {
            ok: false,
            error: e instanceof Error ? e.message : "generate_image_failed",
          };
        }
      },
    }),
  };
}

export type SadeedToolset = ReturnType<typeof buildSadeedTools>;
