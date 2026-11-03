/**
 * مهلة الدور الصامتة — حارس F1 (تقرير السرعة، ٢٠٢٦/١١/٠٣).
 *
 * ## العطل
 *
 * مؤقّت صلب 30 ث في `sadeedAuthedFetch` يُجهض الطلب بـ`AbortError`؛ وحزمة `ai`
 * تعامل `AbortError` إيقافًا من المستخدم فتضبط الحالة `ready` **بلا خطأ**
 * (`node_modules/ai/dist/index.mjs` ~14683) — فيختفي «سَدِيد يفكّر…» بلا ردٍّ
 * ولا رسالة ولا إعادة. والخادم يقطع الدور عند 45 ث (75 ث للعميق) لا 30.
 *
 * ## ما يحرسه هذا الملف (على `Chat` الحقيقية من `@ai-sdk/react` لا على محاكاتها)
 *
 *  ① انتهاء المهلة ⇒ `status === "error"` (لا `ready`) و`chat.error.message` رمزٌ
 *    يصير جملةً عربية صادقة، ولا يُرى فيها رمزٌ تقنيّ ولا عبارة مصادقة.
 *  ② لا إعادة تلقائية على مستوى الناقل: نداء `fetch` واحد.
 *  ③ Stop يبقى إيقافًا هادئًا: `ready` بلا خطأ.
 *
 * المادة ٣٠: كلٌّ منها يحمرّ فعلًا حين يُنزع الإصلاح (يُرمى `AbortError` من
 * المؤقّت) — جُرِّب ذلك ونُقل نتيجته في تقرير الالتزام.
 */
import { Chat } from "@ai-sdk/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import {
  CHAT_TIMEOUT_AR,
  CHAT_TIMEOUT_CODE,
  chatErrorText,
  isChatTimeout,
} from "./chat-error-text";
import { CHAT_DEADLINE_MS, createSadeedTransport } from "./sadeed-service";

/** fetch لا يردّ أبدًا إلا برفضٍ بسبب الإشارة — كما يفعل المتصفح مع `abort()`. */
function stubHangingFetch() {
  const fetchMock = vi.fn(
    (_input: unknown, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("مهلة الدور على Chat الحقيقية", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("المهلة ⇒ status=error لا ready، ورسالة عربية صادقة، وبلا إعادة تلقائية", async () => {
    const fetchMock = stubHangingFetch();
    const chat = new Chat({ transport: createSadeedTransport() });
    void chat.sendMessage({ text: "حلّل لي مؤشرات الأسبوع" });

    await vi.advanceTimersByTimeAsync(0);
    expect(chat.status).toBe("submitted");

    // فوق 30 ث القديمة: ما زال الطلب حيًّا ولا خطأ.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(chat.status).toBe("submitted");
    expect(chat.error).toBeUndefined();

    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS - 30_000);

    expect(chat.status).toBe("error");
    expect(isChatTimeout(chat.error)).toBe(true);
    expect(chat.error?.message).toBe(CHAT_TIMEOUT_CODE);

    const shown = chatErrorText(chat.error?.message);
    expect(shown).toBe(CHAT_TIMEOUT_AR);
    expect(shown).toMatch(/[؀-ۿ]/);
    expect(shown).toMatch(/أطول من المعتاد/);
    expect(shown).not.toMatch(/authenticat|unauthor|token|chat_timeout/i);

    // الناقل لا يعيد الدور وحده، ولو مرّ وقتٌ طويل.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(chat.status).toBe("error");
  });

  it("Stop أثناء الانتظار ⇒ ready بلا خطأ (إيقاف هادئ)، وليس مهلةً", async () => {
    stubHangingFetch();
    const chat = new Chat({ transport: createSadeedTransport() });
    void chat.sendMessage({ text: "سؤال" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(chat.status).toBe("submitted");

    await chat.stop();
    await vi.advanceTimersByTimeAsync(0);

    expect(chat.status).toBe("ready");
    expect(chat.error).toBeUndefined();
    // ولا مهلة متأخرة تقلب الإيقاف خطأً بعد ذلك.
    await vi.advanceTimersByTimeAsync(CHAT_DEADLINE_MS);
    expect(chat.status).toBe("ready");
    expect(chat.error).toBeUndefined();
  });
});
