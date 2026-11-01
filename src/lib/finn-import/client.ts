/**
 * عميل «إرفاق ملف وتحميله إلى مكتبة المعرفة» في فِن (أمر المالك ٢٠٢٦/١٠/٣١) — **آمن للعميل**.
 *
 * ما يفعله هذا الملف وما لا يفعله (قرارات التصميم في `contract.ts`):
 *  - **لا يقرأ الملف إطلاقًا.** لا `FileReader` ولا `arrayBuffer()` ولا `text()` ولا مكتبة جداول:
 *    الواجهة تفحص الاسم والحجم فقط ثم تسلّم كائن `File` كما هو إلى `FormData`. التحليل كلّه في الخادم.
 *  - **النموذج لا يرى الملف.** لا شيء من هنا يدخل `messages` ولا ناقل المحادثة (`finn-agent/client`)؛
 *    يحرس ذلك `finn-import-ui.contract.test.ts` بانتهاكات مزروعة.
 *  - **لا يسجّل شيئًا ولا يردّد نصًّا.** أخطاء الخادم تُقرأ بكودها؛ ونصّه العربي يُعرض فقط إن مرّ فحص
 *    الشكل (عربي، قصير، بلا عبارات مصادقة/رموز) وإلا استُبدل بجملةٍ ثابتة من هنا. أيّ استثناء شبكة
 *    (ومنه رسائل الجلسة الإنجليزية) يصير جملةً عربية محايدة — الطريقة المحفوظة، البند ٣.
 *  - **كل نصٍّ مأخوذ من الملف** (اسمه · الأوراق · الترويسات) يمرّ بـ`displaySafe`: تُنزع محارف التحكّم
 *    ومحارف قلب الاتجاه (U+202E…) ويُقتطع، ثم يُرسم نصًّا في React لا HTML.
 */
import { authenticatedFetch } from "@/lib/auth-fetch";
import {
  FINN_IMPORT_ENDPOINT,
  FINN_IMPORT_EXTENSIONS,
  FINN_IMPORT_FIELDS,
  FINN_IMPORT_LIMITS,
  type FinnImportAction,
  type FinnImportErrorCode,
  type FinnImportPreview,
} from "./contract";

/** أمدٌ أقصى لانتظار ردّ الخادم؛ بعده تُقطع الشبكة ويُعلَن ذلك (لا تحميلٌ أبدي). */
export const FINN_IMPORT_CLIENT_TIMEOUT_MS = 90_000;

/** رموز خطأ إضافية يولّدها العميل وحده (الخادم لا يرسلها). */
export type FinnImportClientCode =
  FinnImportErrorCode | "network" | "timeout" | "aborted" | "forbidden" | "bad_response";

export interface FinnImportClientFailure {
  readonly ok: false;
  readonly error: FinnImportClientCode;
  /** عربي آمن للعرض — إمّا من الخادم بعد فحص الشكل وإمّا ثابتٌ من هنا. */
  readonly message_ar: string;
  readonly retry_after_s?: number;
}

/**
 * المعاينة كما تراها الواجهة: **منظَّفة ومحدودة** ومن غير ما لا تعرضه (اسم الملف يأتي من اختيار المالك نفسه،
 * وانتهاء الرمز يحكم فيه الخادم). الرمز يُمرَّر عند التأكيد ولا يُعرض ولا يُسجَّل.
 */
export interface FinnImportPreviewView {
  readonly ok: true;
  readonly kind: "preview";
  readonly sheets: FinnImportPreview["sheets"];
  readonly totals: FinnImportPreview["totals"];
  readonly pii: FinnImportPreview["pii"];
  readonly warnings: readonly string[];
  readonly token: string;
}

export interface FinnImportDoneView {
  readonly ok: true;
  readonly kind: "done";
  readonly documents: number;
  /** ما كان موجودًا سابقًا فلم يُكرَّر (من عدّادات الخادم؛ 0 إن غابت). */
  readonly deduped: number;
}

export type FinnImportOutcome =
  FinnImportPreviewView | FinnImportDoneView | FinnImportClientFailure;

/* ───────────────────────────── النصوص ───────────────────────────── */

