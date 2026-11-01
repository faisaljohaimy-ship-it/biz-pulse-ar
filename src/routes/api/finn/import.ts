/**
 * POST /api/finn/import — إرفاق ملف وتحميله إلى مكتبة المعرفة (أمر المالك ٢٠٢٦/١٠/٣١).
 *
 * **للمالك وحده، والفرض هنا في الخادم.** العقد والحدود: `src/lib/finn-import/contract.ts`.
 *
 * ## قرارات التصميم (لا تُنقض إلا بقرار المالك)
 *
 *  - **النموذج لا يرى الملف.** هذا المسار لا يستورد المحرّك ولا الموجِّه ولا أدوات النموذج ولا
 *    بروتوكول البثّ، ولا يكتب في المحادثة. جسم `/api/finn/chat` يبقى `{messages}` وحدها.
 *  - **خطوتان بنقرتين:** `preview` يحلّل في الذاكرة **ولا يكتب شيئًا** ويصدر رمزًا موقَّعًا
 *    (المستخدم + بصمة الملف + المدّة)؛ `execute` يعيد استقبال الملف نفسه (لا شيء يُخزَّن بين
 *    الخطوتين)، يتحقّق من الرمز ثم **يستهلكه مرّةً واحدة**، ثم يكتب.
 *  - **الوجهة مكتبة المعرفة وحدها** (`finn_documents` بهوية المالك نفسه، RLS)، ثم خطّاف الفهرسة
 *    غير المتزامن. جداول التشغيل ليست وجهة.
 *  - **الخصوصية:** أرقام الهوية/الجوال/البريد تُعدّ في المعاينة وتُحجب دائمًا في النصّ المخزَّن.
 *    لا خلية ولا ترويسة ولا اسم ملف ولا نصّ استثناء يدخل سجلًّا أو رسالة خطأ؛ السطر الوحيد في
 *    السجلّ `[finn-import]` بأعدادٍ فقط. وأخطاء العميل جُملٌ عربية ثابتة.
 *
 * ## الترتيب (ومَن يسبق مَن)
 *
 * 1. **بوّابة المالك أوّلًا** — غير المالك (أو أي طريقةٍ غير POST) يتلقّى **الـ404 نفسه** بأرضية
 *    الزمن نفسها، ولو كان مفتاح الإيقاف مرفوعًا: لا يُكشف وجود المسار.
 * 2. **مفتاح الإيقاف** (متزامن، بلا شبكة) ⇒ يُردّ كما هو، قبل قراءة الجسم.
 * 3. شكل الطلب وحجمه (رخيص): multipart ⇒ 415 · `Content-Length` ⇒ 413 · غيابه أو فساده (طلبٌ مجزّأ) ⇒ تُقرأ
 *    البايتات بتدفّقٍ محدود بالسقف نفسه قبل أي تحليل ⇒ 413 · حقل ملفّ واحد وفعلٌ صالح ⇒ 400 · الحجم الفعلي ⇒ 413 —
 *    قبل أن يُنفَق حدٌّ.
 * 4. **حدّ المعدّل** `finn-import:<action>:<هوية>` يفشل **مغلقًا** (503/429 مع `Retry-After`).
 * 5. التحليل: `readImportFile` ⇒ `buildDocuments`.
 *    - `preview`: يصدر الرمز ويردّ المعاينة.
 *    - `execute`: التأكيد مهيّأ؟ ⇒ الرمز (مستخدم · بصمة · مدّة) ⇒ مطابقة ما أُعيد حسابه لما عاينه
 *      المالك ⇒ تهيئة الإدخال ⇒ **السقف اليومي** (نداءٌ صريح واحد، يفشل مغلقًا) ⇒ **استهلاك الرمز** ⇒
 *      الإدخال. كل فحصٍ يمكن أن يفشل بلا كتابة يسبق الاستهلاك، فلا يُحرق رمزٌ بسبب خلل ضبط.
 *      وما بعد الاستهلاك لا تُعاد فيه الطلبات بالرمز نفسه (409 كاذب): العميل يعيد **المعاينة** (`finnImportRecovery`).
 *
 * ## مصفوفة الاستجابة
 *
 * | الحالة                                  | HTTP | الجسم                                            |
 * |-----------------------------------------|------|--------------------------------------------------|
 * | غير مالك / غير POST / أي فشل بوّابة      | 404  | `{error:"not_found"}` متطابق بايتًا بمسار الدردشة |
 * | مفتاح الإيقاف                           | 503  | `{error:"ai_disabled",message_ar}` + Retry-After |
 * | ليس multipart                           | 415  | `unsupported_type`                               |
 * | Content-Length أو الحجم الفعلي > الحدّ   | 413  | `too_large`                                      |
 * | جسم مشوّه / ملف ≠ 1 / فعل غير صالح       | 400  | `invalid_request`                                |
 * | تجاوز المعدّل                           | 429  | `rate_limited` + Retry-After                     |
 * | المخزن/المحدِّد غير متاح                  | 503  | `unavailable` + Retry-After                      |
 * | امتداد/محتوى غير مقبول                   | 415  | `unsupported_type`                               |
 * | فارغ / تالف / غير آمن                    | 422  | `empty` · `malformed` · `unsafe`                 |
 * | معاينة ناجحة                            | 200  | `FinnImportPreview` (`token:""` إن لم يُهيَّأ التأكيد) |
 * | رمز ناقص/مزوَّر/لغير المستخدم/منتهٍ      | 400  | `token_invalid` · `token_expired`                |
 * | ملف ≠ الذي عُوين                        | 422  | `file_changed`                                   |
 * | التأكيد غير مهيّأ أو الإدخال غير مهيّأ    | 503  | `confirmation_unavailable` · `unavailable`       |
 * | تجاوز السقف اليومي                      | 429  | `rate_limited` (بلا `Retry-After`: يعود بعد منتصف الليل) |
 * | الرمز مستهلك / المحتوى كلّه موجود سابقًا  | 409  | `already_used`                                   |
 * | تنفيذ ناجح                              | 200  | `FinnImportDone` (`status:"queued"` دائمًا)       |
 * | تنفيذ جزئي (بعضه أُدرج وبعضه فشل)        | 502  | `unavailable` + `partial:{…}` وبيان ما تمّ         |
 * | لم يُؤكَّد حفظ شيء (قبل الاستهلاك)       | 503  | `unavailable`                                    |
 * | فشل الإدخال كلّه بعد الاستهلاك           | 503  | `unavailable` + `partial` — «قد يكون بعضٌ حُمِّل»  |
 */
