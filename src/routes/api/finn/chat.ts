/**
 * POST /api/finn/chat — مسار فِن، وكيل المالك للبرمجة والأتمتة.
 *
 * **للمالك وحده، والفرض هنا في الخادم** — لا إخفاء واجهة. وهو يقترح ولا ينفّذ: لا
 * أدوات ولا كتابة ولا شبكة نيابةً عن المستخدم؛ يردّ نصًّا يراجعه المالك.
 *
 * ## الترتيب (ومَن يسبق مَن)
 *
 * 1. **بوّابة المالك أوّلًا** — قبل مفتاح الإيقاف والحدّ والحصّة والنموذج. غير المالك
 *    (زائرًا أو مسجَّلًا، أو قائمة المالكين غير مضبوطة) يتلقّى **404 متطابقًا** في
 *    كل الحالات، **ولو كان مفتاح الإيقاف مرفوعًا** — وإلا لكشف 503 وجودَ المسار. وبلا
 *    نداء مصادقةٍ ولا حدٍّ ولا نموذجٍ له أصلًا (انظر `owner-gate.server.ts`).
 *    (خلافُ مسارات سَدِيد التي تقدّم مفتاح الإيقاف على المصادقة: هناك المسارُ معلَنٌ،
 *    وهنا وجودُه نفسه مخفيّ.)
 * 2. **مفتاح الإيقاف** (متزامن، بلا شبكة) ⇐ 503 قبل أي حدٍّ أو نموذج.
 * 3. شكل الطلب وحجمه (رخيص) ⇐ 400/413/415 — قبل أن يُنفَق حدٌّ أو حصّة.
 * 4. **حدّ المعدّل** `finn-chat:<هوية>` ثم **السقف اليومي** للهوية والمشروع — يفشلان
 *    مغلقين (لا «bounded»: المالك يعيد المحاولة، ولا يُنفَق بلا تحقّق).
 * 5. المحرّك: GPT أوّلًا، والاحتياط معلَنٌ في `X-FINN-Engine` / `X-FINN-Fallback`.
 *
 * ## طبقة «لا يتعطل» (٢٠٢٦/١٠/٣٠، O8(ب))
 *
 * لا محرّك مهيّأً أصلًا ⇒ **ردٌّ محلّيٌّ حتميّ بلا نموذج** (`200` + `X-FINN-Engine: local` وسطرٌ
 * عربيّ صريح في الجسم) بدل `503 no_engine`. يقع بعد بوّابة المالك ومفتاح الإيقاف وفحص الجسم،
 * و**قبل** الحدّ والحصّة، فلا يُنفَق منهما شيء ولا يُنادى نموذج. وكل ما يفشل مغلقًا اليوم
 * (المخزن غير متاح · الحصّة مستنفدة · جسمٌ غير صالح · مفتاح الإيقاف) يبقى كما هو؛ والذي تغيّر
 * حالةُ «لا محرّك» وحدها. يبقى `503 no_engine` لمسار ما بعد الفتح (محرّكٌ مهيّأ تُخطّيت
 * محاولاتُه كلّها)، وهو غير قابلٍ للبلوغ عمليًّا ما دام الفحص يتّفق مع بانِي المحاولات
 * (`engine-predicate.contract.test.ts`).
 *
 * ## ما لا يملكه العميل
 *
 * النموذج والموجِّه وسقف المخرجات والمهلة والوجهة — كلّها من الخادم. الجسم يُقرأ
 * منه `messages` وحدها؛ أيّ حقلٍ أو ترويسةٍ أخرى لا أثر لها.
 *
 * ## الخصوصية
 *
 * لا تخزين محادثات في الخادم، ولا نصّ محادثة في السجلّات، ولا نصّ خطأ مزوّدٍ
 * ولا مفتاحٍ في الاستجابة أو السجلّ (رموزٌ عامّة فقط). `Cache-Control: no-store`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { aiDisabledResponse, enforceAiQuota } from "@/lib/governance/ai-quota.server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
import {
  FINN_LOCAL_ENGINE_HEADER,
  finnHasAnyEngine,
  openFinnChatStream,
  openFinnLocalReply,
} from "@/lib/finn-agent/engine.server";
import { FINN_IDENTITY } from "@/lib/finn-agent/identity";
import { FINN_LIMITS } from "@/lib/finn-agent/limits";
import { parseFinnRequestBody, type FinnRequestErrorCode } from "@/lib/finn-agent/messages";
import { finnNotFoundResponse, resolveFinnOwner } from "@/lib/finn-agent/owner-gate.server";
import { encodeFinnEvent } from "@/lib/finn-agent/stream-protocol";

const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
};

/** ردّ خطأٍ عربيّ محايد — رمزٌ آليّ ورسالة، بلا نصّ مزوّد ولا مصادقة. */
function finnError(status: number, code: string, messageAr: string, retryAfter?: number) {
  return new Response(JSON.stringify({ error: code, message_ar: messageAr }), {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "X-FINN-Engine": "none",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

/**
 * استجابة SSE واحدة للمسارين (الرد بنموذج والرد المحلّي): الأحداث تُرمَّز وتُبثّ، وإغلاق العميل
 * يستدعي `onCancel` (إلغاء نداء المحرّك). الترويسات الخاصّة بكل مسار تُمرَّر ولا تُبنى هنا.
 */
function sseResponse(
  events: AsyncIterable<Parameters<typeof encodeFinnEvent>[0]>,
  headers: Record<string, string>,
  onCancel: () => void,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Parameters<typeof encodeFinnEvent>[0]) => {
        try {
          controller.enqueue(encoder.encode(encodeFinnEvent(event)));
        } catch {
          /* أُغلق من جهة العميل. */
        }
      };
      try {
        for await (const event of events) {
          if (cancelled) break;
          send(event);
        }
      } catch {
        send({ type: "error", code: "engine_error" });
      } finally {
        try {
          controller.close();
        } catch {
          /* أُغلق من جهة العميل. */
        }
      }
    },
    cancel() {
      // العميل أوقف القراءة ⇒ يُلغى نداء المحرّك فلا يُنفَق على ما لن يُقرأ.
      cancelled = true;
      onCancel();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      ...headers,
    },
  });
}

