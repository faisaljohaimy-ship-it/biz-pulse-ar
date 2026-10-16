/**
 * مزوّد استدلالٍ محليّ اختياريّ لسَدِيد — مُطفأ افتراضيًّا (توجيه المالك ٢٠٢٦/١٠/١٦).
 *
 * يتحدّث بروتوكول OpenAI-compatible (`/v1/chat/completions`)، فيعمل مع Ollama
 * و vLLM و llama.cpp server وأيّ بوّابةٍ مكافئة — دون اعتماديةٍ جديدة: الحزمة
 * `@ai-sdk/openai-compatible` قائمةٌ أصلًا لمسار الاحتياط.
 *
 * ## ما لا يتغيّر
 *
 * - **Gemini يبقى المزوّد الافتراضي.** هذا الملف لا يمسّ `ai-router.server.ts`
 *   ولا سياسته؛ والراية مطفأة ⇐ المسار كما كان حرفًا.
 * - **الإعداد في الخادم وحده.** لا متغيّر `VITE_*`، ولا قيمةٌ تُطبع في سجلّ أو
 *   خطأ — المشاكل تُعاد أسماءً ثابتة لا قيمًا.
 * - **لا حالةَ محادثةٍ مشتركة.** النموذج يُبنى لكل طلب؛ والحالة الوحيدة على
 *   مستوى الوحدة تبريدُ صحّةٍ (طابعٌ زمنيّ) لا يحمل نصًّا ولا هوية.
 *
 * ## متى يُرفض الإعداد (ويبقى المسار القائم وحده)
 *
 * عنوانٌ غير http(s)، أو يحمل اسم مستخدم/كلمة سرّ، أو استعلامًا؛ أو مضيفٌ غير
 * محليّ (loopback) بلا TLS أو بلا مفتاح — فخادم الاستدلال لا يُعرَّض للإنترنت
 * إلا خلف بوّابةٍ مؤمَّنة؛ أو اسم نموذجٍ خارج الصيغة المسموحة.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type LocalInferenceMode = "fallback" | "primary";

export type LocalInferenceProblem =
  | "base_url_missing"
  | "base_url_invalid"
  | "base_url_protocol"
  | "base_url_credentials"
  | "base_url_query"
  | "remote_requires_https"
  | "remote_requires_api_key"
  | "model_missing"
  | "model_invalid";

export interface LocalInferenceConfig {
  readonly enabled: true;
  /** بلا شرطةٍ ختامية؛ يحوي `/v1` إن كان الخادم يتطلّبه. */
  readonly baseURL: string;
  readonly modelId: string;
  readonly apiKey: string | null;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly mode: LocalInferenceMode;
  /** ما يُكتب في السجلّ: صنف المضيف لا عنوانه. */
  readonly hostClass: "loopback" | "remote";
}

export type LocalInferenceResolution =
  | LocalInferenceConfig
  | { readonly enabled: false; readonly reason: "disabled" }
  | {
      readonly enabled: false;
      readonly reason: "invalid";
      readonly problems: readonly LocalInferenceProblem[];
    };

export const LOCAL_INFERENCE_ENV = Object.freeze({
  enabled: "SADEED_LOCAL_INFERENCE_ENABLED",
  baseURL: "SADEED_LOCAL_INFERENCE_BASE_URL",
  model: "SADEED_LOCAL_INFERENCE_MODEL",
  apiKey: "SADEED_LOCAL_INFERENCE_API_KEY",
  timeoutMs: "SADEED_LOCAL_INFERENCE_TIMEOUT_MS",
  maxRetries: "SADEED_LOCAL_INFERENCE_MAX_RETRIES",
  mode: "SADEED_LOCAL_INFERENCE_MODE",
});

export const LOCAL_INFERENCE_DEFAULT_TIMEOUT_MS = 20_000;
const TIMEOUT_FLOOR_MS = 1_000;
const TIMEOUT_CEIL_MS = 60_000;
const MAX_RETRIES_CEIL = 2;
/** أسماء Ollama و HF و vLLM: حروف وأرقام و `._:/-` فقط. */
const MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

function truthy(value: string | undefined): boolean {
  return /^(1|true|on|yes)$/i.test((value ?? "").trim());
}

function clampInt(raw: string | undefined, fallback: number, floor: number, ceil: number): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(ceil, Math.max(floor, n));
}

function isLoopback(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return h === "localhost" || h === "::1" || /^127(\.\d{1,3}){3}$/.test(h);
}