import { createFileRoute } from "@tanstack/react-router";
import { aiDisabledResponse, enforceAiQuota } from "@/lib/governance/ai-quota.server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
import { finnNotFoundResponse, resolveFinnOwner } from "@/lib/finn-agent/owner-gate.server";
import {
  FINN_IMPORT_FIELDS,
  FINN_IMPORT_LIMITS,
  type FinnImportAction,
  type FinnImportDone,
  type FinnImportErrorCode,
  type FinnImportFailure,
  type FinnImportPartial,
  type FinnImportPreview,
} from "@/lib/finn-import/contract";
import { ingestKnowledgeParts, prepareIngest } from "@/lib/finn-import/ingest.server";
import {
  claimImportToken,
  fileSha256Hex,
  importConfirmationAvailable,
  signImportToken,
  verifyImportToken,
} from "@/lib/finn-import/import-token.server";
import {
  FINN_IMPORT_LATE_FAILURE_AR,
  finnImportMessageAr,
} from "@/lib/finn-import/messages.server";
import { cleanCell, readImportFile } from "@/lib/finn-import/safe-spreadsheet.server";
import { buildDocuments, maskPii, summarizeSheets } from "@/lib/finn-import/to-text.server";

const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
};

/** رأس multipart (الحدود والحقول) فوق حدّ الملف نفسه. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/** حالة HTTP لكل رمز خطأ. لا 401/403 إطلاقًا: لا تُفسَّر هنا كمصادقة. */
const STATUS_BY_CODE: Readonly<Record<FinnImportErrorCode, number>> = {
  invalid_request: 400,
  unsupported_type: 415,
  too_large: 413,
  empty: 422,
  malformed: 422,
  unsafe: 422,
  rate_limited: 429,
  token_invalid: 400,
  token_expired: 400,
  file_changed: 422,
  already_used: 409,
  confirmation_unavailable: 503,
  disabled: 503,
  unavailable: 503,
};

