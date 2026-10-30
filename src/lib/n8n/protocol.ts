/**
 * عقد الاتصال بـn8n — الثوابت والأنواع المشتركة (لا منطق، لا بيئة، لا شبكة).
 *
 * ## لماذا ملف ثوابت وحده
 *
 * عقد الويبهوك مكتوبٌ مرّةً واحدة ويقرؤه التوقيع والعميل والمخطط والاختبارات. لو
 * تكرّر الرقم (مهلة · سقف جسم · نافذة الانحراف) في ملفين لانحرف أحدهما بصمت. وهذا
 * الملف نقيٌّ كي يستورده أي اختبار بلا تحميل وحدة خادم.
 *
 * ## جدول المسارات مغلق
 *
 * ثلاثة مسارات لا غير، وكل مسارٍ يخصّ سطحًا واحدًا (سَدِيد أو FNN). المسار **لا يُؤخذ
 * من مدخل** أبدًا: المستدعي يمرّر اسم عملية (`research` · `run`) وسطحًا، والعميل يختار
 * المسار من هذا الجدول. فلا مدخل يبلغ عنوانًا خارج الجدول (لا سطح SSRF).
 */

export const N8N_SURFACES = ["sadeed", "fnn"] as const;
export type N8nSurface = (typeof N8N_SURFACES)[number];

export const N8N_PATHS = ["sadeed-research-v1", "fnn-research-v1", "fnn-runner-v1"] as const;
export type N8nPath = (typeof N8N_PATHS)[number];

/** سطح كل مسار — يحدّد السرّ المستعمل (فصل النطاق): مسار FNN لا يُوقَّع بسرّ سَدِيد أبدًا. */
export const PATH_SURFACE: Readonly<Record<N8nPath, N8nSurface>> = {
  "sadeed-research-v1": "sadeed",
  "fnn-research-v1": "fnn",
  "fnn-runner-v1": "fnn",
};

/**
 * أسباب الإخفاق — قائمة مغلقة من ثوابت ASCII. **لا نصّ بعيدًا فيها أبدًا**: السبب لا
 * يحمل رسالة خطأ ولا جسم ردٍّ ولا اسم مضيف ولا سرًّا (حارس no-secret-in-reason).
 */
export const N8N_REASONS = [
  "not_configured",
  "disabled",
  "breaker_open",
  "timeout",
  "network",
  "bad_signature",
  "bad_envelope",
  "n8n_error",
  "auth_failed",
  "budget_exhausted",
  "oversized",
] as const;
export type N8nReason = (typeof N8N_REASONS)[number];

/** رؤوس الطلب والردّ كما في العقد حرفيًّا. */
export const HEADER = {
  keyId: "X-Nx-Key-Id",
  ts: "X-Nx-Ts",
  nonce: "X-Nx-Nonce",
  deadlineMs: "X-Nx-Deadline-Ms",
  sig: "X-Nx-Sig",
  respTs: "X-Nx-Resp-Ts",
  respSig: "X-Nx-Resp-Sig",
  idempotencyKey: "Idempotency-Key",
} as const;

export const KEY_ID = "v1";
/** بادئة قيمة التوقيع: `v1=` + سداسيّ HMAC-SHA256. */
export const SIG_PREFIX = "v1=";
/** فاصل النطاق في نصّ التوقيع — يفصل توقيع الطلب عن توقيع الردّ حتى لو تطابقت الحقول. */
export const REQUEST_SIG_DOMAIN = "nx-n8n:v1|";
export const RESPONSE_SIG_DOMAIN = "nx-n8n:v1:resp|";

/** انحراف الساعة المقبول بالثواني، للطلب (عند المستقبِل) وللردّ (عند العميل). */
export const MAX_SKEW_SECONDS = 30;
/** سقف جسم الردّ — ما فوقه يُقطع ويُهمل (`oversized`). */
export const MAX_RESPONSE_BYTES = 32 * 1024;
/** أدنى طول للسرّ المشترك (حرف) — دونه `not_configured`. */
export const MIN_SECRET_CHARS = 32;

/**
 * مهلة ذراع التطبيق لكل مسار (مللي ثانية) — أهدافٌ **تُقاس ولا تُدّعى**. داخل n8n: 1500
 * للبحث بمزوّدين متوازيين عند 1100 لكلٍّ، فمهلة سَدِيد 1800 تترك 300 ملّي للشبكة والتوقيع.
 */
export const ARM_DEADLINE_MS: Readonly<Record<N8nPath, number>> = {
  "sadeed-research-v1": 1_800,
  "fnn-research-v1": 6_000,
  "fnn-runner-v1": 20_000,
};

/** أوضاع البحث لكل سطح (العقد). */
export const RESEARCH_MODES = {
  sadeed: ["general", "regulatory"],
  fnn: ["docs", "code", "security", "general"],
} as const;
export type SadeedResearchMode = (typeof RESEARCH_MODES.sadeed)[number];
export type FnnResearchMode = (typeof RESEARCH_MODES.fnn)[number];

export const FRESHNESS_VALUES = ["any", "month", "year"] as const;
export type Freshness = (typeof FRESHNESS_VALUES)[number];

/** الكتالوج المغلق لمشغّل FNN — هذه المعرّفات وحدها. */
export const RUNNER_WORKFLOWS = [
  "engineering_digest",
  "dependency_advisory_scan",
  "research_cache_purge",
  "canary_run_now",
  "owner_notify_test",
] as const;
export type RunnerWorkflow = (typeof RUNNER_WORKFLOWS)[number];
