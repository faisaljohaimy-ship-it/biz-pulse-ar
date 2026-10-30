// @vitest-environment node
/**
 * قاطع n8n: فتحٌ بعد خمسة إخفاقاتٍ متتالية بلا فجوة > 60 ث، ثم فحصٌ واحد، وفشلُ الفحص يعيد الفتح.
 * ساعةٌ مزيّفة تُمرَّر إلى القاطع — لا مؤقّتات حقيقية.
 */
import { describe, expect, it } from "vitest";
import {
  type BreakerOptions,
  type BreakerSnapshot,
  CircuitBreaker,
  N8N_BREAKER_FAILURE_THRESHOLD,
  N8N_BREAKER_FAILURE_WINDOW_MS,
  N8N_BREAKER_OPEN_MS,
} from "./breaker";

function make() {
  const clock = { t: 1_000_000 };
  const opts: BreakerOptions = { now: () => clock.t };
  const b = new CircuitBreaker(opts);
  const fail = (times = 1, gap = 1_000) => {
    for (let i = 0; i < times; i++) {
      clock.t += gap;
      expect(b.tryAcquire()).toBe(true);
      b.recordFailure();
    }
  };
  return { b, clock, fail };
}

describe("القاطع — الثوابت من العقد", () => {
  it("5 إخفاقات · نافذة 60 ث · فتح 60 ث", () => {
    expect(N8N_BREAKER_FAILURE_THRESHOLD).toBe(5);
    expect(N8N_BREAKER_FAILURE_WINDOW_MS).toBe(60_000);
    expect(N8N_BREAKER_OPEN_MS).toBe(60_000);
  });
});

describe("القاطع — الفتح", () => {
  it("أربعة إخفاقات ⇒ مغلق؛ الخامس ⇒ مفتوح، والنداءات تُرفض بلا فحص", () => {
    const { b, fail } = make();
    fail(4);
    expect(b.state()).toBe("closed");
    expect(b.snapshot().consecutiveFailures).toBe(4);
    expect(b.tryAcquire()).toBe(true);
    b.recordFailure();
    expect(b.state()).toBe("open");
    expect(b.tryAcquire()).toBe(false);
    expect(b.tryAcquire()).toBe(false);
  });

  it("نجاحٌ بين الإخفاقات يصفّر السلسلة", () => {
    const { b, fail } = make();
    fail(4);
    b.tryAcquire();
    b.recordSuccess();
    expect(b.snapshot().consecutiveFailures).toBe(0);
    fail(4);
    expect(b.state()).toBe("closed");
  });

  it("فجوة أكبر من 60 ث بين إخفاقين تصفّر العدّ إلى واحد؛ وفجوة 60 ث بالضبط لا تصفّر", () => {
    const a = make();
    a.fail(4);
    a.fail(1, N8N_BREAKER_FAILURE_WINDOW_MS + 1);
    expect(a.b.snapshot().consecutiveFailures).toBe(1);
    expect(a.b.state()).toBe("closed");

    const c = make();
    c.fail(4);
    c.fail(1, N8N_BREAKER_FAILURE_WINDOW_MS);
    expect(c.b.snapshot().consecutiveFailures).toBe(5);
    expect(c.b.state()).toBe("open");
  });
});

describe("القاطع — الفحص الواحد", () => {
  function opened() {
    const m = make();
    m.fail(5);
    return m;
  }

  it("قبل انقضاء 60 ث: مفتوح؛ عندها: فحصٌ واحد يمرّ والباقون يُرفضون", () => {
    const { b, clock } = opened();
    clock.t += N8N_BREAKER_OPEN_MS - 1;
    expect(b.state()).toBe("open");
    expect(b.tryAcquire()).toBe(false);
    clock.t += 1;
    expect(b.state()).toBe("half-open");
    expect(b.tryAcquire()).toBe(true); // الفحص
    expect(b.tryAcquire()).toBe(false);
    expect(b.tryAcquire()).toBe(false);
  });

  it("نجاح الفحص يغلق ويصفّر ويسمح للجميع", () => {
    const { b, clock } = opened();
    clock.t += N8N_BREAKER_OPEN_MS;
    expect(b.tryAcquire()).toBe(true);
    b.recordSuccess();
    expect(b.state()).toBe("closed");
    const snap: BreakerSnapshot = b.snapshot();
    expect(snap).toMatchObject({ consecutiveFailures: 0, openedAt: null });
    expect(b.tryAcquire()).toBe(true);
    expect(b.tryAcquire()).toBe(true);
  });

  it("فشل الفحص يعيد الفتح نافذةً كاملة من لحظة فشله — ولو كانت الفجوة أطول بكثير من 60 ث", () => {
    const { b, clock } = opened();
    clock.t += 5 * N8N_BREAKER_OPEN_MS; // فجوة أطول بكثير من نافذة الفشل
    expect(b.tryAcquire()).toBe(true);
    b.recordFailure();
    expect(b.state()).toBe("open");
    expect(b.snapshot().consecutiveFailures).toBe(6); // لم يُصفَّر بالفجوة
    clock.t += N8N_BREAKER_OPEN_MS - 1;
    expect(b.tryAcquire()).toBe(false);
    clock.t += 1;
    expect(b.tryAcquire()).toBe(true); // فحصٌ ثانٍ بعد نافذة كاملة، لا قبلها
  });

  it("فحصٌ بعد فحص: دورة فشل ثم نجاح", () => {
    const { b, clock } = opened();
    for (let i = 0; i < 3; i++) {
      clock.t += N8N_BREAKER_OPEN_MS;
      expect(b.tryAcquire()).toBe(true);
      b.recordFailure();
      expect(b.tryAcquire()).toBe(false);
    }
    clock.t += N8N_BREAKER_OPEN_MS;
    expect(b.tryAcquire()).toBe(true);
    b.recordSuccess();
    expect(b.state()).toBe("closed");
  });
});

describe("نسختان منفصلتان: سَدِيد وFNN", () => {
  it("فتح قاطع لا يمسّ الآخر", () => {
    const clock = { t: 5_000 };
    const sadeed = new CircuitBreaker({ now: () => clock.t });
    const fnn = new CircuitBreaker({ now: () => clock.t });
    for (let i = 0; i < 5; i++) {
      clock.t += 1_000;
      sadeed.tryAcquire();
      sadeed.recordFailure();
    }
    expect(sadeed.state()).toBe("open");
    expect(sadeed.tryAcquire()).toBe(false);
    expect(fnn.state()).toBe("closed");
    expect(fnn.tryAcquire()).toBe(true);
  });
});
