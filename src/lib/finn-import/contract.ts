/**
 * عقد «إرفاق ملف وتحميله إلى مكتبة المعرفة» في فِن (أمر المالك ٢٠٢٦/١٠/٣١).
 *
 * ملفٌّ **آمن للعميل**: لا استيراد منه إطلاقًا — يقرؤه الخادم والواجهة معًا، فهو المصدر الوحيد
 * للحدود والأنواع. أيّ حدٍّ يُضاف هنا لا في الطرفين.
 *
 * التصميم (قرار مكتوب، لا يُنقض إلا بقرار المالك):
 *  - **النموذج لا يرى الملف.** لا بايتات ولا خلايا ولا أسماء أعمدة تدخل نصّ المحادثة ولا
 *    سياق النموذج (حقنُ تعليمات + بيانات شخصية). جسم `/api/finn/chat` يبقى `{messages}` وحده.
 *  - **التنفيذ خطوتان بنقرتين من المالك:** معاينة (لا تكتب شيئًا) ← تأكيد صريح (يكتب). الخادم
 *    لا يخزّن الملف بين الخطوتين؛ يُعاد رفعه عند التأكيد ويُطابَق بصمته على رمزٍ موقَّع.
 *  - **الوجهة الوحيدة اليوم: مكتبة المعرفة** (`finn_documents`) بصلاحيات المالك نفسها (RLS).
 *    جداول التشغيل (مثل `maint_orders`) ليست وجهة: لا تُكتب إلا بإذن مستقل.
 */

/** الامتدادات المقبولة. `.xls` و`.xlsm` و`.xlsb` مرفوضة عمدًا (سطح تحليل ثنائي أوسع). */
export const FINN_IMPORT_EXTENSIONS = ["xlsx", "csv", "tsv", "txt", "md", "json"] as const;
export type FinnImportFileKind = (typeof FINN_IMPORT_EXTENSIONS)[number];

/** قيمة خاصية `accept` لحقل الملف. */
export const FINN_IMPORT_ACCEPT = FINN_IMPORT_EXTENSIONS.map((e) => `.${e}`).join(",");

export const FINN_IMPORT_LIMITS = {
  /**
   * 4 MiB: حدّ حمولة الدوال على Vercel ≈ 4.5 MB للطلب كلّه (يشمل رأس multipart)، فهذا أعلى رقمٍ
   * آمن. ويُعاد الرفع عند التأكيد، فكلّ خطوة طلبٌ مستقل.
   */
  maxFileBytes: 4 * 1024 * 1024,
  /** أوراق الجدول المقروءة؛ ما بعدها يُتجاهل مع تحذير. */
  maxSheets: 10,
  /** الصفوف المقروءة من كل ورقة (بعد الترويسة)؛ ما بعدها يُقتطع مع تحذير صريح. */
  maxRowsPerSheet: 20_000,
  /** الأعمدة المقروءة؛ ما بعدها يُقتطع. */
  maxCols: 100,
  /** حرفًا في الخلية الواحدة؛ ما بعده يُقتطع. */
  maxCellChars: 2_000,
  /** حرفًا للوثيقة الواحدة = `KNOWLEDGE_MAX_TEXT_CHARS` (يتحقق اختبارٌ من التساوي). */
  maxCharsPerDocument: 250_000,
  /** عدد الوثائق (الأجزاء) الأقصى للملف الواحد: ثلاثة × 250 ألف حرف ≈ 540 مقطعًا للتضمين. */
  maxParts: 3,
  /** ترويسات الأعمدة المعروضة في المعاينة لكل ورقة. */
  previewHeaders: 12,
  /** أحرف الترويسة المعروضة. */
  previewHeaderChars: 40,
  /** عمر رمز التأكيد. */
  tokenTtlMs: 10 * 60 * 1000,
  /** معاينات في الدقيقة (تحليل بلا كتابة). */
  previewPerMinute: 10,
  /** تنفيذات في ١٠ دقائق (كلٌّ منها يستدعي التضمين وقد يكلّف). */
  executePerTenMinutes: 3,
} as const;

