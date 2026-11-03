// @vitest-environment node
/** سقف خطوات الأدوات — وحدةً. الإدماج في المعالج يُثبته `chat-step-cap.test.ts`. */
import { describe, expect, it } from "vitest";
import {
  MAX_STEPS_DEEP,
  MAX_STEPS_TEXT_DEFAULT,
  maxStepsFor,
} from "@/lib/sadeed/llm/turn-limits.server";

describe("maxStepsFor", () => {
  it("الافتراض: 4 للنص والصوت، 8 للعميق", () => {
    expect(maxStepsFor("text", {})).toBe(4);
    expect(maxStepsFor("voice", {})).toBe(4);
    expect(maxStepsFor("deep", {})).toBe(8);
    expect(MAX_STEPS_TEXT_DEFAULT).toBe(4);
    expect(MAX_STEPS_DEEP).toBe(8);
  });

  it("SADEED_MAX_STEPS_TEXT (2..8) يتجاوز النص والصوت وحدهما", () => {
    for (let n = 2; n <= 8; n++) {
      const env = { SADEED_MAX_STEPS_TEXT: String(n) };
      expect(maxStepsFor("text", env), `text/${n}`).toBe(n);
      expect(maxStepsFor("voice", env), `voice/${n}`).toBe(n);
      expect(maxStepsFor("deep", env), `deep/${n}`).toBe(8);
    }
    expect(maxStepsFor("text", { SADEED_MAX_STEPS_TEXT: " 6 " })).toBe(6);
  });

  it("ما خرج عن النطاق أو لم يكن عددًا صحيحًا خالصًا يُهمَل (4) — لا يُقصّ", () => {
    for (const bad of [
      "0",
      "1",
      "9",
      "10",
      "99",
      "-3",
      "4.5",
      "4e0",
      "0x4",
      "abc",
      "",
      "  ",
      "٤",
      "04x",
    ]) {
      expect(maxStepsFor("text", { SADEED_MAX_STEPS_TEXT: bad }), JSON.stringify(bad)).toBe(4);
    }
  });

  it("يُقرأ عند كل نداء", () => {
    const env: Record<string, string | undefined> = {};
    expect(maxStepsFor("text", env)).toBe(4);
    env.SADEED_MAX_STEPS_TEXT = "7";
    expect(maxStepsFor("text", env)).toBe(7);
    delete env.SADEED_MAX_STEPS_TEXT;
    expect(maxStepsFor("text", env)).toBe(4);
  });
});