export const FINN_IMPORT_COPY = {
  attach: "إرفاق ملف",
  inputLabel: "اختيار ملف لتحميله إلى مكتبة المعرفة",
  cardLabel: "تحميل ملف إلى مكتبة المعرفة",
  detailsLabel: "تفاصيل الملف",
  emptyHint:
    "يمكنك إرفاق ملف (إكسل أو CSV أو نصّ) لمعاينته وتحميله إلى مكتبة المعرفة بتأكيدك؛ لا يُرسَل محتواه إلى محادثة فِن، ويُرسَل نصّه أثناء الفهرسة إلى مزوّد التضمين، وبعدها قد يستعين به سَدِيد.",
  previewing: "جارٍ تحليل الملف…",
  executing: "جارٍ تحميل الملف…",
  confirm: "تحميل إلى مكتبة المعرفة",
  cancel: "إلغاء",
  cancelLoad: "إيقاف الانتظار",
  retry: "حاول مجدّدًا",
  freshPreview: "أعد المعاينة",
  close: "إغلاق",
  scope:
    "الوجهة مكتبة المعرفة فقط؛ لا يُرسَل محتوى الملف إلى المحادثة ولا إلى نموذج الإجابة عند التحميل، لكنّ نصّه (بعد الحجب) يُرسَل أثناء الفهرسة إلى مزوّد التضمين، وبعد اكتمالها قد تُستخدم مقاطع منه سياقًا لإجابات سَدِيد عن أسئلتك.",
  maskScope:
    "الأسماء والعناوين لا تُحجب، وقد يفلت رقمٌ بصيغةٍ غير معروفة أو مقسومٍ على خلايا؛ فراجع الملف قبل التحميل.",
  legacyExcel: "صيغة xls وxlsm وxlsb غير مقبولة. احفظ الملف بصيغة xlsx أو csv.",
  unsupported: `هذا النوع غير مقبول. الأنواع المقبولة: ${FINN_IMPORT_EXTENSIONS.join("، ")}.`,
  empty: "الملف فارغ؛ لا شيء لتحميله.",
} as const;

/**
 * جُمل الفشل التي يولّدها **العميل** وحده (فحص الملف · الشبكة · الحالات بلا JSON). أمّا رموز الخادم فنصّها
 * العربي من الخادم (العقد: `message_ar` آمن للعرض)، ولا يحلّ محلّه هنا إلا `GENERIC` حين لا يمرّ فحص الشكل.
 */
const GENERIC = "تعذّر إكمال العملية. أعد المحاولة بعد قليل.";
const FALLBACK_AR: Readonly<Partial<Record<FinnImportClientCode, string>>> = {
  unsupported_type: FINN_IMPORT_COPY.unsupported,
  too_large: `الملف أكبر من الحدّ (${(FINN_IMPORT_LIMITS.maxFileBytes / 1048576).toLocaleString("ar-SA")} ميغابايت). اختصره أو قسّمه.`,
  empty: FINN_IMPORT_COPY.empty,
  already_used: "نُفِّذ هذا التحميل من قبل. راجع مكتبة المعرفة ولا تكرّره.",
  unavailable: "الخدمة غير متاحة الآن ولم يُحمَّل شيءٌ مؤكَّد. أعد المحاولة بعد قليل.",
  network: "تعذّر الاتصال بالخادم. تحقّق من الشبكة وأعد المحاولة.",
  timeout: "استغرق الأمر وقتًا أطول من المتوقع.",
  forbidden: "هذا الإجراء غير متاح لحسابك.",
};

/** فشلٌ بعد وصول الطلب إلى الخادم قد يكون أكمل الكتابة: لا يُترك المالك يظنّ أنه لم يحدث شيء. */
const MAYBE_DONE =
  "تعذّر تأكيد النتيجة، وقد يكون التحميل اكتمل. راجع مكتبة المعرفة قبل أن تعيد المحاولة.";

/* ───────────────────────────── فحص الملف في العميل ───────────────────────────── */

const LEGACY_EXCEL = new Set(["xls", "xlsm", "xlsb"]);

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0
    ? ""
    : name
        .slice(dot + 1)
        .trim()
        .toLowerCase();
}

export type FinnImportFileCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: "unsupported_type" | "too_large" | "empty";
      readonly message_ar: string;
    };

