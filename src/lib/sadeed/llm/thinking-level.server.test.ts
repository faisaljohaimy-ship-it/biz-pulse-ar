// @vitest-environment node
/**
 * مستوى التفكير — وحدةً: القرار، البيئة، التعطيل المؤقت، وتمييز رفض الخيار نفسه.
 * الإدماج في المعالج يُثبته `src/routes/api/chat-thinking.test.ts`.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  googleThinkingOptions,
  isThinkingOptionRejection,
  resolveThinkingLevel,
  resetThinkingStateForTests,
  suspendThinking,
  thinkingSuspended,
  THINKING_SUSPEND_MS,
  THINKING_VENDOR,
} from "@/lib/sadeed/llm/thinking-level.server";

beforeEach(() => resetThinkingStateForTests());

describe("resolveThinkingLevel", () => {
  it("الافتراض (المرحلة ١): غياب المتغيّر ⇒ لا خيار = السلوك القديم، حتى لـGemini", () => {
    expect(resolveThinkingLevel(THINKING_VENDOR, {})).toBeNull();
    expect(resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: undefined })).toBeNull();
  });

  it("لا خيار لغير Gemini: المحوّل الاختياري والاحتياطي", () => {
    for (const vendor of ["openai", "lovable-gateway", "anthropic", ""]) {
      expect(resolveThinkingLevel(vendor, {}), vendor).toBeNull();
      // ولا التجاوز بالبيئة يفتح الباب لغيره.
      expect(resolveThinkingLevel(vendor, { SADEED_THINKING_LEVEL: "high" }), vendor).toBeNull();
    }
  });

  it("SADEED_THINKING_LEVEL = minimal|low|medium|high يفعّل المستوى المطلوب، بلا حساسية لحالة الأحرف", () => {
    for (const level of ["minimal", "low", "medium", "high"] as const) {
      expect(resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: level }), level).toBe(
        level,
      );
    }
    expect(resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: " HIGH " })).toBe("high");
  });

  it("default = لا خيار = السلوك القديم", () => {
    expect(resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: "default" })).toBeNull();
    expect(
      resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: " Default " }),
    ).toBeNull();
  });

  it("قيمةٌ مجهولة أو فارغة تُعامَل كغائبة: لا خيار (لا تفعيل بالتخمين)", () => {
    for (const bad of ["turbo", "", "  ", "0", "none", "off", "lowest", "mediumm"]) {
      expect(
        resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: bad }),
        JSON.stringify(bad),
      ).toBeNull();
    }
  });

  it("يُقرأ عند كل نداء: تعديل البيئة بين نداءين يظهر فورًا", () => {
    const env: Record<string, string | undefined> = {};
    expect(resolveThinkingLevel(THINKING_VENDOR, env)).toBeNull();
    env.SADEED_THINKING_LEVEL = "high";
    expect(resolveThinkingLevel(THINKING_VENDOR, env)).toBe("high");
    env.SADEED_THINKING_LEVEL = "default";
    expect(resolveThinkingLevel(THINKING_VENDOR, env)).toBeNull();
    env.SADEED_THINKING_LEVEL = "low";
    expect(resolveThinkingLevel(THINKING_VENDOR, env)).toBe("low");
  });
});

describe("التعطيل المؤقت (10 دقائق في المعزول)", () => {
  const ON = { SADEED_THINKING_LEVEL: "low" };

  it("بعد suspendThinking لا خيار حتى تنقضي المدّة، ثم يعود المستوى المضبوط", () => {
    const t0 = 1_000_000;
    expect(thinkingSuspended(t0)).toBe(false);
    expect(resolveThinkingLevel(THINKING_VENDOR, ON, t0)).toBe("low");
    suspendThinking(t0);
    expect(resolveThinkingLevel(THINKING_VENDOR, ON, t0 + 1)).toBeNull();
    expect(resolveThinkingLevel(THINKING_VENDOR, ON, t0 + THINKING_SUSPEND_MS - 1)).toBeNull();
    expect(resolveThinkingLevel(THINKING_VENDOR, ON, t0 + THINKING_SUSPEND_MS)).toBe("low");
    expect(THINKING_SUSPEND_MS).toBe(600_000);
  });

  it("التعطيل يسبق تجاوز البيئة (المزوّد رفض فلا نُصرّ)", () => {
    suspendThinking(0);
    expect(resolveThinkingLevel(THINKING_VENDOR, { SADEED_THINKING_LEVEL: "high" }, 1)).toBeNull();
  });
});

describe("googleThinkingOptions", () => {
  it("الشكل المطلوب حرفًا، بلا إظهار الأفكار", () => {
    expect(googleThinkingOptions("low")).toEqual({
      google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: false } },
    });
  });
});

describe("isThinkingOptionRejection — رفض الخيار نفسه فقط", () => {
  const apiError = (statusCode: number, message: string, responseBody?: string) =>
    Object.assign(new Error(message), { name: "AI_APICallError", statusCode, responseBody });

  it("400 يذكر thinking (في الرسالة أو جسم الخطأ) ⇒ نعم", () => {
    expect(
      isThinkingOptionRejection(
        apiError(400, "Unable to submit request: thinking_level is invalid"),
      ),
    ).toBe(true);
    expect(
      isThinkingOptionRejection(
        apiError(
          400,
          "Bad Request",
          '{"error":{"code":400,"message":"thinkingConfig.thinkingLevel not supported","status":"INVALID_ARGUMENT"}}',
        ),
      ),
    ).toBe(true);
    expect(
      isThinkingOptionRejection(apiError(400, 'Unknown name "thinkingConfig": Cannot find field')),
    ).toBe(true);
  });

  it("بلا رمز: INVALID_ARGUMENT أو 400 في النصّ مع ذكر الحقل ⇒ نعم", () => {
    expect(
      isThinkingOptionRejection(new Error("INVALID_ARGUMENT: thinking level unsupported")),
    ).toBe(true);
    expect(isThinkingOptionRejection(new Error("400 thinking config rejected"))).toBe(true);
    expect(
      isThinkingOptionRejection(new Error("INVALID_ARGUMENT: thinking_budget is invalid")),
    ).toBe(true);
  });

  it("يلزم ذكر الحقل بعينه: كل صيغ الحقل المعتمدة مع 400 ⇒ نعم", () => {
    for (const field of [
      "thinkingLevel",
      "thinking_level",
      "thinkingConfig",
      "thinking_config",
      "thinking_budget",
      "thinkingBudget",
    ]) {
      expect(isThinkingOptionRejection(apiError(400, `Invalid value at '${field}'`)), field).toBe(
        true,
      );
    }
  });

  it("400 يذكر «thinking» عرضًا (بلا ذكر الحقل) ليس رفضًا للخيار", () => {
    // تجاوز السياق: رموز التفكير تُحتسب لكنّ الخيار لم يُرفض.
    expect(
      isThinkingOptionRejection(
        apiError(400, "input token count + thinking tokens exceed the context window"),
      ),
    ).toBe(false);
    expect(isThinkingOptionRejection(apiError(400, "Unsupported MIME type: thinking/x"))).toBe(
      false,
    );
    expect(
      isThinkingOptionRejection(
        apiError(
          400,
          "Bad Request",
          '{"error":{"message":"thinking output is too long","status":"INVALID_ARGUMENT"}}',
        ),
      ),
    ).toBe(false);
    // بلا رمز: INVALID_ARGUMENT يذكر الكلمة وحدها.
    expect(isThinkingOptionRejection(new Error("INVALID_ARGUMENT: thinking tokens exceed"))).toBe(
      false,
    );
  });

  it("RetryError يلفّ الرفض: يُفحص lastError و cause", () => {
    const rejected = apiError(
      400,
      "Bad Request",
      '{"error":{"message":"Unknown name \\"thinkingConfig\\": Cannot find field.","status":"INVALID_ARGUMENT"}}',
    );
    const retryError = Object.assign(
      new Error("Failed after 3 attempts. Last error: Bad Request"),
      {
        name: "AI_RetryError",
        reason: "maxRetriesExceeded",
        lastError: rejected,
        errors: [rejected],
      },
    );
    expect(isThinkingOptionRejection(retryError)).toBe(true);
    const caused = Object.assign(new Error("wrapped"), { cause: rejected });
    expect(isThinkingOptionRejection(caused)).toBe(true);
    // RetryError يلفّ 400 لا يتعلّق بالتفكير، أو 429 يذكر الحقل ⇒ لا.
    for (const inner of [
      apiError(400, "Request payload size exceeds the limit"),
      apiError(400, "input + thinking tokens exceed the context window"),
      apiError(429, "RESOURCE_EXHAUSTED thinkingConfig quota"),
    ]) {
      const wrapped = Object.assign(new Error("Failed after 3 attempts"), {
        name: "AI_RetryError",
        lastError: inner,
      });
      expect(isThinkingOptionRejection(wrapped)).toBe(false);
    }
    // دورة cause لا تعلّق ولا ترمي.
    const loop: { cause?: unknown } = new Error("loop");
    loop.cause = loop;
    expect(isThinkingOptionRejection(loop)).toBe(false);
  });

  it("إلغاءٌ أو مهلةٌ داخل RetryError ليسا رفضًا ولو ذكرا الحقل", () => {
    const aborted = Object.assign(new Error("thinkingConfig aborted"), { name: "AbortError" });
    expect(
      isThinkingOptionRejection(
        Object.assign(new Error("Failed after 3 attempts"), { lastError: aborted }),
      ),
    ).toBe(false);
  });

  it("لا يسقط على غير الرفض: 429 · 5xx · 401 · 403 · 404 — ولو ذكرت الرسالة thinking", () => {
    for (const status of [429, 500, 502, 503, 504, 401, 403, 404]) {
      expect(
        isThinkingOptionRejection(
          apiError(status, "thinking tokens quota exceeded, thinking_level"),
        ),
        String(status),
      ).toBe(false);
    }
    // الرمز في النصّ لا في الحقل.
    expect(isThinkingOptionRejection(new Error("503 service unavailable (thinking backend)"))).toBe(
      false,
    );
    expect(isThinkingOptionRejection(new Error("429 RESOURCE_EXHAUSTED thinking quota"))).toBe(
      false,
    );
  });

  it("رقمٌ من ثلاث خانات في النصّ ليس رمز حالة: «thinking budget 512» بلا رمز ⇒ يُحكم بـINVALID_ARGUMENT", () => {
    expect(
      isThinkingOptionRejection(
        new Error("INVALID_ARGUMENT: thinking budget 512 is not supported"),
      ),
    ).toBe(true);
    expect(isThinkingOptionRejection(new Error("thinking budget 512 is not supported"))).toBe(
      false,
    );
  });

  it("400 لا يتعلّق بالتفكير ⇒ لا", () => {
    expect(isThinkingOptionRejection(apiError(400, "Request payload size exceeds the limit"))).toBe(
      false,
    );
    expect(
      isThinkingOptionRejection(
        apiError(400, "Invalid JSON payload", '{"error":{"status":"INVALID_ARGUMENT"}}'),
      ),
    ).toBe(false);
  });

  it("الإلغاء والمهلة ليسا رفضًا", () => {
    expect(
      isThinkingOptionRejection(
        Object.assign(new Error("thinking aborted"), { name: "AbortError" }),
      ),
    ).toBe(false);
    expect(
      isThinkingOptionRejection(
        Object.assign(new Error("thinking timed out"), { name: "TimeoutError" }),
      ),
    ).toBe(false);
  });

  it("قيمٌ غريبة لا ترمي", () => {
    for (const v of [undefined, null, 42, "thinking 400", {}, { message: "thinking" }]) {
      expect(() => isThinkingOptionRejection(v)).not.toThrow();
    }
    expect(isThinkingOptionRejection("thinking 400 invalid_argument")).toBe(false);
    expect(isThinkingOptionRejection("thinkingConfig 400 invalid_argument")).toBe(true);
    expect(isThinkingOptionRejection(null)).toBe(false);
  });
});
