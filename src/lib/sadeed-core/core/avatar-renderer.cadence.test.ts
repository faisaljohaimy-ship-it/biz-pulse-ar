/**
 * عارض الأفاتار — إيقاعٌ بالطلب لا حلقةٌ أبدية (P0 ٢٠٢٦/١٠/١٤، سفاري iOS).
 *
 * قِيس على محاكاة iPhone 14 Pro (‏DPR 3، ‎(pointer: coarse)‎) قبل الإصلاح: هذه
 * الحلقة تطلب إطارًا كل ‎~16ms‎ إلى الأبد (‎59.8‎ طلب/ث) ومستهلكوها كلّهم
 * تشخيصيّون. والعقد الذي يحرسه هذا الملف ثلاثة شروط **سلوكيّة** لا نصّية:
 *
 *   ١. بلا مشترك لا طلب إطار ولا مؤقّت — وأوّل اشتراك يوقظها، وآخر انسحاب يُنيمها.
 *   ٢. الصفحة المخفيّة لا تُحسب لها نبضة — وتعود عند الظهور.
 *   ٣. اللمس أو «قلّل الحركة» ⇐ ‎≤20‎ نبضة/ث بفاصلٍ ‎≥50ms‎ ولا طلب إطار معلّق
 *      بينها؛ وسطح المكتب **كما كان**: نبضةٌ لكل إطار عرض.
 *
 * ## المادة ٣٠ — كل حارسٍ هنا يُثبت أنّه يرى
 *
 * jsdom لا يُعلّق `requestAnimationFrame` في الصفحة المخفيّة ولا يعرف جهاز
 * إدخال، فالمحاكاة هنا صريحة: إطار عرضٍ كل ‎16ms‎ يُطلق كلّ المعلّق، ومؤقّتاتٌ
 * مزيّفة، وتفضيلاتٌ تُقلب بحدث `change` كما يفعل النظام. وأوّل بندٍ **كاشفٌ
 * يحمرّ**: سطح المكتب الظاهر بمشترك يعطي ‎≥55‎ نبضة/ث — فلو تعطّلت المحاكاة
 * (لا إطار يُطلق) لمرّت بنود «لا نبضة» كلّها أجوف.
 *
 * وقِيس احمرارها فعلًا على العارض قبل الإصلاح (‏b996d1e): ٩ بنود من ١١ حمراء،
 * وكلّها بتأكيدٍ سلوكيّ (‏64 طلب إطار بلا مشترك، 125 نبضة في ثانيتين على اللمس)
 * لا بغياب دالّة — عدا بند `cadence()` المخصّص. والأخضران عليه هما المقصودان:
 * الكاشف (سطح المكتب كما كان حرفًا)، و`stop()` (حارسُ تراجعٍ لسلوكٍ قائم).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avatarRenderer, type AvatarFrame } from "@/lib/sadeed-core/core/avatar-renderer";

const FRAME_MS = 16;
const COARSE = "(pointer: coarse)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/* ── إطار العرض ─────────────────────────────────────────────────────── */

let now = 0;
let rafSeq = 0;
let rafRequests = 0;
let rafQueue: Map<number, FrameRequestCallback>;

/* ── التفضيلات: تُقرأ حيًّا وتُقلب بحدث `change` ─────────────────────── */

const active = new Set<string>();
const mqListeners = new Map<string, Set<() => void>>();

function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const set = mqListeners.get(query) ?? new Set<() => void>();
      mqListeners.set(query, set);
      return {
        get matches() {
          return active.has(query);
        },
        media: query,
        onchange: null,
        addListener: (fn: () => void) => set.add(fn),
        removeListener: (fn: () => void) => set.delete(fn),
        addEventListener: (_: string, fn: () => void) => set.add(fn),
        removeEventListener: (_: string, fn: () => void) => set.delete(fn),
        dispatchEvent: () => false,
      };
    },
  });
}

function setMedia(query: string, on: boolean): void {
  if (on) active.add(query);
  else active.delete(query);
  for (const fn of [...(mqListeners.get(query) ?? [])]) fn();
}

