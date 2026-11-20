// @vitest-environment node
/** لقطة الحالة: ما لم يُقَس `null` لا صفر، وp95 بالرتبة الأقرب من آخر 100 عيّنة ناجحة. */
import { describe, expect, it } from "vitest";
import { buildStatusSnapshot, LatencyWindow, type StatusInput } from "./status.server";

describe("LatencyWindow", () => {
  it("بلا عيّنات: p95 = null وcount = 0 (لا صفر)", () => {
    const w = new LatencyWindow();
    expect(w.p95()).toBeNull();
    expect(w.count).toBe(0);
  });

  it("عيّنة واحدة ⇒ هي نفسها", () => {
    const w = new LatencyWindow();
    w.record(240);
    expect(w.p95()).toBe(240);
  });

  it("الرتبة الأقرب: 1..100 ⇒ 95؛ و1..20 ⇒ 19", () => {
    const a = new LatencyWindow();
    for (let i = 1; i <= 100; i++) a.record(i);
    expect(a.p95()).toBe(95);
    const b = new LatencyWindow();
    for (let i = 1; i <= 20; i++) b.record(i);
    expect(b.p95()).toBe(19);
  });

  it("النافذة تنزلق: بعد 100 عيّنة تخرج الأقدم", () => {
    const w = new LatencyWindow(100);
    for (let i = 0; i < 100; i++) w.record(1_000);
    for (let i = 0; i < 100; i++) w.record(10);
    expect(w.count).toBe(100);
    expect(w.p95()).toBe(10);
  });

  it("قيمٌ غير صالحة (سالب · NaN · ∞) لا تدخل", () => {
    const w = new LatencyWindow();
    w.record(-1);
    w.record(Number.NaN);
    w.record(Number.POSITIVE_INFINITY);
    expect(w.count).toBe(0);
    expect(w.p95()).toBeNull();
  });

  it.each([Number.NaN, Infinity, -Infinity, -1, 1.5, 10_000])(
    "falls back to a bounded window for invalid capacity %s",
    (max) => {
      const w = new LatencyWindow(max);
      for (let i = 0; i < 1_200; i++) w.record(i);
      expect(w.count).toBe(100);
      expect(w.p95()).toBe(1_194);
    },
  );

  it("keeps finite custom capacities and zero-sized windows", () => {
    const bounded = new LatencyWindow(3);
    [10, 20, 30, 40].forEach((value) => bounded.record(value));
    expect(bounded.count).toBe(3);
    expect(bounded.p95()).toBe(40);

    const empty = new LatencyWindow(0);
    empty.record(125);
    expect(empty.count).toBe(0);
    expect(empty.p95()).toBeNull();
  });
});

describe("buildStatusSnapshot", () => {
  const base: Omit<StatusInput, "surface"> = {
    configured: true,
    disabled: false,
    mode: "all",
    breaker: "closed",
    lastOkAtMs: null,
    latencies: new LatencyWindow(),
  };

  it("معزول بارد: last_ok_at وp95_ms = null وsamples = 0", () => {
    expect(buildStatusSnapshot({ ...base, surface: "sadeed" })).toEqual({
      surface: "sadeed",
      configured: true,
      disabled: false,
      mode: "all",
      breaker: "closed",
      last_ok_at: null,
      p95_ms: null,
      samples: 0,
    });
  });

  it("بعد قياس: آخر نجاح ISO وp95 وعدد العيّنات", () => {
    const w = new LatencyWindow();
    [100, 200, 300].forEach((x) => w.record(x));
    const s = buildStatusSnapshot({
      ...base,
      surface: "sadeed",
      breaker: "half-open",
      lastOkAtMs: Date.parse("2026-10-30T10:00:00Z"),
      latencies: w,
    });
    expect(s).toMatchObject({
      breaker: "half-open",
      last_ok_at: "2026-10-30T10:00:00.000Z",
      p95_ms: 300,
      samples: 3,
    });
  });

  it("malformed last-success clocks stay unmeasured instead of crashing status", () => {
    for (const invalid of [NaN, Infinity, -Infinity, 8_640_000_000_000_001, undefined]) {
      const s = buildStatusSnapshot({
        ...base,
        surface: "sadeed",
        lastOkAtMs: invalid as number,
      });
      expect(s.last_ok_at).toBeNull();
      expect(s.samples).toBe(0);
    }
  });

  it("retains valid epoch zero as a real observation", () => {
    const s = buildStatusSnapshot({ ...base, surface: "sadeed", lastOkAtMs: 0 });
    expect(s.last_ok_at).toBe("1970-01-01T00:00:00.000Z");
  });

  it("سطح FNN: الوضع لا ينطبق ⇒ null", () => {
    expect(buildStatusSnapshot({ ...base, surface: "fnn" }).mode).toBeNull();
  });

  it("المفتاح المرفوع يظهر disabled حتى لو كان مهيّأً", () => {
    const s = buildStatusSnapshot({ ...base, surface: "sadeed", disabled: true });
    expect(s).toMatchObject({ configured: true, disabled: true });
  });
});
