/**
 * أداة قياس دور الدردشة (`/api/chat`) — صفر تغيير في السلوك.
 *
 * ## لماذا
 *
 * المقيس في الإنتاج (n=2): مرحلة النموذج وحدها 85–87% من زمن الخادم، لكن السجلّ
 * لا يقول ما بداخلها (خطوات؟ تفكير؟ أدوات؟) ولا أين يذهب ما قبلها: ثانية إلى
 * ثانيتين بين وصول الطلب وأوّل سطر سجلّ بلا تفسير. وقياس «قبل/بعد» لأي تسريع
 * يلزمه رقمٌ يُقرأ من السجلّ نفسه — `first_token_ms` في `finn_interactions` كان
 * فارغًا دائمًا (المتغيّر الميّت `firstTokenAt = null`).
 *
 * ## ما يخرج
 *
 * - **سطر سجلّ واحد لكل دور:** `console.log("[api/chat] timing", {...})` — أعدادٌ
 *   ورموزٌ ثابتة فقط: لا نصّ مستخدم، ولا معرّف مستخدم/خيط/مؤسسة. المعرّف الوحيد
 *   `requestId` (يربط السطر بترويسة الردّ). أسماء الأدوات ومعرّف النموذج مسموحة
 *   (تسمية ثابتة من الكود لا من المستخدم).
 * - **ترويسة `Server-Timing`** على كل ردّ يخرج من المعالج (ومنها ردود المنع
 *   والردود الحتمية): مراحل بالمللي ثانية فقط.
 *
 * ## دلالة المراحل
 *
 * `lap(stage)` يُسند الزمن منذ آخر `lap` إلى المرحلة — فالمراحل المتسلسلة تغطي
 * الزمن كلّه بلا ثغرة، ومجموعها ≈ الإجمالي. أمّا `watch(stage, promise)` فيقيس
 * مدّةً **متوازية** (الاسترجاع `rag` داخل `context`) دون أن يحرّك المؤشّر — فهي
 * تتداخل مع غيرها ولا تُجمع معها. المراحل التي لم تعمل في دورٍ ما (زائرٌ بلا
 * `auth`، دورٌ غير عميق بلا `council`) تغيب ولا تُسجَّل صفرًا.
 *
 * ## ما لا يفعله
 *
 * لا يكتب في القاعدة، ولا يغيّر ردًّا ولا رمز حالة، ولا يمسّ حاجزًا. وفشله
 * (استثناء داخل التسجيل) يُبتلع: القياس لا يُسقط ردًّا.
 */

/** المراحل المعروفة بترتيب ظهورها في المسار — وبه تُرتَّب ترويسة `Server-Timing`. */
export const CHAT_STAGES = [
  "validate",
  "auth",
  "org",
  "rate",
  "deterministic",
  "adapter",
  "quota",
  "context",
  "rag",
  "council",
  "tools",
  "prefs",
  "prompt",
  "model",
  "finalize",
] as const;

type ChatStage = (typeof CHAT_STAGES)[number];

type ChatStepRecord = {
  /** الزمن منذ نهاية الخطوة السابقة (أو بدء النداء) إلى نهاية هذه الخطوة. */
  ms: number;
  finishReason: string | null;
  tools: string[];
};

type ChatUsageRecord = {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
};

/** حقائق ثابتة تُكتب في سطر القياس — رموزٌ وأعداد، لا نصّ مستخدم. */
type ChatTraceNotes = {
  replyMode?: string;
  provider?: string;
  model?: string;
  /** مستوى التفكير المطبَّق: `low`… أو `none` (لا خيار) أو `fallback` (رُفض فأُعيد بلا خيار). */
  thinking?: string;
  /** سقف خطوات الأدوات الذي حُكم به هذا الدور. */
  maxSteps?: number;
};