/** نوعٌ ثم فراغٌ ثم حجم — بالاسم والحجم فقط (لا يُقرأ المحتوى). الخادم يعيد الفحص ولا يثق بهذا. */
export function validateFinnImportFile(file: {
  readonly name: string;
  readonly size: number;
}): FinnImportFileCheck {
  const ext = fileExtension(file.name);
  if (!(FINN_IMPORT_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error: "unsupported_type",
      message_ar: LEGACY_EXCEL.has(ext)
        ? FINN_IMPORT_COPY.legacyExcel
        : FINN_IMPORT_COPY.unsupported,
    };
  }
  if (!(file.size > 0)) return { ok: false, error: "empty", message_ar: FINN_IMPORT_COPY.empty };
  if (file.size > FINN_IMPORT_LIMITS.maxFileBytes) {
    return { ok: false, error: "too_large", message_ar: FALLBACK_AR.too_large ?? GENERIC };
  }
  return { ok: true };
}

/* ───────────────────────────── الشبكة ───────────────────────────── */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const count = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

/** عبارات لا تبلغ الشاشة أبدًا (الطريقة المحفوظة، البند ٣) + أسماء مكوّنات الخادم. */
const FORBIDDEN_WORDS = /authenticat|unauthor|token|jwt|bearer|api[\s_-]?key|secret|supabase/i;
const ARABIC = /\p{Script=Arabic}/u;

/** نصّ الخادم العربي لا يُعرض إلا إن بدا جملةً عربية قصيرة نظيفة. */
function usableMessage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 300 &&
    ARABIC.test(value) &&
    !FORBIDDEN_WORDS.test(value)
  );
}

/** رموز الخادم المعروفة (عقد `FinnImportErrorCode`)؛ ما سواها يُحكم بحالة HTTP. */
const SERVER_CODES =
  "invalid_request unsupported_type too_large empty malformed unsafe rate_limited token_invalid token_expired file_changed already_used confirmation_unavailable disabled unavailable".split(
    " ",
  );

function codeByStatus(status: number): FinnImportClientCode {
  if (status === 401 || status === 403 || status === 404) return "forbidden";
  if (status === 413) return "too_large";
  if (status === 429) return "rate_limited";
  if (status === 400) return "invalid_request";
  if (status >= 500) return "unavailable";
  return "bad_response";
}

function failure(
  error: FinnImportClientCode,
  action: FinnImportAction,
  message?: unknown,
  retryAfter?: unknown,
): FinnImportClientFailure {
  const lost =
    action === "execute" &&
    (error === "network" || error === "timeout" || error === "aborted" || error === "unavailable");
  const wait = count(retryAfter);
  return {
    ok: false,
    error,
    message_ar: usableMessage(message)
      ? message
      : lost
        ? MAYBE_DONE
        : (FALLBACK_AR[error] ?? GENERIC),
    ...(wait > 0 ? { retry_after_s: Math.min(wait, 3600) } : {}),
  };
}

/** يعيد معاينةً منظَّفة محدودة أو `null` — لا نرسم ما لم يطابق الشكل، ولا ندّعي حجبًا لم يعلنه الخادم. */
function asPreview(r: Record<string, unknown>): FinnImportPreviewView | null {
  const { sheets, totals, pii, token, warnings } = r;
  if (typeof token !== "string" || !token || !Array.isArray(sheets)) return null;
  if (!isRecord(totals) || !isRecord(pii) || pii.masked !== true) return null;
  const L = FINN_IMPORT_LIMITS;
  return {
    ok: true,
    kind: "preview",
    token,
    totals: totals as unknown as FinnImportPreview["totals"],
    pii: pii as unknown as FinnImportPreview["pii"],
    sheets: sheets.slice(0, L.maxSheets).map((s: Record<string, unknown>) => ({
      name: displaySafe(s?.name, 60),
      rows: s?.rows as number,
      cols: s?.cols as number,
      headers: (Array.isArray(s?.headers) ? s.headers : [])
        .slice(0, L.previewHeaders)
        .map((h: unknown) => displaySafe(h, L.previewHeaderChars))
        .filter(Boolean),
    })),
    warnings: (Array.isArray(warnings) ? warnings : [])
      .filter(usableMessage)
      .slice(0, 8)
      .map((w) => displaySafe(w, 300)),
  };
}