/* ── الظهور ─────────────────────────────────────────────────────────── */

let hidden = false;

function setHidden(value: boolean): void {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
}

/* ── المشتركون: كل نبضة تُحصى بطابعها ────────────────────────────────── */

let ticks: number[];
let unsubs: Array<() => void>;

function subscribe(): () => void {
  let first = true;
  const off = avatarRenderer.subscribe((frame: AvatarFrame) => {
    // الاستدعاء الأوّل متزامنٌ عند الاشتراك بالإطار القائم — ليس نبضة.
    if (first) {
      first = false;
      return;
    }
    ticks.push(frame.ts);
  });
  unsubs.push(off);
  return off;
}

/** يمضي بالزمن: المؤقّتات أوّلًا ثم إطار العرض يُطلق كلّ المعلّق. */
function pump(ms: number): void {
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
    now += FRAME_MS;
    vi.advanceTimersByTime(FRAME_MS);
    const due = [...rafQueue.values()];
    rafQueue.clear();
    for (const cb of due) cb(now);
  }
}

function ticksIn(ms: number): number {
  const before = ticks.length;
  pump(ms);
  return ticks.length - before;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  now = 0;
  rafSeq = 0;
  rafRequests = 0;
  rafQueue = new Map();
  ticks = [];
  unsubs = [];
  active.clear();
  mqListeners.clear();
  hidden = false;
  document.documentElement.classList.remove("safe-mode");
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  installMatchMedia();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafSeq += 1;
    rafRequests += 1;
    rafQueue.set(rafSeq, cb);
    return rafSeq;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    rafQueue.delete(id);
  });
});