const LIMITER_UNAVAILABLE_AR = "تعذّر التحقّق من حدّ الطلبات الآن. أعد المحاولة بعد قليل.";
const ALREADY_LOADED_AR = "هذا المحتوى محمَّل في مكتبة المعرفة سابقًا؛ لم يُكرَّر شيء.";

/** هوية السقف اليومي للاستيراد: دلوٌ مستقلّ عن هوية الدردشة (`finn-chat:`) فلا تستهلك التحميلاتُ حصّتها. */
const QUOTA_IDENTITY_PREFIX = "finn-import";
// محايدة عمدًا: يبلغها سقفُ الاستيراد الخاص أو السقف العام المشترك مع محادثة فِن، فلا تُنسب إلى «حصّتك» وحدها.
const DAILY_CAP_AR =
  "بلغ الحدّ اليومي لاستخدام فِن (يشمل المحادثة وتحميل الملفات). يعود الحدّ بعد منتصف الليل.";

const RETRY_LIMITER_S = 60;
const RETRY_INGEST_S = 30;

interface Audit {
  action: FinnImportAction | "invalid";
  bytes: number;
  rows: number;
}

function respond(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

/**
 * فشلٌ بالعقد: رمز + عربية ثابتة (لا نصّ ملف ولا استثناء). `message` يُمرَّر فقط حين يأتي من مصدرٍ
 * ثابت (مثل رسالة Excel القديم من القارئ)؛ وإلا تؤخذ رسالة الرمز.
 */
function failure(
  code: FinnImportErrorCode,
  options: {
    message?: string;
    retryAfter?: number;
    status?: number;
    extra?: Record<string, unknown>;
  } = {},
): Response {
  const body: FinnImportFailure & Record<string, unknown> = {
    ok: false,
    error: code,
    message_ar: options.message ?? finnImportMessageAr(code),
    ...(options.retryAfter ? { retry_after_s: options.retryAfter } : {}),
    ...options.extra,
  };
  return respond(
    options.status ?? STATUS_BY_CODE[code],
    body,
    options.retryAfter ? { "Retry-After": String(options.retryAfter) } : {},
  );
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("ar-SA").format(n);
}

interface ParsedForm {
  file: File;
  action: FinnImportAction;
  token: string;
}

/** حقل ملفّ واحد بالضبط، وفعلٌ واحد صالح، ورمزٌ نصّيّ (إن وُجد). غير ذلك ⇒ `null`. */
function parseForm(form: FormData): ParsedForm | null {
  const files = form.getAll(FINN_IMPORT_FIELDS.file);
  if (files.length !== 1 || typeof files[0] === "string") return null;
  const actions = form.getAll(FINN_IMPORT_FIELDS.action);
  if (actions.length !== 1) return null;
  const action = actions[0];
  if (action !== "preview" && action !== "execute") return null;
  const tokens = form.getAll(FINN_IMPORT_FIELDS.token);
  if (tokens.length > 1 || (tokens.length === 1 && typeof tokens[0] !== "string")) return null;
  return { file: files[0], action, token: (tokens[0] as string | undefined) ?? "" };
}

/** اسم الملف كما يُعاد للمالك: الاسم الأخير فقط، منظَّف، مقتطع، محجوب الأنماط الشخصية. */
function displayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return maskPii(cleanCell(base, 120).text).text || "ملف";
}