function interpret(
  status: number,
  retryHeader: string | null,
  body: unknown,
  action: FinnImportAction,
): FinnImportOutcome {
  const rec = isRecord(body) ? body : null;
  if (status >= 200 && status < 300 && rec?.ok === true) {
    if (action === "preview" && rec.kind === "preview") {
      return asPreview(rec) ?? failure("bad_response", action);
    }
    if (action === "execute" && rec.kind === "done" && count(rec.documents) >= 1) {
      return {
        ok: true,
        kind: "done",
        documents: count(rec.documents),
        deduped: count(isRecord(rec.partial) ? rec.partial.deduped : 0),
      };
    }
    return failure("bad_response", action);
  }
  const named = rec?.error;
  const error =
    typeof named === "string" && SERVER_CODES.includes(named)
      ? (named as FinnImportClientCode)
      : codeByStatus(status);
  const wait = rec?.retry_after_s ?? (retryHeader ? Number(retryHeader) : undefined);
  return failure(error, action, rec?.message_ar, wait);
}

export interface FinnImportRequest {
  readonly file: File;
  readonly action: FinnImportAction;
  /** رمز المعاينة — عند `execute` فقط. */
  readonly token?: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

/**
 * يرسل الملف (multipart) إلى `POST /api/finn/import` ويعيد نتيجةً مصنّفة — **لا يرمي أبدًا**.
 * الحقول تُضاف قبل الملف ليقرأها محلّل البثّ أولًا؛ ولا يُضبط `Content-Type` يدويًّا (حدّه من المتصفح).
 */
export async function postFinnImport(req: FinnImportRequest): Promise<FinnImportOutcome> {
  // أُلغي قبل البدء ⇒ لا طلب ولا مؤقّت.
  if (req.signal?.aborted) return failure("aborted", req.action);
  const controller = new AbortController();
  const forward = () => controller.abort();
  req.signal?.addEventListener("abort", forward, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, req.timeoutMs ?? FINN_IMPORT_CLIENT_TIMEOUT_MS);
  const interrupted = () => failure(timedOut ? "timeout" : "aborted", req.action);
  try {
    const form = new FormData();
    form.append(FINN_IMPORT_FIELDS.action, req.action);
    if (req.action === "execute" && req.token) form.append(FINN_IMPORT_FIELDS.token, req.token);
    form.append(FINN_IMPORT_FIELDS.file, req.file);
    const res = await authenticatedFetch(FINN_IMPORT_ENDPOINT, {
      method: "POST",
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });
    const body: unknown = await res.json().catch(() => null);
    if (controller.signal.aborted) return interrupted();
    return interpret(res.status, res.headers.get("retry-after"), body, req.action);
  } catch {
    // أيّ استثناء (ومنه نصّ الجلسة الإنجليزي) لا يبلغ الشاشة: جملةٌ عربية محايدة.
    return controller.signal.aborted ? interrupted() : failure("network", req.action);
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener("abort", forward);
  }
}

/** إيقاف المالك للانتظار: عند `execute` يحمل التنبيهَ بأن الخادم قد يكون أتمّ الكتابة. */
export const interruptedFailure = (action: FinnImportAction): FinnImportClientFailure =>
  failure("aborted", action);

/**
 * كيف يتعافى المالك من الفشل: إعادة الطلب نفسه، أم معاينة جديدة، أم لا شيء سوى الإغلاق.
 * الخادم يستهلك الرمز قبل الكتابة، فبعد فشلٍ متأخر في `execute` (عطل · شبكة · مهلة · إيقاف انتظار) تعيد
 * الإعادةُ الرمزَ المحروق وتردّ 409 «نُفِّذ من قبل» كذبًا — فالتعافي معاينةٌ جديدة (التكرار يُزيله الإدخال).
 * `rate_limited` وحده يبقى إعادةً: الحدّ يُفحص قبل الاستهلاك.
 */
export function finnImportRecovery(
  code: FinnImportClientCode,
  step: FinnImportAction,
): "retry" | "refresh" | "none" {
  if (code === "token_invalid" || code === "token_expired" || code === "file_changed") {
    return "refresh";
  }
  if (code === "rate_limited") return "retry";
  const late = step === "execute";
  if (code === "aborted") return late ? "refresh" : "none";
  return code === "unavailable" || code === "network" || code === "timeout"
    ? late
      ? "refresh"
      : "retry"
    : "none";
}

/* ───────────────────────────── العرض (نقيّ) ───────────────────────────── */

/** نصٌّ مأخوذ من ملف ⇒ سطرٌ واحد بلا تحكّم ولا قلب اتجاه، مقتطع بـ«…». */
export function displaySafe(text: unknown, max: number): string {
  // Cf = محارف التنسيق (قلب الاتجاه U+202E · العرض الصفري · BOM)، وCc = التحكّم: تُنزع الأولى وتصير الثانية مسافة.
  const one =
    typeof text === "string"
      ? text
          .replace(/\p{Cf}/gu, "")
          .replace(/[\p{Cc}\s]+/gu, " ")
          .trim()
      : "";
  const chars = Array.from(one);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : one;
}

export const formatCount = (n: number): string => (Number(n) || 0).toLocaleString("ar-SA");

type Forms = readonly [one: string, two: string, few: string, many: string];
/** عدّ عربي: ١ مفرد · ٢ مثنّى · ٣–١٠ جمع · غيرها تمييز مفرد. */
export function arCount(n: number, forms: Forms): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  const tail = n % 100;
  return `${formatCount(n)} ${tail >= 3 && tail <= 10 ? forms[2] : forms[3]}`;
}