afterEach(() => {
  // العارض مفرد: فحصٌ يحمرّ قبل `stop()` يترك حلقةً حيّة للفحص التالي.
  for (const off of unsubs) off();
  avatarRenderer.stop();
  delete (document as unknown as { hidden?: boolean }).hidden;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("عارض الأفاتار — إيقاعٌ بالطلب لا حلقةٌ أبدية", () => {
  it("الكاشف يحمرّ: سطح المكتب الظاهر بمشترك — نبضةٌ لكل إطار عرض كما كان (المادة ٣٠)", () => {
    subscribe();
    avatarRenderer.start();
    const n = ticksIn(1000);
    // ‎1000/16 = 62‎ إطار عرض: لا يُفقد منها شيء على سطح المكتب.
    expect(n).toBeGreaterThanOrEqual(55);
  });

  it("بلا مشترك: لا طلب إطار ولا مؤقّت — والحلقة مسلَّحة لا عاملة", () => {
    avatarRenderer.start();
    pump(1000);
    expect(rafRequests, "طلب إطارًا ولا أحد يستهلكه").toBe(0);
    expect(vi.getTimerCount(), "مؤقّتٌ معلّق ولا أحد يستهلكه").toBe(0);
  });

  it("أوّل اشتراك يوقظها، وآخر انسحاب يُنيمها فورًا", () => {
    avatarRenderer.start();
    const off = subscribe();
    expect(ticksIn(160)).toBeGreaterThanOrEqual(8);

    off();
    // الطلب المعلّق لحظة الانسحاب يُلغى — لا نبضة يتيمة بعده.
    expect(rafQueue.size, "طلب إطار بقي معلّقًا بعد آخر انسحاب").toBe(0);
    const requested = rafRequests;
    expect(ticksIn(1000)).toBe(0);
    expect(rafRequests).toBe(requested);
  });

  it("الصفحة المخفيّة لا تُحسب لها نبضة ولا يُطلب لها إطار — وتعود عند الظهور", () => {
    subscribe();
    avatarRenderer.start();
    expect(ticksIn(160)).toBeGreaterThanOrEqual(8);

    setHidden(true);
    expect(rafQueue.size, "طلب إطار معلّق والصفحة مخفيّة").toBe(0);
    const requested = rafRequests;
    // jsdom يُطلق الإطارات والصفحة مخفيّة (المتصفّح لا يفعل) — فالحارس هنا
    // هو العارض نفسه لا المتصفّح.
    expect(ticksIn(2000)).toBe(0);
    expect(rafRequests).toBe(requested);
    expect(vi.getTimerCount()).toBe(0);

    setHidden(false);
    expect(ticksIn(160)).toBeGreaterThanOrEqual(8);
  });

  it.each([
    ["جهاز لمس", COARSE],
    ["«قلّل الحركة»", REDUCED_MOTION],
  ])("%s ⇐ ‎≤20‎ نبضة/ث بفاصلٍ ‎≥50ms‎ — والحلقة حيّة لا متجمّدة", (_name, query) => {
    setMedia(query, true);
    subscribe();
    avatarRenderer.start();
    pump(500); // استقرار
    const before = rafRequests;
    const n = ticksIn(2000);
    expect(n, "الإيقاع فوق ‎20‎ نبضة/ث").toBeLessThanOrEqual(40);
    expect(n, "الحلقة توقّفت بدل أن تُبطئ").toBeGreaterThanOrEqual(20);
    // كل نبضة تطلب إطار عرضٍ واحدًا لا أكثر: لا طلب معلّق بين نبضتين.
    expect(rafRequests - before).toBeLessThanOrEqual(n + 1);
    const recent = ticks.slice(-n);
    const gaps = recent.slice(1).map((t, i) => t - recent[i]);
    expect(Math.min(...gaps), "نبضتان أقرب من ‎50ms‎").toBeGreaterThanOrEqual(50);
  });

  it("بين نبضتين في الإيقاع المخفَّض: مؤقّتٌ وحده، لا طلب إطار معلّق", () => {
    setMedia(COARSE, true);
    subscribe();
    avatarRenderer.start();
    pump(500);
    // أمضِ حتى نبضةٍ جديدة ثم افحص الفجوة التي تليها مباشرة.
    const count = ticks.length;
    while (ticks.length === count) pump(FRAME_MS);
    expect(rafQueue.size, "طلب إطار معلّق في الفجوة — مؤقّت العرض لا يسكن").toBe(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("تبديل جهاز الإدخال أو تفضيل الحركة أثناء الجلسة ينفذ في الاتجاهين", () => {
    subscribe();
    avatarRenderer.start();
    expect(ticksIn(1000)).toBeGreaterThanOrEqual(55);

    setMedia(COARSE, true);
    pump(200);
    expect(ticksIn(1000)).toBeLessThanOrEqual(20);

    setMedia(COARSE, false);
    pump(200);
    expect(ticksIn(1000)).toBeGreaterThanOrEqual(55);
  });

  it("`stop()` لا يترك شيئًا معلّقًا ولا مستمعًا يوقظه", () => {
    setMedia(COARSE, true);
    subscribe();
    avatarRenderer.start();
    pump(300);
    avatarRenderer.stop();
    expect(rafQueue.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    // ظهورٌ أو تبديل تفضيل بعد الإيقاف لا يُعيد تشغيل شيء.
    setHidden(false);
    setMedia(COARSE, false);
    const requested = rafRequests;
    expect(ticksIn(1000)).toBe(0);
    expect(rafRequests).toBe(requested);
  });

  it("الإيقاع المعلَن يطابق السلوك — للتشخيص لا للتحكّم", () => {
    expect(avatarRenderer.cadence()).toBe("stopped");
    avatarRenderer.start();
    expect(avatarRenderer.cadence(), "بلا مشترك").toBe("paused");
    subscribe();
    expect(avatarRenderer.cadence()).toBe("full");
    setMedia(COARSE, true);
    expect(avatarRenderer.cadence()).toBe("reduced");
    setHidden(true);
    expect(avatarRenderer.cadence(), "الصفحة مخفيّة").toBe("paused");
    setHidden(false);
    setMedia(COARSE, false);
    setMedia(REDUCED_MOTION, true);
    expect(avatarRenderer.cadence()).toBe("reduced");
    avatarRenderer.stop();
    expect(avatarRenderer.cadence()).toBe("stopped");
  });

  it("المسار الحقيقي — مستهلكو التطبيق التشخيصيّون لا يُبطلون الإيقاع المخفَّض", async () => {
    // المزوّد يفعل هذا عند التركيب: الدماغ يُسلّح العارض، ثم دورة الحياة
    // تشغّل `realtimeAnimation` و`avatarPerformanceEngine` المشتركَين فيه.
    setMedia(COARSE, true);
    const { avatarBrain } = await import("@/lib/sadeed-core/core/avatar-brain");
    const { avatarLifecycle } = await import("@/lib/sadeed-core/core/avatar-lifecycle");
    const { realtimeAnimation } = await import("@/lib/sadeed-core/core/realtime-animation");
    let pulses = 0;
    const offPulse = realtimeAnimation.subscribe(() => {
      pulses += 1;
    });
    avatarBrain.onOpen();
    const dispose = avatarLifecycle.mount();
    try {
      pump(500);
      const before = rafRequests;
      pulses = 0;
      pump(2000);
      expect(
        rafRequests - before,
        "المستهلكون التشخيصيّون أعادوا إيقاع ‎60‎/ث",
      ).toBeLessThanOrEqual(41);
      expect(pulses, "النبض التشخيصيّ انقطع بدل أن يُبطئ").toBeGreaterThan(0);

      setHidden(true);
      const hiddenFrom = rafRequests;
      pump(2000);
      expect(rafRequests, "طلب إطارات والصفحة مخفيّة").toBe(hiddenFrom);
    } finally {
      offPulse();
      avatarBrain.onClose();
      dispose();
    }
  });

  it("اللمس: صحّة الأفاتار «سليمة» على الإيقاع المخفَّض — ويحمرّ على مراقبٍ يجهل الإيقاع (المادة ٣٠)", async () => {
    // ‎~15‎ هرتز مقصودة على اللمس: بعتبة ‎60‎ هرتز (‎33ms‎ و‎24‎ إطارًا/ث) كانت
    // كل نبضةٍ «مُسقطة» والمتوسّط ‎~15‎، فتُقرأ «متدهورة» على كل هاتف.
    setMedia(COARSE, true);
    const { avatarBrain } = await import("@/lib/sadeed-core/core/avatar-brain");
    const { avatarLifecycle } = await import("@/lib/sadeed-core/core/avatar-lifecycle");
    const { avatarHealthMonitor, assessHealth } =
      await import("@/lib/sadeed-core/core/avatar-health-monitor");
    const { avatarPerformanceEngine, dropThresholdMs } =
      await import("@/lib/sadeed-core/core/avatar-performance-engine");
    avatarBrain.onOpen();
    const dispose = avatarLifecycle.mount();
    const deltas: number[] = [];
    const offPerf = avatarPerformanceEngine.subscribe((s) => deltas.push(s.dt));
    try {
      pump(3000);
      const health = avatarHealthMonitor.snapshot();
      const perf = health.perf;
      expect(perf, "لا عيّنة أداء — الحارس أجوف").not.toBeNull();
      if (!perf) return;
      expect(perf.cadence).toBe("reduced");
      expect(perf.totalFrames, "النبض انقطع").toBeGreaterThanOrEqual(30);

      // الانتهاك المزروع: العيّنة نفسها بعين المراقب القديم — كل فاصلٍ فوق
      // عتبة ‎60‎ هرتز، وموسومةً «كاملة» تُقرأ تدهورًا.
      // (الفاصل الأوّل يُقاس على إطار البذرة الذي يصل متزامنًا عند الاشتراك.)
      const steady = deltas.slice(1);
      expect(steady.length).toBeGreaterThanOrEqual(30);
      expect(steady.every((dt) => dt > dropThresholdMs("full"))).toBe(true);
      expect(assessHealth(true, { ...perf, cadence: "full" })).toBe("degraded");

      expect(perf.droppedFrames / perf.totalFrames).toBeLessThan(0.2);
      expect(
        health.level,
        `fps=${perf.fps} dropped=${perf.droppedFrames}/${perf.totalFrames}`,
      ).toBe("healthy");
    } finally {
      offPerf();
      avatarBrain.onClose();
      dispose();
    }
  });
});