/**
 * يقرأ جسم الطلب بتدفّقٍ محدود بسقف: `null` ⇒ تجاوزه (يُقطع القارئ ولا يُحلَّل شيء). لا يثق بترويسةٍ ولا
 * يُبقي في الذاكرة أكثر من السقف.
 */
async function readBodyCapped(request: Request, cap: number): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

async function handleImport(request: Request, userId: string, audit: Audit): Promise<Response> {
  // ③ شكل الطلب وحجمه — رخيص، قبل أن يُنفَق حدّ.
  const rawType = request.headers.get("content-type") || "";
  const contentType = rawType.toLowerCase();
  if (!contentType.includes("multipart/form-data")) return failure("unsupported_type");
  const lengthHeader = (request.headers.get("content-length") ?? "").trim();
  const declared = /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : Number.NaN;
  if (declared > FINN_IMPORT_LIMITS.maxFileBytes + MULTIPART_OVERHEAD_BYTES) {
    return failure("too_large");
  }

  // الجسم يُحلَّل في الذاكرة (حمولة الدوال محدودة بالمنصّة ≈ 4.5 MB)؛ فشله ⇒ طلبٌ مشوّه.
  let parsed: ParsedForm | null;
  try {
    let form: FormData;
    if (Number.isNaN(declared)) {
      // لا `Content-Length` صالح (طلبٌ مجزّأ): الترويسة لا تحمي، فيُقرأ التدفّق بسقفه قبل أي تحليل،
      // ثم تُحلَّل البايتات المقروءة وحدها (الحدّ بالبايتات الفعلية لا بما يدّعيه المرسل).
      const bytes = await readBodyCapped(
        request,
        FINN_IMPORT_LIMITS.maxFileBytes + MULTIPART_OVERHEAD_BYTES,
      );
      if (!bytes) return failure("too_large");
      form = await new Response(bytes as BodyInit, {
        headers: { "content-type": rawType },
      }).formData();
    } else {
      form = await request.formData();
    }
    parsed = parseForm(form);
  } catch {
    return failure("invalid_request");
  }
  if (!parsed) return failure("invalid_request");
  const { file, action, token } = parsed;
  audit.action = action;
  audit.bytes = file.size;
  if (file.size > FINN_IMPORT_LIMITS.maxFileBytes) return failure("too_large");

  // ④ حدّ المعدّل — يفشل مغلقًا؛ المعاينة غير التنفيذ (الثاني يستدعي التضمين وقد يكلّف).
  const limit =
    action === "preview"
      ? { max: FINN_IMPORT_LIMITS.previewPerMinute, window: 60 }
      : { max: FINN_IMPORT_LIMITS.executePerTenMinutes, window: 600 };
  let rate: { allowed: boolean; unavailable?: boolean };
  try {
    rate = await enforceRateLimit(`finn-import:${action}:${userId}`, limit.max, limit.window);
  } catch {
    rate = { allowed: false, unavailable: true };
  }
  if (rate.unavailable) {
    return failure("unavailable", { message: LIMITER_UNAVAILABLE_AR, retryAfter: RETRY_LIMITER_S });
  }
  if (!rate.allowed) return failure("rate_limited", { retryAfter: limit.window });

  // ⑤ التحليل في الذاكرة. لا شيء يُخزَّن.
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return failure("invalid_request");
  }
  const sha = fileSha256Hex(bytes);

  // التنفيذ: التأكيد مهيّأ والرمز سليم قبل أي تحليل مكلف.
  // لا سرّ توقيع ⇒ الميزة كلّها مغلقة بصدق (معاينةً وتنفيذًا) قبل أي تحليل: معاينةٌ لا يمكن تأكيدها
  // تُوهم المالك بأنّ التحميل ممكن.
  if (!importConfirmationAvailable()) return failure("confirmation_unavailable");
  let verified: { nonce: string; parts: number; rows: number } | null = null;
  if (action === "execute") {
    if (!token) return failure("token_invalid");
    const check = await verifyImportToken(token, { userId, fileSha256: sha });
    if (!check.ok) return failure(check.error);
    verified = check;
  }

  const read = await readImportFile({ name: file.name, bytes });
  if (!read.ok) return failure(read.error, { message: read.message_ar });
  const built = buildDocuments(read.sheets, { fileName: file.name });
  audit.rows = built.rows_loaded;
  if (built.parts.length === 0) return failure("empty");

  if (action === "preview") {
    const signed = await signImportToken({
      userId,
      fileSha256: sha,
      parts: built.parts.length,
      rows: built.rows_loaded,
    });
    // الاحتياط: سرٌّ سقط بين الفحص والتوقيع ⇒ نفس الإغلاق الصادق، لا معاينة بلا رمز.
    if (!signed.ok) return failure("confirmation_unavailable");
    const warnings = [...read.warnings, ...built.warnings];
    const preview: FinnImportPreview = {
      ok: true,
      kind: "preview",
      file: { name: displayName(file.name), kind: read.kind, bytes: file.size },
      sheets: summarizeSheets(read.sheets),
      totals: {
        rows_total: built.rows_total,
        rows_total_exact: read.sheets.every((sheet) => sheet.rowsTotalExact),
        rows_loaded: built.rows_loaded,
        parts: built.parts.length,
        truncated: built.truncated,
      },
      pii: { ...built.pii, masked: true },
      warnings,
      token: signed.token,
      expires_at: signed.expiresAt,
    };
    return respond(200, preview);
  }

  // ── execute ──
  // ما أعيد حسابه يجب أن يطابق ما عاينه المالك (يلتقط نشرًا غيّر المحلّل بين الخطوتين).
  if (!verified || verified.parts !== built.parts.length || verified.rows !== built.rows_loaded) {
    return failure("file_changed");
  }
  // خلل الضبط قبل الاستهلاك: لا يُحرق رمزٌ ولا يُترك صفٌّ معلّق.
  const runtime = prepareIngest(request);
  if (!runtime.ok) return failure("unavailable", { retryAfter: RETRY_INGEST_S });
  // السقف اليومي للإنفاق (التضمين): نداءٌ صريح واحد للتنفيذ وحده، قبل الاستهلاك، يفشل مغلقًا؛ فمنعُه لا
  // يحرق رمزًا ولا يكتب شيئًا. الدردشة لا تتأثّر: الهوية دلوٌ مستقلّ (القيمة والسقف العام من `ai-quota`).
  const quota = await enforceAiQuota({
    surface: "finn",
    identity: `${QUOTA_IDENTITY_PREFIX}:${userId}`,
    deadlineMs: 2_000,
  });
  if (quota) {
    return quota.status === 429
      ? failure("rate_limited", { message: DAILY_CAP_AR })
      : failure("unavailable", { message: LIMITER_UNAVAILABLE_AR, retryAfter: RETRY_LIMITER_S });
  }
  const claim = await claimImportToken({ nonce: verified.nonce, userId });
  if (!claim.ok) return failure(claim.error);

  const outcome = await ingestKnowledgeParts(
    built.parts.map((p) => ({ title: p.title, text: p.text })),
    { supabase: runtime.supabase, userId, origin: runtime.origin, hookSecret: runtime.hookSecret },
  );

  const partial: FinnImportPartial = {
    total: outcome.total,
    queued: outcome.queued,
    deduped: outcome.deduped,
    failed: outcome.failed,
  };
  if (outcome.failed > 0 && (outcome.queued > 0 || outcome.deduped > 0)) {
    // الصدق: بعضٌ تمّ وبعضٌ لم يتمّ. الرمز استُهلك، والمكرَّر لا يتكرّر عند إعادة المحاولة.
    const message =
      `اكتمل جزء من التحميل: بدأت فهرسة ${formatCount(outcome.queued)} وثيقة` +
      (outcome.deduped > 0 ? ` وكانت ${formatCount(outcome.deduped)} موجودة سابقًا` : "") +
      ` وتعذّر ${formatCount(outcome.failed)}. راجع مكتبة المعرفة ثم أعد المعاينة والتأكيد؛ ما حُمِّل لن يتكرر.`;
    return failure("unavailable", { message, status: 502, extra: { partial } });
  }
  if (outcome.failed > 0) {
    // الرمز استُهلك: الإعادة بالرمز نفسه تردّ 409 كاذبًا، والمعاينة الجديدة هي التعافي (والمكرَّر لا يتكرر).
    return failure("unavailable", {
      message: FINN_IMPORT_LATE_FAILURE_AR,
      retryAfter: RETRY_INGEST_S,
      extra: { partial },
    });
  }
  if (outcome.queued === 0) {
    // كل الأجزاء موجودة أصلًا: لا شيء جديد، وليس هذا «تحميلًا».
    return failure("already_used", { message: ALREADY_LOADED_AR, extra: { partial } });
  }
  const done: FinnImportDone = {
    ok: true,
    kind: "done",
    documents: outcome.queued,
    status: "queued",
    message_ar:
      `بدأت فهرسة ${formatCount(outcome.queued)} وثيقة في مكتبة المعرفة؛ تصبح قابلة للاستشهاد بعد اكتمالها.` +
      (outcome.deduped > 0 ? ` وتُجوهلت ${formatCount(outcome.deduped)} موجودة سابقًا.` : ""),
    partial,
  };
  return respond(200, done);
}