/** يقرأ الإعداد ويتحقّق منه. لا يرمي، ولا يعيد قيمةً سرّية في المشاكل. */
export function resolveLocalInference(
  env: Record<string, string | undefined> = process.env,
): LocalInferenceResolution {
  if (!truthy(env[LOCAL_INFERENCE_ENV.enabled])) return { enabled: false, reason: "disabled" };

  const problems: LocalInferenceProblem[] = [];
  const rawUrl = env[LOCAL_INFERENCE_ENV.baseURL]?.trim() ?? "";
  const modelId = env[LOCAL_INFERENCE_ENV.model]?.trim() ?? "";
  const apiKey = env[LOCAL_INFERENCE_ENV.apiKey]?.trim() || null;

  let url: URL | null = null;
  if (!rawUrl) problems.push("base_url_missing");
  else {
    try {
      url = new URL(rawUrl);
    } catch {
      problems.push("base_url_invalid");
    }
  }
  let hostClass: "loopback" | "remote" = "remote";
  if (url) {
    if (url.protocol !== "http:" && url.protocol !== "https:") problems.push("base_url_protocol");
    if (url.username || url.password) problems.push("base_url_credentials");
    if (url.search || url.hash) problems.push("base_url_query");
    hostClass = isLoopback(url.hostname) ? "loopback" : "remote";
    if (hostClass === "remote") {
      if (url.protocol !== "https:") problems.push("remote_requires_https");
      if (!apiKey) problems.push("remote_requires_api_key");
    }
  }
  if (!modelId) problems.push("model_missing");
  else if (!MODEL_ID_RE.test(modelId)) problems.push("model_invalid");

  if (problems.length || !url) return { enabled: false, reason: "invalid", problems };

  return {
    enabled: true,
    baseURL: `${url.origin}${url.pathname}`.replace(/\/+$/, ""),
    modelId,
    apiKey,
    timeoutMs: clampInt(
      env[LOCAL_INFERENCE_ENV.timeoutMs],
      LOCAL_INFERENCE_DEFAULT_TIMEOUT_MS,
      TIMEOUT_FLOOR_MS,
      TIMEOUT_CEIL_MS,
    ),
    maxRetries: clampInt(env[LOCAL_INFERENCE_ENV.maxRetries], 0, 0, MAX_RETRIES_CEIL),
    mode:
      env[LOCAL_INFERENCE_ENV.mode]?.trim().toLowerCase() === "primary" ? "primary" : "fallback",
    hostClass,
  };
}

/** نموذجٌ جديد لكل طلب — لا ذاكرة مشتركة بين المستخدمين. */
export function createLocalInferenceModel(config: LocalInferenceConfig, fetchImpl?: typeof fetch) {
  const provider = createOpenAICompatible({
    name: "sadeed-local",
    baseURL: config.baseURL,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    includeUsage: true,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
  return provider.chatModel(config.modelId);
}

/** مهلةٌ صلبة تشمل المحاولات كلّها، وتتبع إلغاء العميل. */
export function localInferenceSignal(
  config: LocalInferenceConfig,
  parent?: AbortSignal,
): AbortSignal {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

// ── تبريد الصحّة ─────────────────────────────────────────────────────────
// خادمٌ معطَّل لا يُكلّف كل طلبٍ تالٍ مهلةً كاملة: بعد فشلٍ يُتخطّى دقيقةً.
// الحالة طابعٌ زمنيٌّ واحد — لا نصّ ولا هوية — فلا تسرّب بين المستخدمين.
let localCooldownUntil = 0;
export const LOCAL_INFERENCE_COOLDOWN_MS = 60_000;

export function localInferenceCoolingDown(now = Date.now()): boolean {
  return now < localCooldownUntil;
}
export function coolLocalInference(ms = LOCAL_INFERENCE_COOLDOWN_MS, now = Date.now()): void {
  localCooldownUntil = now + ms;
}
/** للاختبارات وحدها. */
export function resetLocalInferenceCooldown(): void {
  localCooldownUntil = 0;
}

/** وصفٌ آمن للسجلّ: لا عنوان، لا مفتاح، لا نصّ خطأ خام. */
export function describeLocalInferenceError(error: unknown): string {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
    return "timeout";
  const msg = error instanceof Error ? error.message : String(error);
  const status = /\b([45]\d\d)\b/.exec(msg)?.[1];
  if (status) return `http_${status}`;
  if (/ECONNREFUSED|fetch failed|ENOTFOUND|network/i.test(msg)) return "unreachable";
  if (/abort|timeout/i.test(msg)) return "timeout";
  return "error";
}
