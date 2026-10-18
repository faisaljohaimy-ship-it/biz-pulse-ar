/**
 * خطة محرّك التحليل لسَدِيد — مصدرٌ واحد يقرّر من يُجيب: محرّكٌ لغويٌّ مهيّأ، أو
 * **الوضع الحتمي بلا تكلفة** (أمر المالك ٢٠٢٦/١٠/١٨: «الصفر تكلفة أوّلًا»).
 *
 * ## القواعد
 *
 * - `SADEED_LLM_PROVIDER`: ‏`gemini` (الافتراض حين يغيب أو يفرغ) · `openai` · `none`.
 *   أيّ قيمةٍ أخرى ⇐ `zero_cost` بسبب `invalid_provider_setting` — خطأ كتابةٍ في
 *   الإعداد يفشل آمنًا وبلا إنفاق، لا يُخمَّن مقصوده.
 * - **لا استبدال صامت لمورّد.** المحرّك المختار ناقص الإعداد ⇐ `zero_cost` بسبب
 *   `provider_not_configured`، ولو كان مفتاح مورّدٍ آخر حاضرًا.
 * - المحوّل الاختياري (`openai`) **معطّل افتراضًا**: يلزمه المفتاح (≥20 حرفًا)
 *   **و**`SADEED_OPENAI_ENABLED=true` معًا، والنموذج من قائمةٍ بيضاء. وحزمته لا
 *   تُحمَّل إلا عند البناء الفعلي (استيرادٌ كسول).
 * - الاحتياطي (بوّابة Lovable) لا يوجد إلا بطلبٍ صريح من المالك ومفتاحٍ حاضر،
 *   وخلف Gemini وحده — والقرار مكرّرٌ دفاعًا في `backup-provider.server.ts`.
 *
 * دالةٌ خالصة تُحقن لها البيئة (للاختبار)، ولا تقرأ قيمة مفتاحٍ إلا لتمريرها
 * إلى منشئ المزوّد — لا تُسجَّل ولا تُعاد في الوصف.
 */
import type { LanguageModel } from "ai";
import {
  createGoogleGeminiProvider,
  GOOGLE_MODELS,
  resolveGoogleGeminiModel,
} from "@/lib/ai-gateway.server";
import {
  createSadeedBackupModel,
  isSadeedBackupEnabled,
  SADEED_BACKUP_MODEL,
} from "@/lib/sadeed/backup-provider.server";

type EnvLike = Record<string, string | undefined>;

/** القائمة البيضاء لنماذج المحوّل الاختياري — ما سواها يعود للافتراض. */
export const SADEED_OPENAI_MODELS = ["gpt-5-mini", "gpt-5", "gpt-5-nano"] as const;
export type SadeedOpenAiModel = (typeof SADEED_OPENAI_MODELS)[number];
export const SADEED_OPENAI_DEFAULT_MODEL: SadeedOpenAiModel = "gpt-5-mini";
/** أقصر مفتاحٍ يُعدّ إعدادًا لا عنصرًا نائبًا. */
const OPENAI_KEY_MIN_LENGTH = 20;

/** ما يطلبه الإعداد: محرّكٌ بعينه، أو لا محرّك، أو قيمةٌ غير صالحة. */
export type SadeedLlmSelection = "gemini" | "openai" | "none" | "invalid";

/** لماذا الوضع الحتمي — للسجلّ والصحّة ونصّ الردّ، لا يحمل قيمةً سرّية. */
export type ZeroCostReason =
  "provider_disabled" | "provider_not_configured" | "invalid_provider_setting";

/** وسم فئة المورّد للسجلّ والقياس — لا يظهر للمستخدم. */
export type SadeedLlmVendor = "google-gemini" | "openai" | "lovable-gateway";

export type PlannedModel = {
  vendor: SadeedLlmVendor;
  modelId: string;
  /** يبني النموذج عند الحاجة وحدها — لا شبكة هنا، والمحوّل الاختياري يُحمَّل كسولًا. */
  create: () => Promise<LanguageModel>;
};

export type ProviderPlan =
  | {
      mode: "zero_cost";
      selected: SadeedLlmSelection;
      reason: ZeroCostReason;
      primary: null;
      backup: null;
    }
  | {
      mode: "llm";
      selected: "gemini" | "openai";
      reason: null;
      primary: PlannedModel;
      backup: PlannedModel | null;
    };

export type ProviderPlanOptions = {
  env?: EnvLike;
  /**
   * نموذج Gemini كما قرّره المستدعي (اختيار العميل من القائمة البيضاء أو موجّه
   * النيّة). يُتحقَّق منه هنا ثانيةً، وما ليس في القائمة يعود لنموذج الخادم.
   */
  geminiModelId?: string | null;
};

/** يقرأ اختيار المحرّك: الغياب/الفراغ ⇐ `gemini`، والمجهول ⇐ `invalid`. */
export function readLlmSelection(env: EnvLike = process.env): SadeedLlmSelection {
  const raw = env.SADEED_LLM_PROVIDER?.trim().toLowerCase() ?? "";
  if (!raw) return "gemini";
  return raw === "gemini" || raw === "openai" || raw === "none" ? raw : "invalid";
}

