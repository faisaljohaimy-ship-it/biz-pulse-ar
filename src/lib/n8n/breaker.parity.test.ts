// @vitest-environment node
/**
 * تطابق دلالات القاطع: `CircuitBreaker` (n8n) مقابل قاطع ذراع HCIS الحيّة (`hcisState`).
 *
 * الطلب: «أبقِ الدلالات متطابقة كي يكون السلوك متوقَّعًا». فلا يكفي أن نكتب القاطع على شكله؛
 * هذا اختبارٌ تفاضلي يشغّل **التسلسلات الزمنية نفسها** على القاطعين بساعةٍ مزيّفة ويقارن في كل
 * خطوة: هل وصل النداء إلى المصدر أم رُفض؟ حالة القاطع؟ عدّاد الإخفاقات المتتالية؟
 *
 * الشروط التي تجعل المقارنة عادلة:
 * - الفجوة بين خطوتين ≥ 30,001 مللي ثانية: الكاش السالب في ذراع HCIS (30 ث) لا يحجب شيئًا،
 *   فيبقى القاطع وحده هو الفاصل. (الكاش السالب خاصّ بتلك الذراع؛ لقناة n8n كاشها المستقل.)
 * - الإخفاق يسبق النجاح: النجاح يخزّن لقطةً تخدم 5 دقائق بلا قاطع في ذراع HCIS، فينتهي التسلسل به.
 *
 * ولأنه عشوائيٌّ بذرةً ثابتة، يعدّ الاختبار الحالات التي بلغها (فتح · فحص فاشل · فحص ناجح ·
 * تصفير بفجوة) ويشترط أن تكون كلها غير صفر — اختبارٌ لا يبلغ الحالات المهمة اختبارٌ فارغ.
 */
import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hcisLiveArm,
  hcisLiveArmState,
  HCIS_BREAKER_FAILURE_THRESHOLD,
  HCIS_BREAKER_FAILURE_WINDOW_MS,
  HCIS_BREAKER_OPEN_MS,
  resetLexicalArmsStateForTests,
} from "@/lib/sadeed/rag/lexical-arms.server";
import {
  CircuitBreaker,
  N8N_BREAKER_FAILURE_THRESHOLD,
  N8N_BREAKER_FAILURE_WINDOW_MS,
  N8N_BREAKER_OPEN_MS,
} from "./breaker";

const GAPS = [30_001, 45_000, 60_000, 60_001, 90_000, 125_000];

/** مولّد حتمي (LCG) — البذرة ثابتة فالاختبار يتكرّر بالبايت. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

describe("ثوابت القاطعين متساوية", () => {
  it("العتبة · نافذة الفشل · مدة الفتح", () => {
    expect(N8N_BREAKER_FAILURE_THRESHOLD).toBe(HCIS_BREAKER_FAILURE_THRESHOLD);
    expect(N8N_BREAKER_FAILURE_WINDOW_MS).toBe(HCIS_BREAKER_FAILURE_WINDOW_MS);
    expect(N8N_BREAKER_OPEN_MS).toBe(HCIS_BREAKER_OPEN_MS);
  });
});

describe("تسلسلات عشوائية بذرةً ثابتة: القاطعان يتفقان في كل خطوة", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T10:00:00Z"));
    resetLexicalArmsStateForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    resetLexicalArmsStateForTests();
  });

  it("400 تسلسلًا × حتى 16 خطوة", async () => {
    const rnd = lcg(20261030);
    const cov = { opened: 0, probeFailed: 0, probeSucceeded: 0, windowReset: 0, rejected: 0 };
    let reads = 0;
    let failNext = true;
    const client = {
      from: () => ({
        select: () => {
          reads += 1;
          return Promise.resolve(
            failNext
              ? { data: null, error: { code: "57014", message: "canceling statement" } }
              : { data: [], error: null },
          );
        },
      }),
    };
    const arm = hcisLiveArm(client);
    const ctx = { orgId: null, audience: "anonymous" } as const;

    for (let seq = 0; seq < 400; seq++) {
      resetLexicalArmsStateForTests();
      const mine = new CircuitBreaker({ now: () => Date.now() });
      const steps = 6 + Math.floor(rnd() * 11);
      let lastFailureAt: number | null = null;
      let wasOpen = false;

      for (let i = 0; i < steps; i++) {
        vi.advanceTimersByTime(GAPS[Math.floor(rnd() * GAPS.length)]);
        // النجاح يخزّن لقطة HCIS 5 دقائق، فهو الخطوة الأخيرة في التسلسل لا أوسطه.
        const last = i === steps - 1;
        const succeed = last && rnd() < 0.5;
        failNext = !succeed;

        const before = reads;
        await arm.run("الأسوار", ctx, 1_500);
        const theirReached = reads > before;
        const myReached = mine.tryAcquire();

        const stateBefore = mine.state();
        if (myReached) {
          if (succeed) mine.recordSuccess();
          else {
            const now = Date.now();
            if (
              wasOpen === false &&
              lastFailureAt !== null &&
              now - lastFailureAt > N8N_BREAKER_FAILURE_WINDOW_MS
            ) {
              cov.windowReset += 1;
            }
            mine.recordFailure();
            lastFailureAt = now;
          }
        } else {
          cov.rejected += 1;
        }

        expect(myReached, `تسلسل ${seq} خطوة ${i}: وصول النداء`).toBe(theirReached);
        expect(mine.state(), `تسلسل ${seq} خطوة ${i}: الحالة`).toBe(hcisLiveArmState().breaker);
        expect(mine.snapshot().consecutiveFailures, `تسلسل ${seq} خطوة ${i}: العدّ`).toBe(
          hcisLiveArmState().consecutiveFailures,
        );
        if (succeed && myReached) {
          expect(mine.state()).toBe("closed");
          if (stateBefore === "half-open") cov.probeSucceeded += 1;
        }
        if (mine.state() === "open" && !wasOpen) cov.opened += 1;
        if (!succeed && stateBefore === "half-open" && myReached) cov.probeFailed += 1;
        wasOpen = mine.state() !== "closed";
      }
    }

    if (process.env.N8N_PARITY_OUT) writeFileSync(process.env.N8N_PARITY_OUT, JSON.stringify(cov));

    // لا يصحّ التطابق إن لم يبلغ الاختبارُ الحالات المهمة فعلًا.
    expect(cov.opened).toBeGreaterThan(20);
    expect(cov.probeFailed).toBeGreaterThan(5);
    expect(cov.probeSucceeded).toBeGreaterThan(3);
    expect(cov.windowReset).toBeGreaterThan(10);
    expect(cov.rejected).toBeGreaterThan(20);
  });
});
