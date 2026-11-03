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
  it("الافتراض: low للنص والصوت، medium للعميق — لـGemini وحده", () => {
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", {})).toBe("low");
    expect(resolveThinkingLevel(THINKING_VENDOR, "voice", {})).toBe("low");
    expect(resolveThinkingLevel(THINKING_VENDOR, "deep", {})).toBe("medium");
  });

  it("لا خيار لغير Gemini: المحوّل الاختياري والاحتياطي", () => {
    for (const vendor of ["openai", "lovable-gateway", "anthropic", ""]) {
      for (const mode of ["text", "voice", "deep"]) {
        expect(resolveThinkingLevel(vendor, mode, {}), `${vendor}/${mode}`).toBeNull();
      }
      // ولا التجاوز بالبيئة يفتح الباب لغيره.
      expect(resolveThinkingLevel(vendor, "text", { SADEED_THINKING_LEVEL: "high" })).toBeNull();
    }
  });

  it("SADEED_THINKING_LEVEL يتجاوز الافتراضين لكل الأوضاع، بلا حساسية لحالة الأحرف", () => {
    for (const level of ["minimal", "low", "medium", "high"] as const) {
      for (const mode of ["text", "voice", "deep"]) {
        expect(
          resolveThinkingLevel(THINKING_VENDOR, mode, { SADEED_THINKING_LEVEL: level }),
          `${level}/${mode}`,
        ).toBe(level);
      }
    }
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", { SADEED_THINKING_LEVEL: " HIGH " })).toBe(
      "high",
    );
  });

  it("default = لا خيار = السلوك القديم (حتى للعميق)", () => {
    for (const mode of ["text", "voice", "deep"]) {
      expect(
        resolveThinkingLevel(THINKING_VENDOR, mode, { SADEED_THINKING_LEVEL: "default" }),
      ).toBeNull();
    }
  });

  it("قيمةٌ مجهولة أو فارغة تُعامَل كغائبة: يعود الافتراض لا التعطيل", () => {
    for (const bad of ["turbo", "", "  ", "0", "none", "off"]) {
      expect(
        resolveThinkingLevel(THINKING_VENDOR, "text", { SADEED_THINKING_LEVEL: bad }),
        bad,
      ).toBe("low");
    }
  });

  it("يُقرأ عند كل نداء: تعديل البيئة بين نداءين يظهر فورًا", () => {
    const env: Record<string, string | undefined> = {};
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", env)).toBe("low");
    env.SADEED_THINKING_LEVEL = "high";
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", env)).toBe("high");
    env.SADEED_THINKING_LEVEL = "default";
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", env)).toBeNull();
  });
});

describe("التعطيل المؤقت (10 دقائق في المعزول)", () => {
  it("بعد suspendThinking لا خيار حتى تنقضي المدّة، ثم يعود", () => {
    const t0 = 1_000_000;
    expect(thinkingSuspended(t0)).toBe(false);
    suspendThinking(t0);
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", {}, t0 + 1)).toBeNull();
    expect(
      resolveThinkingLevel(THINKING_VENDOR, "deep", {}, t0 + THINKING_SUSPEND_MS - 1),
    ).toBeNull();
    expect(resolveThinkingLevel(THINKING_VENDOR, "text", {}, t0 + THINKING_SUSPEND_MS)).toBe("low");
    expect(THINKING_SUSPEND_MS).toBe(600_000);
  });

  it("التعطيل يسبق تجاوز البيئة (المزوّد رفض فلا نُصرّ)", () => {
    suspendThinking(0);
    expect(
      resolveThinkingLevel(THINKING_VENDOR, "text", { SADEED_THINKING_LEVEL: "high" }, 1),
    ).toBeNull();
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

  it("بلا رمز: INVALID_ARGUMENT أو 400 في النصّ مع thinking ⇒ نعم", () => {
    expect(
      isThinkingOptionRejection(new Error("INVALID_ARGUMENT: thinking level unsupported")),
    ).toBe(true);
    expect(isThinkingOptionRejection(new Error("400 thinking config rejected"))).toBe(true);
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
    expect(isThinkingOptionRejection("thinking 400 invalid_argument")).toBe(true);
    expect(isThinkingOptionRejection(null)).toBe(false);
  });
});
