/**
 * محرّك فِن — **GPT أساسًا، والاحتياطي معلَنٌ عند العطل.** للخادم وحده.
 *
 * أمر المالك ٢٠٢٦/١٠/٢٣: «اربط مع جي بي تي للبرمجة والاعتماد» — محرّك فِن الأساسي
 * OpenAI GPT ويُعتمد عليه. «الاعتماد» هنا = **الموثوقية**: إن لم يُضبط المفتاح أو
 * فشل OpenAI (429 · 5xx · مهلة · نموذجٌ غير متاح · رفض الحساب) يسقط فِن إلى
 * محرّك الاحتياط الجاهز (Gemini عبر الطبقة القائمة) **ويُفصح** بترويسة
 * `X-FINN-Engine` وشارةٍ في الواجهة — لا سقوط صامت (انظر `failover.ts`).
 *
 * ## ما يملكه الخادم وحده
 *
 * النموذج (`FINN_OPENAI_MODEL`، الافتراضي `gpt-4.1`) وسقف المخرجات والمهلة وعدد
 * المحاولات والموجِّه وخيار عدم الحفظ عند المزوّد (`store: false`). **لا شيء
 * منها يأتي من الطلب** — لا ترويسةً ولا جسمًا.
 *
 * ## المفتاح
 *
 * `OPENAI_API_KEY` من بيئة الخادم (موجودٌ أصلًا لمسار OpenAI الصريح في سَدِيد) — لا
 * مفتاح جديد. يُقرأ عند الحاجة ولا يُسجَّل ولا يُعاد ولا يُحسب طوله.
 * وحزمة `@ai-sdk/openai` تُستورد **ديناميكيًّا** عند أول استعمال، فلا تُحمَّل
 * (ولا تكسر وحدةً) في مسارٍ لا يحتاجها.
 *
 * ## بوّابة الإنفاق
 *
 * نداءٌ مدفوع، فمفتاح الإيقاف يُفحص هنا أيضًا (دفاعٌ ثانٍ خلف بوّابة المسار).
 */
import {
  streamText,
  type LanguageModel,
  type ModelMessage,
  type TextStreamPart,
  type ToolSet,
} from "ai";
import { assertAiEnabled, aiKillSwitchOn } from "@/lib/governance/ai-quota.server";
import { resolveSadeedGeminiRuntimes } from "@/lib/sadeed/gemini-provider.server";
import {
  coolPrimary,
  createSadeedBackupModel,
  primaryCoolingDown,
  primaryCooldownFor,
} from "@/lib/sadeed/backup-provider.server";
import { openFinnReply, type FinnAttempt, type FinnOpenResult, type FinnPart } from "./failover";
import { FINN_LIMITS } from "./limits";
import type { FinnChatMessage } from "./messages";
import { FINN_SYSTEM_PROMPT } from "./prompt";
import type { FinnEngineStatus } from "./status";

export const FINN_OPENAI_DEFAULT_MODEL = "gpt-4.1";

type EnvLike = Record<string, string | undefined>;

/** شكل معرّف نموذج معقول — قيمةٌ مشوَّهة في البيئة تعود إلى الافتراضي لا تُمرَّر. */
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

/** نموذج GPT الذي يعتمده الخادم. العميل لا يختاره. */
export function resolveFinnOpenAiModelId(env: EnvLike = process.env): string {
  const configured = env.FINN_OPENAI_MODEL?.trim() ?? "";
  return MODEL_ID.test(configured) ? configured : FINN_OPENAI_DEFAULT_MODEL;
}

/** هل مفتاح OpenAI مضبوط؟ منطقيّ فقط — القاعدة نفسها التي يقرّر بها المحرّك السقوط. */
export function openAiKeyConfigured(env: EnvLike = process.env): boolean {
  return (env.OPENAI_API_KEY?.trim() ?? "").length > 0;
}

function geminiConfigured(env: EnvLike): boolean {
  return (
    (env.GEMINI_API_KEY?.trim() ?? "").length > 0 ||
    (env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ?? "").length > 0 ||
    (env.LOVABLE_API_KEY?.trim() ?? "").length > 0
  );
}

/** حالة المحرّكين للمالك — منطقيّات واسم نموذج، لا مفتاح ولا طوله. */
export function readFinnEngineStatus(env: EnvLike = process.env): FinnEngineStatus {
  return {
    gpt: openAiKeyConfigured(env),
    gptModel: resolveFinnOpenAiModelId(env),
    fallback: geminiConfigured(env),
    paused: aiKillSwitchOn(),
  };
}

/** هل في الخادم أيُّ محرّكٍ يمكنه الرد؟ — يُفحص قبل أن يُنفَق حدٌّ أو حصّة. */
export function finnHasAnyEngine(env: EnvLike = process.env): boolean {
  return openAiKeyConfigured(env) || geminiConfigured(env);
}

async function createOpenAiModel(env: EnvLike): Promise<LanguageModel> {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const { createOpenAI } = await import("@ai-sdk/openai");
  return createOpenAI({ apiKey }).responses(resolveFinnOpenAiModelId(env));
}