/** معالجٌ واحد بسطر تدقيقٍ واحد بالأعداد وحدها — لا نصّ ملف ولا استثناء يبلغ السجلّ. */
async function handlePost(request: Request, userId: string): Promise<Response> {
  const startedAt = Date.now();
  const audit: Audit = { action: "invalid", bytes: 0, rows: 0 };
  let response: Response;
  try {
    response = await handleImport(request, userId, audit);
  } catch {
    // استثناءٌ غير متوقَّع: رمزٌ عامّ بلا نصّ (قد يحوي النصّ أجزاءً من الملف). وفي التنفيذ قد يكون الرمز
    // استُهلك وبعضُ الكتابة تمّ، فلا يُقال «لم يُؤكَّد حفظ أي شيء».
    response = failure("unavailable", {
      retryAfter: RETRY_INGEST_S,
      ...(audit.action === "execute" ? { message: FINN_IMPORT_LATE_FAILURE_AR } : {}),
    });
  }
  console.info("[finn-import]", {
    action: audit.action,
    ok: response.ok,
    ms: Date.now() - startedAt,
    bytes: audit.bytes,
    rows: audit.rows,
  });
  return response;
}

export const Route = createFileRoute("/api/finn/import")({
  server: {
    handlers: {
      // كل طريقةٍ غير POST ⇒ الـ404 نفسه (انظر chat.ts: بدون ANY تردّ TanStack بصفحة SPA).
      ANY: async () => finnNotFoundResponse(),
      POST: async ({ request }: { request: Request }) => {
        // ① المالك وحده — قبل أي شيء. غير المالك: 404 متطابق، ولو كان الإيقاف مرفوعًا.
        const owner = await resolveFinnOwner(request);
        if (!owner.ok) return finnNotFoundResponse();
        // ② مفتاح الإيقاف الفوري — متزامن، قبل قراءة الجسم والحدّ.
        const off = aiDisabledResponse("finn");
        if (off) return off;
        return handlePost(request, owner.userId);
      },
    },
  },
});