export type FinnImportErrorCode =
  | "invalid_request" //     طلب مشوّه (ليس multipart / حقول ناقصة)
  | "unsupported_type" //    امتداد غير مقبول أو لا يطابق المحتوى
  | "too_large" //           فوق `maxFileBytes`
  | "empty" //               لا محتوى قابل للتحميل
  | "malformed" //           ملف تالف / لا يُقرأ
  | "unsafe" //              رُفض أمنيًّا (ماكرو، ارتباط خارجي، قنبلة ضغط، توقيع تنفيذي…)
  | "rate_limited" //        تجاوز المعدّل
  | "token_invalid" //       رمز التأكيد مفقود/مزوَّر/لغير هذا المستخدم
  | "token_expired" //       انتهت مهلته
  | "file_changed" //        بصمة الملف المُعاد رفعه ≠ بصمة المعاينة
  | "already_used" //        الرمز نُفِّذ من قبل (منع التكرار)
  | "confirmation_unavailable" // `FINN_IMPORT_SIGNING_SECRET` غير مضبوط/قصير ⇒ الميزة مغلقة (معاينةً وتنفيذًا)
  | "disabled" //            مفتاح إيقاف الذكاء/الاستيراد
  | "unavailable"; //        عطل في المخزن أو التضمين — قبل الاستهلاك لم يُكتب شيء، وبعده قد يكون بعضٌ حُمِّل (`partial`)

export interface FinnImportSheetSummary {
  name: string;
  /** صفوف البيانات المقروءة بعد الترويسة. */
  rows: number;
  cols: number;
  /** حتى `previewHeaders` ترويسة، مقتطعة؛ تُعرض للمالك في الواجهة فقط ولا تدخل سياق النموذج. */
  headers: string[];
}

export interface FinnImportPreview {
  ok: true;
  kind: "preview";
  file: { name: string; kind: FinnImportFileKind; bytes: number };
  sheets: FinnImportSheetSummary[];
  totals: {
    /** كل صفوف البيانات في الملف (قبل أي اقتطاع). */
    rows_total: number;
    /** `false` ⇒ `rows_total` تقدير (ورقةٌ تجاوزت حدّ القراءة) فيُعرض «نحو». غيابه = مجهول لا دقيق. */
    rows_total_exact: boolean;
    /** ما سيُحمَّل فعلًا بعد الحدود. */
    rows_loaded: number;
    /** عدد الوثائق التي ستُنشأ. */
    parts: number;
    truncated: boolean;
  };
  /** عدّاد أنماط شخصية رُصدت في النصّ — تُحجب قبل الحفظ دائمًا (`masked: true`). */
  pii: { id_numbers: number; phones: number; emails: number; masked: true };
  /** تحذيرات عربية صريحة (اقتطاع، ورقات متجاهلة، ترميز بديل…). */
  warnings: string[];
  /** رمز موقَّع يربط المستخدم + بصمة الملف + الوجهة؛ يُمرَّر كما هو عند التأكيد. */
  token: string;
  expires_at: string;
}

/** عدّادات الإدخال الفعلية: تُرفق بالنجاح وبالفشل بعد الاستهلاك. */
export interface FinnImportPartial {
  total: number;
  queued: number;
  deduped: number;
  failed: number;
}

export interface FinnImportDone {
  ok: true;
  kind: "done";
  documents: number;
  /** الفهرسة (التقطيع والتضمين) غير متزامنة: «قيد الفهرسة» لا «جاهزة». */
  status: "queued";
  message_ar: string;
  partial: FinnImportPartial;
}

export interface FinnImportFailure {
  ok: false;
  error: FinnImportErrorCode;
  /** نصّ عربي آمن للعرض؛ لا يحوي أبدًا نصًّا من الملف. */
  message_ar: string;
  retry_after_s?: number;
  /** حاضرٌ حين فشل الإدخال بعد استهلاك الرمز: قد يكون بعضٌ حُمِّل. */
  partial?: FinnImportPartial;
}

export type FinnImportResponse = FinnImportPreview | FinnImportDone | FinnImportFailure;

/** حقول الطلب (multipart/form-data) إلى `POST /api/finn/import`. */
export const FINN_IMPORT_FIELDS = {
  file: "file",
  action: "action", // "preview" | "execute"
  token: "token", // عند execute فقط
} as const;
export type FinnImportAction = "preview" | "execute";

export const FINN_IMPORT_ENDPOINT = "/api/finn/import";