type ChatTrace = {
  /** يُضبط بعد التحقّق من الطلب (المعرّف يُحسب هناك). */
  setRequestId(id: string): void;
  /** يُسند الزمن منذ آخر `lap` إلى `stage` ويحرّك المؤشّر. */
  lap(stage: ChatStage): void;
  /** يقيس مدّة وعدٍ حتى ينتهي (نجاحًا أو رفضًا) دون تحريك المؤشّر ودون تغيير الوعد. */
  watch(stage: ChatStage, pending: PromiseLike<unknown>): void;
  note(fields: ChatTraceNotes): void;
  /** بداية نداء نموذج (أول، أو إعادة، أو احتياطي): يُصفِّر مؤشّر زمن الخطوات. */
  modelRunStarted(): void;
  /** من `onStepFinish`: يقرأ `finishReason` وأسماء الأدوات دفاعيًّا. */
  step(stepResult: unknown): void;
  /** من نتيجة `generateText`: `totalUsage` (وإلا `usage`) و`finishReason`. */
  finishModel(result: unknown): void;
  serverTiming(): string;
  snapshot(response: Response | null, threw: boolean): Record<string, unknown>;
};

type Clock = () => number;

const round = (ms: number): number => Math.max(0, Math.round(ms));

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

/** يقرأ حقلًا من كائنٍ مجهول البنية دون رمي. */
function field(source: unknown, key: string): unknown {
  return source && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;
}

/**
 * استهلاك الرموز بشكل ai v6: `inputTokens` و`outputTokens`، والتفاصيل في
 * `outputTokenDetails.reasoningTokens` و`inputTokenDetails.cacheReadTokens`، مع
 * الحقلين المسطّحين القديمين (`reasoningTokens` و`cachedInputTokens`) احتياطًا.
 * ما لم يُبلَّغ يعود `null` — لا صفر بدل الغياب (المادة ٢٧).
 */
export function readUsage(usage: unknown): ChatUsageRecord | null {
  if (!usage || typeof usage !== "object") return null;
  const record: ChatUsageRecord = {
    inputTokens: finiteOrNull(field(usage, "inputTokens")),
    outputTokens: finiteOrNull(field(usage, "outputTokens")),
    reasoningTokens:
      finiteOrNull(field(field(usage, "outputTokenDetails"), "reasoningTokens")) ??
      finiteOrNull(field(usage, "reasoningTokens")),
    cachedInputTokens:
      finiteOrNull(field(field(usage, "inputTokenDetails"), "cacheReadTokens")) ??
      finiteOrNull(field(usage, "cachedInputTokens")),
  };
  return Object.values(record).every((v) => v === null) ? null : record;
}

/** عدّاد أدوار هذا المعزول وعمره عند أول طلب — دليلٌ على البدء البارد دون تخمين. */
let isolateTurns = 0;

export function resetChatTraceStateForTests(): void {
  isolateTurns = 0;
}

function processUptimeMs(): number | null {
  try {
    return typeof process !== "undefined" && typeof process.uptime === "function"
      ? round(process.uptime() * 1000)
      : null;
  } catch {
    return null;
  }
}

type CreateChatTraceOptions = {
  /** ساعة أحادية بالمللي ثانية — تُحقن في الاختبار. الافتراض `performance.now`. */
  now?: Clock;
  env?: Record<string, string | undefined>;
};