/** يطبّع أجزاء الـSDK إلى `FinnPart` — ما عدا ذلك لا يعني الواجهة. */
async function* normalize(
  stream: AsyncIterable<TextStreamPart<ToolSet>>,
): AsyncGenerator<FinnPart> {
  for await (const part of stream) {
    switch (part.type) {
      case "text-delta":
        yield { type: "text", text: part.text };
        break;
      case "text-start":
      case "reasoning-start":
      case "reasoning-delta":
        yield { type: "progress" };
        break;
      case "error":
        yield { type: "error", error: part.error };
        break;
      case "abort":
        yield { type: "abort" };
        break;
      case "finish":
        yield {
          type: "finish",
          truncated: part.finishReason === "length",
          finishReason: part.finishReason,
        };
        break;
      default:
        break;
    }
  }
}

type RunSettings = {
  readonly messages: readonly ModelMessage[];
  readonly maxRetries: number;
  readonly providerOptions?: Record<string, Record<string, boolean>>;
};

async function* run(
  getModel: () => Promise<LanguageModel> | LanguageModel,
  settings: RunSettings,
  signal: AbortSignal,
): AsyncGenerator<FinnPart> {
  // عند نقطة الإنفاق نفسها: كل نداءٍ مدفوع (GPT أو الاحتياطي) يمرّ بمفتاح الإيقاف.
  // يرمي ⇒ تُحتسب المحاولة فاشلة ولا يصل مزوّدًا شيء.
  assertAiEnabled("finn");
  const model = await getModel();
  const result = streamText({
    model,
    system: FINN_SYSTEM_PROMPT,
    messages: [...settings.messages],
    maxOutputTokens: FINN_LIMITS.maxOutputTokens,
    maxRetries: settings.maxRetries,
    abortSignal: signal,
    ...(settings.providerOptions ? { providerOptions: settings.providerOptions } : {}),
    // الافتراضي يطبع الخطأ كاملًا في السجلّ — وقد يحمل جسم الطلب (نصّ المحادثة)
    // أو جسم ردّ المزوّد. الأخطاء تُستهلك من `fullStream` وتُصنَّف برمزٍ عامّ.
    onError: () => undefined,
  });
  yield* normalize(result.fullStream);
}

/** المحاولات بالترتيب: GPT ← Gemini المباشر ← بوّابة الاحتياط. تُبنى لكل طلب. */
export function buildFinnAttempts(
  messages: readonly FinnChatMessage[],
  env: EnvLike = process.env,
): FinnAttempt[] {
  const modelMessages: ModelMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

  const openai: FinnAttempt = {
    engine: "openai",
    skip: openAiKeyConfigured(env) ? undefined : "not_configured",
    open: (signal) =>
      run(
        () => createOpenAiModel(env),
        {
          messages: modelMessages,
          maxRetries: 0,
          // لا يحتفظ المزوّد بالمحادثة (كما في مسار OpenAI الصريح في سَدِيد).
          providerOptions: { openai: { store: false } },
        },
        signal,
      ),
  };

  const gemini = resolveSadeedGeminiRuntimes()[0];
  const gateway = createSadeedBackupModel();
  // مفتاح Gemini المباشر مخنوقٌ بالحصّة: لا يُنتظر، تُجرَّب البوّابة فورًا.
  const directUsable = Boolean(gemini) && !(gateway && primaryCoolingDown());

  const geminiDirect: FinnAttempt = {
    engine: "gemini",
    skip: directUsable ? undefined : "not_configured",
    open: (signal) =>
      run(
        () => {
          if (!gemini) throw new Error("no direct model");
          return gemini.provider(gemini.modelId);
        },
        { messages: modelMessages, maxRetries: 0 },
        signal,
      ),
    onFailure: (error) => {
      // خنقٌ بالحصّة: يُبرَّد المفتاح المباشر (يحترم Retry-After) فيذهب التالي للبوّابة.
      const status = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
      if (status === 429) coolPrimary(primaryCooldownFor(error));
    },
  };

  const geminiGateway: FinnAttempt = {
    engine: "gemini",
    skip: gateway ? undefined : "not_configured",
    open: (signal) =>
      run(
        () => {
          if (!gateway) throw new Error("no backup model");
          return gateway as unknown as LanguageModel;
        },
        { messages: modelMessages, maxRetries: 1 },
        signal,
      ),
  };

  return [openai, geminiDirect, geminiGateway];
}

/**
 * يفتح ردّ فِن: المحرّك الذي سيجيب يُحسم هنا (أول مخرجٍ) فيُعلَن في الترويسات
 * قبل أن يبدأ الجسم. السجلّ يحمل رموزًا فقط — لا نصّ محادثة ولا نصّ خطأ.
 */
export async function openFinnChatStream(
  messages: readonly FinnChatMessage[],
  signal: AbortSignal,
  env: EnvLike = process.env,
): Promise<FinnOpenResult> {
  // دفاعٌ ثانٍ: النداء مدفوع، والمفتاح يُفحص قبل أيّ محاولة ولو نُسيت بوّابة المسار.
  assertAiEnabled("finn");
  return openFinnReply(buildFinnAttempts(messages, env), {
    signal,
    firstTokenDeadlineMs: FINN_LIMITS.firstTokenDeadlineMs,
    totalDeadlineMs: FINN_LIMITS.totalDeadlineMs,
    log: ({ engine, code, status }) => {
      console.warn("[finn] engine attempt failed", { engine, code, status });
    },
  });
}