const REQUEST_ERRORS_AR: Record<FinnRequestErrorCode, string> = {
  invalid_body: "صيغة الطلب غير صالحة.",
  empty: "لا يمكن إرسال رسالة فارغة.",
  too_many_messages: "عدد الرسائل أكبر من الحدّ المسموح. ابدأ محادثة جديدة.",
  message_too_long: "الرسالة أطول من الحدّ المسموح. اختصرها أو قسّمها.",
  too_large: "حجم المحادثة أكبر من الحدّ المسموح. ابدأ محادثة جديدة.",
  last_not_user: "آخر رسالة في الطلب يجب أن تكون من المستخدم.",
};

async function handlePost(request: Request, userId: string): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return finnError(415, "unsupported_media_type", "نوع الطلب غير صالح.");
  }
  const declared = Number(request.headers.get("content-length") || "0");
  if (declared > FINN_LIMITS.maxBodyBytes) {
    return finnError(413, "too_large", "حجم الطلب أكبر من الحدّ المسموح.");
  }

  // الفحص الثاني على النصّ الفعلي: جسمٌ مجزّأ بلا content-length لا يتجاوز الحدّ.
  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return finnError(400, "invalid_body", REQUEST_ERRORS_AR.invalid_body);
  }
  if (rawText.length > FINN_LIMITS.maxBodyBytes) {
    return finnError(413, "too_large", "حجم الطلب أكبر من الحدّ المسموح.");
  }
  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return finnError(400, "invalid_body", REQUEST_ERRORS_AR.invalid_body);
  }
  // `messages` وحدها تُقرأ؛ لا نموذج ولا موجِّه ولا ميزانية من العميل.
  const parsed = parseFinnRequestBody(body);
  if (!parsed.ok) {
    return finnError(parsed.status, parsed.code, REQUEST_ERRORS_AR[parsed.code]);
  }

  // لا محرّك مهيّأ أصلًا ⇒ طبقة «لا يتعطل»: ردٌّ محلّيٌّ حتميّ بلا نموذج، ولا حدّ يُنفَق ولا
  // حصّة تُستهلك. (كان 503 no_engine.) تقع بعد بوّابة المالك ومفتاح الإيقاف وفحص الجسم، وقبل
  // الحدّ والحصّة.
  if (!finnHasAnyEngine()) {
    const local = await openFinnLocalReply(parsed.messages);
    return sseResponse(
      local.events,
      { "X-FINN-Engine": FINN_LOCAL_ENGINE_HEADER },
      () => undefined,
    );
  }

  // حدّ المعدّل — مفتاحٌ مستقلّ عن سَدِيد، يفشل مغلقًا.
  let rate: { allowed: boolean; unavailable?: boolean };
  try {
    rate = await enforceRateLimit(
      `${FINN_IDENTITY.rateLimitKey}:${userId}`,
      FINN_LIMITS.rateLimitPerMinute,
      FINN_LIMITS.rateLimitWindowSeconds,
    );
  } catch {
    rate = { allowed: false, unavailable: true };
  }
  if (rate.unavailable) {
    return finnError(
      503,
      "rate_limit_unavailable",
      "تعذّر التحقّق من حدّ الطلبات الآن. أعد المحاولة بعد قليل.",
      60,
    );
  }
  if (!rate.allowed) {
    return finnError(
      429,
      "finn_rate_limited",
      "طلبات كثيرة في وقتٍ قصير. انتظر دقيقة ثم أعد المحاولة.",
      60,
    );
  }

  // السقفان اليوميان (السطح والهوية) قبل أي نداء نموذج؛ يفشلان مغلقين. وسطح `finn`
  // مستقلٌّ عن `chat` العامّ بدلوَيه وسقفَيه، فلا يستنفد زوّارُ سَدِيد حصّةَ المالك (W5 #2).
  const quota = await enforceAiQuota({
    surface: "finn",
    identity: `${FINN_IDENTITY.quotaIdentityPrefix}:${userId}`,
    deadlineMs: 2_000,
  });
  if (quota) return quota;

  // ── المحرّك: GPT أوّلًا، والاحتياط معلَن. ──
  const cancel = new AbortController();
  const signal = AbortSignal.any([request.signal, cancel.signal]);
  let opened: Awaited<ReturnType<typeof openFinnChatStream>>;
  try {
    opened = await openFinnChatStream(parsed.messages, signal);
  } catch {
    // البوّابة الداخلية للمحرّك (مفتاح الإيقاف) أو عطلٌ غير متوقَّع قبل أي ردّ.
    const off = aiDisabledResponse("finn");
    return (
      off ?? finnError(502, "engine_unavailable", "تعذّر الحصول على ردّ الآن. أعد المحاولة.", 5)
    );
  }

  if (!opened.ok) {
    switch (opened.code) {
      case "timeout":
        return finnError(504, "engine_timeout", "انتهت مهلة المحرّك دون ردّ. أعد المحاولة.", 5);
      case "no_engine":
        return finnError(503, "no_engine", "لم يُهيَّأ أي محرّك لفِن على الخادم بعد.", 60);
      case "aborted":
        return finnError(408, "aborted", "أُلغي الطلب.");
      case "bad_request":
      case "engine_error":
        return finnError(
          502,
          "engine_unavailable",
          "تعذّر الحصول على ردّ من المحرّكين الآن. أعد المحاولة بعد قليل.",
          5,
        );
    }
  }

  const { engine, fallback, events } = opened;
  return sseResponse(
    events,
    {
      // الإفصاح: المحرّك الذي أجاب فعلًا، وسبب سقوطه عن GPT إن سقط (رمزٌ عامّ).
      "X-FINN-Engine": engine,
      ...(fallback ? { "X-FINN-Fallback": fallback } : {}),
    },
    // العميل أوقف القراءة ⇒ يُلغى نداء المحرّك فلا يُنفَق على ما لن يُقرأ.
    () => cancel.abort(),
  );
}

export const Route = createFileRoute("/api/finn/chat")({
  server: {
    handlers: {
      // كل طريقةٍ غير POST ⇒ الـ404 نفسه: بدون `ANY` تردّ TanStack بصفحة SPA
      // لطرقٍ غير مذكورة، فيُكشف وجود المسار بـGET بسيط.
      ANY: async () => finnNotFoundResponse(),
      POST: async ({ request }: { request: Request }) => {
        // ① المالك وحده — قبل أي شيء. غير المالك: 404 متطابق، ولو كان الإيقاف مرفوعًا.
        const owner = await resolveFinnOwner(request);
        if (!owner.ok) return finnNotFoundResponse();
        // ② مفتاح الإيقاف الفوري — متزامن، قبل أي حدٍّ أو حصّةٍ أو نموذج.
        const off = aiDisabledResponse("finn");
        if (off) return off;
        return handlePost(request, owner.userId);
      },
    },
  },
});