export function createChatTrace(options: CreateChatTraceOptions = {}): ChatTrace {
  const now: Clock = options.now ?? (() => performance.now());
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});
  const startedAt = now();
  const isolateTurn = ++isolateTurns;
  const isolateAgeMs = processUptimeMs();
  let cursor = startedAt;
  let stepCursor = startedAt;
  let requestId: string | null = null;
  const stages = new Map<ChatStage, number>();
  const notes: ChatTraceNotes = {};
  const steps: ChatStepRecord[] = [];
  let usage: ChatUsageRecord | null = null;
  let finishReason: string | null = null;
  let modelRuns = 0;

  const add = (stage: ChatStage, ms: number) =>
    stages.set(stage, (stages.get(stage) ?? 0) + Math.max(0, ms));

  const stageEntries = (): Array<[ChatStage, number]> =>
    CHAT_STAGES.filter((stage) => stages.has(stage)).map((stage) => [
      stage,
      round(stages.get(stage) ?? 0),
    ]);

  return {
    setRequestId(id) {
      requestId = id;
    },
    lap(stage) {
      const t = now();
      add(stage, t - cursor);
      cursor = t;
    },
    watch(stage, pending) {
      const from = now();
      const done = () => add(stage, now() - from);
      Promise.resolve(pending).then(done, done);
    },
    note(fields) {
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) (notes as Record<string, unknown>)[key] = value;
      }
    },
    modelRunStarted() {
      modelRuns += 1;
      stepCursor = now();
    },
    step(stepResult) {
      const t = now();
      const calls = field(stepResult, "toolCalls");
      steps.push({
        ms: round(t - stepCursor),
        finishReason: stringOrNull(field(stepResult, "finishReason")),
        tools: Array.isArray(calls)
          ? calls
              .map((call) => stringOrNull(field(call, "toolName")))
              .filter((name): name is string => name !== null)
          : [],
      });
      stepCursor = t;
    },
    finishModel(result) {
      usage = readUsage(field(result, "totalUsage") ?? field(result, "usage"));
      finishReason = stringOrNull(field(result, "finishReason"));
    },
    serverTiming() {
      const parts = stageEntries().map(([stage, ms]) => `${stage};dur=${ms}`);
      parts.push(`total;dur=${round(now() - startedAt)}`);
      return parts.join(", ");
    },
    snapshot(response, threw) {
      const header = (name: string) => response?.headers.get(name) ?? null;
      return {
        requestId,
        status: response ? response.status : null,
        threw,
        replySource: header("X-SADEED-Reply-Source"),
        gate: header("X-SADEED-Gate"),
        auth: header("X-SADEED-Auth"),
        replyMode: notes.replyMode ?? null,
        provider: notes.provider ?? null,
        model: notes.model ?? null,
        thinking: notes.thinking ?? null,
        maxSteps: notes.maxSteps ?? null,
        stages: Object.fromEntries(stageEntries()),
        totalMs: round(now() - startedAt),
        modelRuns,
        finishReason,
        steps,
        usage,
        isolateTurn,
        isolateAgeMs,
        region: env.VERCEL_REGION ?? null,
      };
    },
  };
}

/** يضع `Server-Timing` على الردّ؛ وردٌّ ترويسته غير قابلة للتعديل يُعاد بناؤه بجسمه نفسه. */
function stamp(response: Response, value: string): Response {
  try {
    response.headers.set("Server-Timing", value);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    headers.set("Server-Timing", value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

/**
 * يغلّف معالج `POST` فيُنشئ أثر الدور، ويختم كل ردٍّ بـ`Server-Timing`، ويكتب سطر
 * القياس مرّةً واحدة في `finally` — فيشمل ردود المنع والردود الحتمية والاستثناءات،
 * لا ردود النموذج وحدها. لا يلتقط استثناءً ولا يغيّره: يُعاد رميه كما هو.
 */
export function withChatTurnTrace<C extends { request: Request }>(
  handler: (context: C, trace: ChatTrace) => Promise<Response>,
  options: CreateChatTraceOptions = {},
): (context: C) => Promise<Response> {
  return async (context) => {
    const trace = createChatTrace(options);
    let final: Response | null = null;
    let threw = false;
    try {
      final = stamp(await handler(context, trace), trace.serverTiming());
      return final;
    } catch (error) {
      threw = true;
      throw error;
    } finally {
      try {
        console.log("[api/chat] timing", trace.snapshot(final, threw));
      } catch {
        /* القياس لا يُسقط ردًّا */
      }
    }
  };
}