const ROWS: Forms = ["صفّ واحد", "صفّين", "صفوف", "صفًّا"];
const DOCS: Forms = ["وثيقة واحدة", "وثيقتين", "وثائق", "وثيقة"];
const SECS: Forms = ["ثانية واحدة", "ثانيتين", "ثوانٍ", "ثانية"];
const MINS: Forms = ["دقيقة واحدة", "دقيقتين", "دقائق", "دقيقة"];

/**
 * «سيُحمَّل N من M صفًّا في K وثيقة». الاقتطاع يعلنه تحذير الخادم وحده (جملةٌ واحدة تكفي)؛ والإجمالي «نحو»
 * ما لم يؤكّد الخادم دقّته (المادة ٢٧) — وغياب العلامة مجهول لا دقيق.
 */
export function describeTotals(totals: FinnImportPreview["totals"]): string {
  const about = totals.rows_total_exact === true ? "" : "نحو ";
  return `سيُحمَّل ${formatCount(totals.rows_loaded)} من ${about}${arCount(totals.rows_total, ROWS)} في ${arCount(totals.parts, DOCS)}`;
}

export function describeSheet(sheet: { rows: number; cols: number }): string {
  return `الصفوف ${formatCount(sheet.rows)}، الأعمدة ${formatCount(sheet.cols)}`;
}

/** سطر الأنماط الشخصية: ما حُجب بالصيغ المعروفة وحدها — لا ادّعاء شمول، و«لم يُرصد» ليس برهان غياب (المادة ٢٧). */
export function describePii(pii: FinnImportPreview["pii"]): string {
  const found = [
    pii.id_numbers > 0 ? `هوية أو إقامة ${formatCount(pii.id_numbers)}` : "",
    pii.phones > 0 ? `جوال ${formatCount(pii.phones)}` : "",
    pii.emails > 0 ? `بريد ${formatCount(pii.emails)}` : "",
  ].filter(Boolean);
  return found.length > 0
    ? `حُجب في النص (بالصيغ المعروفة): ${found.join("، ")}.`
    : "لم يُرصد في النص رقم هوية أو جوال أو بريد بالصيغ المعروفة.";
}

/**
 * «تم تحميل N وثيقة — قيد الفهرسة (قد تستغرق دقائق)» — لا تدّعي جاهزيةً ولا فهرسةً منتهية. وما كان موجودًا
 * سابقًا فلم يُكرَّر يُذكر عددُه حتى لا يظنّ المالك أن معاينته (٣ وثائق) تخلّفت.
 */
export function describeDone(documents: number, deduped = 0): string {
  return `تم تحميل ${arCount(documents, DOCS)} — قيد الفهرسة (قد تستغرق دقائق)${
    deduped > 0 ? `. الموجود سابقًا ولم يُكرَّر: ${formatCount(deduped)}` : ""
  }`;
}

export function describeRetryAfter(seconds: number): string {
  return `حاول بعد ${seconds < 60 ? arCount(seconds, SECS) : arCount(Math.ceil(seconds / 60), MINS)}.`;
}