function geminiKey(env: EnvLike): string | null {
  return env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;
}

function openAiKey(env: EnvLike): string | null {
  const key = env.OPENAI_API_KEY?.trim() ?? "";
  return key.length >= OPENAI_KEY_MIN_LENGTH ? key : null;
}

function openAiEnabled(env: EnvLike): boolean {
  return env.SADEED_OPENAI_ENABLED?.trim() === "true";
}

/** نموذج المحوّل الاختياري من القائمة البيضاء، وإلا الافتراض. */
export function resolveOpenAiModel(env: EnvLike = process.env): SadeedOpenAiModel {
  const configured = env.SADEED_OPENAI_MODEL?.trim() ?? "";
  return (SADEED_OPENAI_MODELS as readonly string[]).includes(configured)
    ? (configured as SadeedOpenAiModel)
    : SADEED_OPENAI_DEFAULT_MODEL;
}

function zeroCost(selected: SadeedLlmSelection, reason: ZeroCostReason): ProviderPlan {
  return { mode: "zero_cost", selected, reason, primary: null, backup: null };
}

/** يقرّر خطة هذا الدور. لا شبكة، ولا رمي، ولا مفتاح في الناتج إلا داخل `create`. */
export function resolveProviderPlan(options: ProviderPlanOptions = {}): ProviderPlan {
  const env = options.env ?? process.env;
  const selected = readLlmSelection(env);
  if (selected === "invalid") return zeroCost(selected, "invalid_provider_setting");
  if (selected === "none") return zeroCost(selected, "provider_disabled");

  if (selected === "openai") {
    const key = openAiKey(env);
    if (!key || !openAiEnabled(env)) return zeroCost(selected, "provider_not_configured");
    const modelId = resolveOpenAiModel(env);
    return {
      mode: "llm",
      selected,
      reason: null,
      primary: {
        vendor: "openai",
        modelId,
        // واجهة المحادثات (`.chat`) لا الافتراضية (Responses)، لسببين لا يُختبران إلا
        // حيًّا فيُتّقيان بالبناء: ① أدوات المسجَّل فيها حقولٌ اختيارية، والحزمة لا
        // ترسل `strict` ما لم تضبطه الأداة — وافتراض Responses الصارم يرفض مخطّطًا
        // كهذا، وافتراض المحادثات غير صارم؛ ② Responses تحفظ المخرَجات لدى المورّد
        // افتراضًا (`store`)، والمحادثات لا تحفظها. وأسئلة المستخدمين لا تُحفظ خارجنا.
        create: async () => {
          const { createOpenAI } = await import("@ai-sdk/openai");
          return createOpenAI({ apiKey: key }).chat(modelId);
        },
      },
      // الاحتياطي خلف Gemini وحده — لا سلسلة مورّدين بعدّاد خلف محوّلٍ اختياري.
      backup: null,
    };
  }

  const key = geminiKey(env);
  if (!key) return zeroCost(selected, "provider_not_configured");
  const requested = options.geminiModelId ?? "";
  const modelId = GOOGLE_MODELS.some(({ id }) => id === requested)
    ? requested
    : resolveGoogleGeminiModel(env);
  return {
    mode: "llm",
    selected,
    reason: null,
    primary: {
      vendor: "google-gemini",
      modelId,
      create: async () => createGoogleGeminiProvider(key)(modelId),
    },
    backup: isSadeedBackupEnabled(env)
      ? {
          vendor: "lovable-gateway",
          modelId: SADEED_BACKUP_MODEL,
          create: async () => {
            const model = createSadeedBackupModel(env);
            if (!model) throw new Error("SADEED backup provider is not enabled.");
            return model;
          },
        }
      : null,
  };
}

/** وصف الخطة للصحّة والجاهزية — وسومٌ وقيمٌ منطقية فقط، لا مفتاح ولا قيمة سرّية. */
export type ProviderPlanDescription = {
  mode: "llm" | "zero_cost";
  selected: SadeedLlmSelection;
  /** فئة مورّد المحرّك المختار حين يكون مهيّأً، وإلا `null`. */
  provider: Exclude<SadeedLlmVendor, "lovable-gateway"> | null;
  model: string | null;
  configured: boolean;
  backup_enabled: boolean;
  reason: ZeroCostReason | null;
};

export function describeProviderPlan(env: EnvLike = process.env): ProviderPlanDescription {
  const plan = resolveProviderPlan({ env });
  if (plan.mode === "zero_cost") {
    return {
      mode: plan.mode,
      selected: plan.selected,
      provider: null,
      model: null,
      configured: false,
      backup_enabled: false,
      reason: plan.reason,
    };
  }
  return {
    mode: plan.mode,
    selected: plan.selected,
    provider: plan.primary.vendor === "openai" ? "openai" : "google-gemini",
    model: plan.primary.modelId,
    configured: true,
    backup_enabled: plan.backup !== null,
    reason: null,
  };
}
