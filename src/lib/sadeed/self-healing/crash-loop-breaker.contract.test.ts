/**
 * عقد كاسر دورة الأعطال (الدستور، المادة XIII) — حارس P0 ٢٠٢٦/١٠/١٤.
 *
 * العطل: آيفون المالك يعرض صفحة سفاري القاتلة «حدثت مشكلة بشكل متكرر على
 * neexios.com». الكاسر موجود منذ زمن، ولم يعمل: `RootComponent` كان يمحو
 * عدّاد الإقلاع لحظة أول commit لـReact، فكل انهيارٍ **بعد** الترطيب يبدأ
 * إقلاعه التالي من صفر، ولا يُبلغ العدّاد ٢ أبدًا، ولا يدخل `html.safe-mode`.
 *
 * ما يحرسه هذا الملف:
 *
 *   ① العدّاد **لا** يُمحى متزامنًا عند الـcommit (نصًّا في `__root.tsx`،
 *      وسلوكًا على `armHealthyBootReset`).
 *   ② ويُمحى بعد `HEALTHY_UPTIME_MS` من الزمن **المرئيّ**، ولا يُمحى إن فُكّ
 *      المكوّن قبلها.
 *   ③ دورة الأعطال كاملةً بالسكربت السابق للترطيب **الحقيقي** المقروء من
 *      `__root.tsx`: انهياران بعد الترطيب ⇐ الوضع الآمن؛ ويُعاد فرضه ما دام
 *      العدّاد ≥ ٢؛ والجلسة السليمة تمحوه.
 *   ④ المعالج الدائم لا يمحو العدّاد في «الشفاء الصلب» (وإلا عاد الإقلاع
 *      المُشفى خارج الوضع الآمن)، ونبضته لا تمحوه أبدًا: هي على زمن الحائط،
 *      فتبويبٌ حُمِّل في الخلفية كان يُغفر له بعد ثانيةٍ مرئيّة واحدة.
 *   ⑤ حلقة `requestAnimationFrame` للأفاتار لا تبدأ تحت الوضع الآمن، وتقف
 *      إن دخله في أثناء الجلسة. (حلقة Lottie محروسة في
 *      `lottie-icon.contract.test.ts`؛ هنا يُربط صنفها بالثابت المشترك.)
 *   ⑥ الخروج غير النظيف: انهيارٌ **بعد** مهلة الغفران (أو نبضة المعالج) يُحسب
 *      ضربة ويُدخل الوضع الآمن في الإقلاع التالي؛ والخروج النظيف والقتل في
 *      الخلفية لا يُحسبان — **ولا يزيدان العدّاد**: إعادتا تحميلٍ نظيفتان
 *      بفاصل ثانية لا تُدخلان الوضع الآمن (سحب التحديث، عودة OAuth سريعة،
 *      زرّ إعادة التحميل في حدود الخطأ). وقاعدة العدّ في السكربت تطابق
 *      مرجعها حالةً حالة.
 *
 * والمحاكاة نفسها نظيفة: كل إقلاعٍ يسجّل المستمعين الذين يضيفهم السكربت،
 * وموتُ الصفحة (انهيارًا أو مغادرةً أو إقلاعَ صفحةٍ بعدها) ينزعهم. فلا مستمعَ
 * ميتٌ يرفع علَم الحياة باسم صفحةٍ لاحقة، ولا يتوقّف فحصٌ على ترتيب ما قبله.
 *
 * المادة ٣٠: كل فحصٍ سلبيّ هنا يُجرَّب أولًا على انتهاكٍ مزروع — وأوّلها
 * نسخةٌ حرفية من سلوك b996d1e (المحو عند الـcommit) يجب أن تُسقط السيناريو.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALIVE_KEY,
  BOOT_ATTEMPTS_KEY,
  HEALTHY_UPTIME_MS,
  SAFE_MODE_CLASS,
  armHealthyBootReset,
  isSafeMode,
} from "./crash-loop";

/** التعليقات تُنزع قبل الفحص النصّي — الشرح يسمّي المحظور (المادة ٣٠ ③). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const ROOT_SRC = readFileSync("src/routes/__root.tsx", "utf8");
const ROOT_CODE = stripComments(ROOT_SRC);
const AGENT_SRC = readFileSync("src/lib/sadeed/self-healing/permanent-agent.ts", "utf8");
const LOTTIE_SRC = readFileSync("src/components/icons/LottieIcon.tsx", "utf8");
const STYLES_SRC = readFileSync("src/styles.css", "utf8");

/** السكربت السابق للترطيب كما يُشحن — يُقرأ من المصدر لا من نسخة. */
const PRE_HYDRATION_SCRIPT = (() => {
  const match = ROOT_SRC.match(
    /children: `(\(function\(\)\{try\{(?:if\(window\.__nxBootCounted\)return;window\.__nxBootCounted=1;)?var ss=window\.sessionStorage;[^`]*)`/,
  );
  return match?.[1] ?? "";
})();

/**
 * السكربت المشحون قبل «الدرس الثالث» (crash-loop.ts): علَم الحياة قائم، لكن
 * الإقلاع النظيف يزيد العدّاد ١ (`:n+1`). الانتهاك المزروع لإعادات التحميل
 * النظيفة السريعة في ⑥ — يُشتقّ من المصدر فيتبعه، ويُثبَت أنّه غيره.
 */
const PLUS_ONE_PRE_HYDRATION_SCRIPT = PRE_HYDRATION_SCRIPT.replace(
  "Math.max(n,1)+1:n;",
  "Math.max(n,1)+1:n+1;",
);

/**
 * السكربت كما شُحن في b996d1e (ولم تغيّره المهمّة A) — حرفيًّا. الانتهاك
 * المزروع لـ⑥: بلا علَم حياة، فالانهيار بعد مهلة الغفران يبدأ من n=1.
 */
const B996D1E_PRE_HYDRATION_SCRIPT =
  "(function(){try{var ss=window.sessionStorage;var k='nexios-boot-attempts';var n=parseInt(ss.getItem(k)||'0',10);if(!isFinite(n)||n<0)n=0;n++;ss.setItem(k,String(n));if(n>=2){ss.setItem('nexios-welcome','complete:v4');ss.setItem('nexios-safe-mode','1');document.documentElement.classList.add('safe-mode');}if(n>=3){try{if('caches' in window){caches.keys().then(function(ks){ks.forEach(function(c){caches.delete(c);});});}if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}}catch(_){}}}catch(e){}})();";

function counter(): string | null {
  return window.sessionStorage.getItem(BOOT_ATTEMPTS_KEY);
}

function alive(): string | null {
  return window.sessionStorage.getItem(ALIVE_KEY);
}

let visibility: DocumentVisibilityState = "visible";
function setVisibility(next: DocumentVisibilityState): void {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

/* ── مستمعو الصفحة الحيّة ──────────────────────────────────────────────
   jsdom نافذةٌ واحدة لكل الإقلاعات المحاكاة، فما يضيفه السكربت من مستمعين
   (`pagehide` و`pageshow` و`visibilitychange`) يبقى بعد «موت» صفحته ويتراكم
   عبر الإقلاعات والفحوص، فيرفع ظهورٌ لاحقٌ علَمَ الحياة باسم صفحةٍ ميتة. فكل
   إقلاعٍ يسجّلهم، وموت الصفحة ينزعهم: الصفحة الميتة لا مستمع لها. */

type PageListener = {
  target: Window | Document;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};
let pageListeners: PageListener[] = [];

/** موت الصفحة: كلّ مستمعٍ أضافه سكربتها يُنزع. */
function killPageListeners(): void {
  for (const { target, type, listener, options } of pageListeners) {
    target.removeEventListener(type, listener, options);
  }
  pageListeners = [];
  // مستندٌ جديد ⇐ نافذةٌ جديدة: علَم «عُدَّ هذا المستند» لا يعبر الإقلاع.
  newDocument();
}

/** علَم «مرّةً لكل مستند» يعيش على النافذة؛ الإقلاع الجديد يبدأ بلا علَم. */
function newDocument(): void {
  delete (window as { __nxBootCounted?: number }).__nxBootCounted;
}

/** يشغّل السكربت ويسجّل كل مستمعٍ يضيفه على النافذة والمستند. */
function runPageScript(script: string): void {
  const spies = [
    [window, vi.spyOn(window, "addEventListener")],
    [document, vi.spyOn(document, "addEventListener")],
  ] as const;
  try {
    new Function(script)();
  } finally {
    for (const [target, spy] of spies) {
      for (const call of spy.mock.calls) {
        const [type, listener, options] = call as [
          string,
          EventListenerOrEventListenerObject | null,
          (boolean | AddEventListenerOptions)?,
        ];
        if (listener) pageListeners.push({ target, type, listener, options });
      }
      spy.mockRestore();
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  newDocument();
  document.documentElement.classList.remove(SAFE_MODE_CLASS);
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  killPageListeners();
  vi.clearAllTimers();
  vi.useRealTimers();
  window.sessionStorage.clear();
  document.documentElement.classList.remove(SAFE_MODE_CLASS);
  vi.restoreAllMocks();
});

/* ═══════════════════════════════════════════════════════════════════════
   ① لا محو عند الـcommit
   ═══════════════════════════════════════════════════════════════════════ */

/** الكاشف النصّي: أيّ محوٍ مباشر للعدّاد من الجذر. */
function rootClearsCounterDirectly(code: string): boolean {
  return (
    /removeItem\(\s*["'`]nexios-boot-attempts["'`]\s*\)/.test(code) ||
    /removeItem\(\s*BOOT_ATTEMPTS_KEY\s*\)/.test(code) ||
    /\bclearBootAttempts\(\s*\)/.test(code)
  );
}

/** b996d1e حرفيًّا — الانتهاك المزروع. */
const PLANTED_COMMIT_RESET_SRC = `
  useEffect(() => {
    try {
      window.sessionStorage.removeItem("nexios-boot-attempts");
    } catch {
      /* ignore */
    }
  }, []);
`;

/** نسخة سلوكية من b996d1e: تمحو متزامنًا لحظة الاستدعاء. */
function plantedCommitReset(): () => void {
  window.sessionStorage.removeItem(BOOT_ATTEMPTS_KEY);
  return () => {};
}

/** هل يبقى العدّاد بعد «الـcommit» مباشرة؟ */
function counterSurvivesCommit(arm: () => () => void): boolean {
  window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "1");
  const disarm = arm();
  const survived = counter() === "1";
  disarm();
  return survived;
}

describe("① العدّاد لا يُمحى عند أول commit", () => {
  it("الكاشف النصّي يحمرّ على b996d1e المزروع (المادة ٣٠)", () => {
    expect(rootClearsCounterDirectly(PLANTED_COMMIT_RESET_SRC)).toBe(true);
  });

  it("__root.tsx لا يمحو العدّاد مباشرة — يسلّح المؤقّت وينزعه عند الفكّ", () => {
    expect(ROOT_CODE.length).toBeGreaterThan(0);
    expect(rootClearsCounterDirectly(ROOT_CODE)).toBe(false);
    expect(ROOT_CODE).toMatch(
      /const disarmHealthyBoot = armHealthyBootReset\(\);[\s\S]*?return \(\) => \{[\s\S]*?disarmHealthyBoot\(\);/,
    );
  });

  it("السلوك: الكاشف يحمرّ على المحو المتزامن المزروع (المادة ٣٠)", () => {
    expect(counterSurvivesCommit(plantedCommitReset)).toBe(false);
  });

  it("السلوك: تسليح المؤقّت لا يلمس العدّاد", () => {
    expect(counterSurvivesCommit(() => armHealthyBootReset())).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ② يُمحى بعد الزمن المرئيّ
   ═══════════════════════════════════════════════════════════════════════ */

describe("② الإقلاع سليمٌ بعد بقاءٍ مرئيّ", () => {
  it("المهلة أطول من نافذة الانهيار عند الفتح، وقصيرةٌ لا تُبقي المتعافي في القشرة الساكنة", () => {
    expect(HEALTHY_UPTIME_MS).toBeGreaterThanOrEqual(10_000);
    expect(HEALTHY_UPTIME_MS).toBeLessThan(30_000);
  });

  it("يبقى حتى آخر ميلّي ثانية قبل المهلة، ويُمحى عندها", () => {
    window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "2");
    armHealthyBootReset();
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS - 1);
    expect(counter()).toBe("2");
    vi.advanceTimersByTime(1);
    expect(counter()).toBeNull();
  });

  it("الفكّ قبل المهلة يُبقي الضربة — الإقلاع لم يُثبت سلامته", () => {
    window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "1");
    const disarm = armHealthyBootReset();
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS / 2);
    disarm();
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS * 10);
    expect(counter()).toBe("1");
  });

  it("الزمن المخفيّ لا يُحسب، والمرئيّ يتراكم عبر الإخفاء", () => {
    window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "1");
    setVisibility("hidden");
    armHealthyBootReset();
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS * 5);
    expect(counter()).toBe("1");

    setVisibility("visible");
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS - 5_000);
    setVisibility("hidden");
    vi.advanceTimersByTime(60_000);
    expect(counter()).toBe("1");

    setVisibility("visible");
    vi.advanceTimersByTime(4_999);
    expect(counter()).toBe("1");
    vi.advanceTimersByTime(1);
    expect(counter()).toBeNull();
  });

  /**
   * ساعة الجهاز تُضبط (NTP أو يدويًّا) بـ`jumpMs` بعد ١٠ ثوانٍ مرئيّة، ثم يُخفى
   * التبويب ويعود فيُحسب الباقي. يعيد الزمن المرئيّ حتى الغفران (أو -1).
   */
  function visibleMsUntilForgivenAcrossClockJump(jumpMs: number): number {
    window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "1");
    const disarm = armHealthyBootReset();
    vi.advanceTimersByTime(10_000);
    vi.setSystemTime(Date.now() + jumpMs);
    setVisibility("hidden");
    setVisibility("visible");
    let visibleMs = 10_000;
    while (counter() !== null && visibleMs < HEALTHY_UPTIME_MS * 3) {
      vi.advanceTimersByTime(1_000);
      visibleMs += 1_000;
    }
    disarm();
    return counter() === null ? visibleMs : -1;
  }

  it("ضبط ساعة الجهاز لا يطيل المهلة ولا يقصّرها — ويحمرّ على ساعة حائطٍ مزروعة (المادة ٣٠)", () => {
    // الانتهاك المزروع: ساعة الحائط مكان الرتيبة — سلوك `Date.now()` قبل الإصلاح.
    const wall = vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    expect(visibleMsUntilForgivenAcrossClockJump(3_600_000)).toBeLessThan(HEALTHY_UPTIME_MS);
    expect(visibleMsUntilForgivenAcrossClockJump(-3_600_000)).toBe(-1);
    wall.mockRestore();

    for (const jump of [3_600_000, -3_600_000]) {
      expect(visibleMsUntilForgivenAcrossClockJump(jump), `قفزة ${jump}ms`).toBe(HEALTHY_UPTIME_MS);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ③ دورة الأعطال بالسكربت الحقيقي
   ═══════════════════════════════════════════════════════════════════════ */

type Arm = () => () => void;

/**
 * إقلاعٌ مُحاكى: صفحةٌ جديدة (لا صنف ولا مستمعو الصفحة السابقة — فهي لم تعد
 * قائمة)، ثم السكربت السابق للترطيب كما يُشحن، ثم «الترطيب» (تسليح الإعادة
 * كما يفعل `RootComponent`).
 */
function boot(
  arm: Arm,
  script: string = PRE_HYDRATION_SCRIPT,
): { disarm: () => void; safe: boolean } {
  killPageListeners();
  document.documentElement.classList.remove(SAFE_MODE_CLASS);
  runPageScript(script);
  const safe = isSafeMode();
  return { disarm: arm(), safe };
}

/**
 * انهيار بعد الترطيب بـ`afterMs`: العملية تموت (jetsam) فلا مؤقّت يطلق بعده
 * **ولا `pagehide`** — وذلك ما يتركه علَم الحياة شاهدًا — ولا مستمع يبقى لها.
 */
function crashAfter(page: { disarm: () => void }, afterMs: number): void {
  vi.advanceTimersByTime(afterMs);
  vi.clearAllTimers();
  killPageListeners();
  page.disarm();
}

/**
 * مغادرةٌ نظيفة (إعادة تحميل، تنقّل، عودة OAuth): المتصفّح يطلق `pagehide`
 * قبل أن تُستبدل الصفحة، ثم تزول بمستمعيها.
 */
function leaveCleanly(page: { disarm: () => void }): void {
  window.dispatchEvent(new Event("pagehide"));
  vi.clearAllTimers();
  killPageListeners();
  page.disarm();
}

describe("③ دورة الأعطال — السكربت السابق للترطيب كما يُشحن", () => {
  it("مرّةً واحدة لكل مستند: إعادة تنفيذه في المستند نفسه (توجيهٌ من العميل) لا تُحسب انهيارًا", () => {
    // فحص الإنتاج 493 (٢٠٢٦/١٠/١٥): زائرٌ يفتح /ptw فيُعاد توجيهه من العميل إلى «/»،
    // والموجّه يعيد رسم سكربتات الرأس فيُنفَّذ السكربت ثانيةً في المستند نفسه —
    // فيجد علَم حياته هو ويعدّها ضربة ⇐ الوضع الآمن من أوّل زيارة.
    expect(PRE_HYDRATION_SCRIPT).toContain("if(window.__nxBootCounted)return;");
    runPageScript(PRE_HYDRATION_SCRIPT);
    runPageScript(PRE_HYDRATION_SCRIPT); // المستند نفسه: لا newDocument()
    expect(window.sessionStorage.getItem(BOOT_ATTEMPTS_KEY)).toBe("0");
    expect(document.documentElement.classList.contains(SAFE_MODE_CLASS)).toBe(false);

    // الانتهاك المزروع (المادة ٣٠): السكربت بلا حارس المستند يبلغ الوضع الآمن.
    window.sessionStorage.clear();
    newDocument();
    const unguarded = PRE_HYDRATION_SCRIPT.replace(
      "if(window.__nxBootCounted)return;window.__nxBootCounted=1;",
      "",
    );
    expect(unguarded).not.toBe(PRE_HYDRATION_SCRIPT);
    runPageScript(unguarded);
    runPageScript(unguarded);
    expect(window.sessionStorage.getItem(BOOT_ATTEMPTS_KEY)).toBe("2");
    expect(document.documentElement.classList.contains(SAFE_MODE_CLASS)).toBe(true);
  });

  it("السكربت مقروء ويتكلّم بالثوابت المشتركة", () => {
    expect(PRE_HYDRATION_SCRIPT.length).toBeGreaterThan(0);
    expect(PRE_HYDRATION_SCRIPT).toContain(`'${BOOT_ATTEMPTS_KEY}'`);
    expect(PRE_HYDRATION_SCRIPT).toContain(`classList.add('${SAFE_MODE_CLASS}')`);
    expect(PRE_HYDRATION_SCRIPT).toContain("if(n>=2)");
  });

  it("الانتهاك المزروع (b996d1e: سكربته + المحو عند الـcommit) لا يبلغ الوضع الآمن أبدًا — هذا هو P0", () => {
    const old = B996D1E_PRE_HYDRATION_SCRIPT;
    let page = boot(plantedCommitReset, old);
    expect(page.safe).toBe(false);
    crashAfter(page, 5_000);
    page = boot(plantedCommitReset, old);
    expect(page.safe).toBe(false);
    crashAfter(page, 5_000);
    page = boot(plantedCommitReset, old);
    // ثلاثة انهيارات بعد الترطيب، والوضع الآمن لم يُدخل — صفحة سفاري القاتلة.
    expect(page.safe).toBe(false);
  });

  it("والسكربت المشحون يبلغه ولو عاد المحو عند الـcommit — علَم الحياة لا يمرّ بالعدّاد", () => {
    let page = boot(plantedCommitReset);
    expect(page.safe).toBe(false);
    crashAfter(page, 5_000);
    page = boot(plantedCommitReset);
    expect(page.safe).toBe(true);
  });

  it("انهياران بعد الترطيب ⇐ الإقلاع الثاني في الوضع الآمن", () => {
    let page = boot(armHealthyBootReset);
    expect(page.safe).toBe(false);
    crashAfter(page, 5_000);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    expect(counter()).toBe("2");
  });

  it("يُعاد فرض الوضع الآمن عند كل إقلاع ما دام العدّاد ≥ ٢", () => {
    let page = boot(armHealthyBootReset);
    crashAfter(page, 5_000);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    // الوضع الآمن لم يكفِ: انهيارٌ ثانٍ قبل المهلة.
    crashAfter(page, HEALTHY_UPTIME_MS - 1);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    expect(counter()).toBe("3");
  });

  it("إعادة تحميلٍ نظيفة بعد انهيار: تبقى في الوضع الآمن حتى الغفران، ولا تصعّد", () => {
    let page = boot(armHealthyBootReset);
    crashAfter(page, 5_000);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    // المستخدم يسحب للتحديث بعد ثانيتين: لا ضربة جديدة، ولا خروج قبل الغفران.
    vi.advanceTimersByTime(2_000);
    leaveCleanly(page);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    expect(counter()).toBe("2");
  });

  it("الجلسة السليمة تمحوه: الإقلاع التالي عاديّ", () => {
    let page = boot(armHealthyBootReset);
    crashAfter(page, 5_000);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(true);
    vi.advanceTimersByTime(HEALTHY_UPTIME_MS);
    expect(counter()).toBeNull();
    // إعادة تحميلٍ عادية بعد استعمالٍ سليم — بـ`pagehide` كما في المتصفّح.
    leaveCleanly(page);
    page = boot(armHealthyBootReset);
    expect(page.safe).toBe(false);
    // الإقلاع النظيف لا يزيد العدّاد: صفرٌ مكتوب، لا ضربة.
    expect(counter()).toBe("0");
  });

  it("الصفحة الميتة لا مستمع لها — ويحمرّ على محاكاةٍ تُبقي مستمعيها (المادة ٣٠)", () => {
    /** انهيار b996d1e-المحاكاة: يمحو المؤقّتات ويُبقي مستمعي الصفحة الميتة. */
    const plantedCrashKeepingListeners = (dead: { disarm: () => void }) => {
      vi.clearAllTimers();
      dead.disarm();
    };
    let page = boot(armHealthyBootReset);
    setVisibility("hidden");
    plantedCrashKeepingListeners(page);
    setVisibility("visible");
    // مستمعٌ ميت رفع العلَم باسم صفحةٍ لم تعد قائمة — هذا ما يُفسد الترتيب.
    expect(alive()).toBe("1");

    window.sessionStorage.clear();
    page = boot(armHealthyBootReset);
    setVisibility("hidden");
    crashAfter(page, 0);
    setVisibility("visible");
    window.dispatchEvent(new Event("pageshow"));
    expect(alive()).toBeNull();
    expect(pageListeners).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ④ المعالج الدائم
   ═══════════════════════════════════════════════════════════════════════ */

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

/** سلوك `hardHeal` في b996d1e حرفيًّا — الانتهاك المزروع. */
async function plantedHardHeal(): Promise<void> {
  await Promise.resolve();
  window.sessionStorage.removeItem(BOOT_ATTEMPTS_KEY);
  window.sessionStorage.removeItem("nexios-welcome");
}

/** يبذر حالة الإقلاع الثالث ويشغّل الشفاء، ويعيد ما بقي. */
async function afterHardHeal(
  heal: () => Promise<void>,
): Promise<{ counter: string | null; welcome: string | null }> {
  window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "3");
  window.sessionStorage.setItem("nexios-welcome", "complete:v4");
  // علَم «شُفيت مرّة» مرفوع: لا تنقّل في jsdom، والمسار نفسه يُختبر.
  window.sessionStorage.setItem("nexios-heal-run", "1");
  await heal();
  await flushMicrotasks();
  return {
    counter: window.sessionStorage.getItem(BOOT_ATTEMPTS_KEY),
    welcome: window.sessionStorage.getItem("nexios-welcome"),
  };
}

async function realHardHeal(): Promise<void> {
  vi.resetModules();
  const agent = await import("./permanent-agent");
  // attempts >= 3 ⇐ hardHeal ويعود بلا تثبيت.
  expect(agent.installPermanentHealer()).toBeUndefined();
}

describe("④ المعالج الدائم لا يُخرج الإقلاع المُشفى من الوضع الآمن", () => {
  it("الكاشف يحمرّ على hardHeal المزروع من b996d1e (المادة ٣٠)", async () => {
    const after = await afterHardHeal(plantedHardHeal);
    expect(after.welcome).toBeNull();
    expect(after.counter).toBeNull();
  });

  it("hardHeal يجري فعلًا (شاهده: مفتاح الترحيب يُمحى) ويُبقي العدّاد", async () => {
    const after = await afterHardHeal(realHardHeal);
    // الشاهد يثبت أن المسار جرى — لا نجاحٌ فوق مسارٍ لم يُنفَّذ.
    expect(after.welcome).toBeNull();
    expect(after.counter).toBe("3");
  });

  /** نبضة المعالج قبل الإصلاح: تمحو العدّاد متى أطلقت والصفحة ظاهرة — الانتهاك المزروع. */
  function plantedForgivingHeartbeat(): () => void {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      window.sessionStorage.removeItem(BOOT_ATTEMPTS_KEY);
    }, 30_000);
    return () => window.clearInterval(id);
  }

  async function realHealer(): Promise<() => void> {
    vi.resetModules();
    const agent = await import("./permanent-agent");
    const uninstall = agent.installPermanentHealer();
    expect(uninstall).toBeTypeOf("function");
    return () => uninstall?.();
  }

  /**
   * تبويبٌ حُمِّل في الخلفية بضربةٍ قائمة (مؤقّتات سطح المكتب تجري فيها)، ثم
   * ظهر قبل النبضة بثانية: بعد كم من الزمن المرئيّ يُغفر له؟
   */
  async function visibleMsUntilForgivenInBackgroundTab(
    install: () => Promise<() => void> | (() => void),
  ): Promise<number> {
    window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, "2");
    setVisibility("hidden");
    const page = boot(armHealthyBootReset);
    const uninstall = await install();
    vi.advanceTimersByTime(29_000);
    expect(counter(), "غُفر له وهو مخفيّ").toBe("2");
    setVisibility("visible");
    let visibleMs = 0;
    while (counter() !== null && visibleMs < 60_000) {
      vi.advanceTimersByTime(1_000);
      visibleMs += 1_000;
    }
    uninstall();
    leaveCleanly(page);
    return visibleMs;
  }

  it("الكاشف يحمرّ على نبضةٍ تغفر: تبويب الخلفية يُغفر له بعد ثانيةٍ مرئيّة (المادة ٣٠)", async () => {
    expect(await visibleMsUntilForgivenInBackgroundTab(plantedForgivingHeartbeat)).toBe(1_000);
  });

  it("النبضة لا تغفر: تبويب الخلفية يُغفر له بعد المهلة المرئيّة كاملةً لا قبلها", async () => {
    expect(await visibleMsUntilForgivenInBackgroundTab(realHealer)).toBe(HEALTHY_UPTIME_MS);
  });

  /** الكاشف النصّي: أيّ محوٍ للعدّاد في كود المعالج (بعد نزع التعليقات). */
  function agentClearsCounter(code: string): boolean {
    return (
      /removeItem\(\s*(?:BOOT_KEY|BOOT_ATTEMPTS_KEY|["'`]nexios-boot-attempts["'`])\s*\)/.test(
        code,
      ) || /\bclearBootAttempts\(/.test(code)
    );
  }

  it("المعالج لا يمحو العدّاد في أيّ مسار — ويحمرّ على نبضة b996d1e المزروعة (المادة ٣٠)", () => {
    expect(agentClearsCounter("safe(() => sessionStorage.removeItem(BOOT_KEY));")).toBe(true);
    expect(agentClearsCounter(stripComments(AGENT_SRC))).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑤ الحلقات الثقيلة تحت الوضع الآمن
   ═══════════════════════════════════════════════════════════════════════ */

describe("⑤ حلقات requestAnimationFrame لا تعمل تحت الوضع الآمن", () => {
  const CRASH_LOOP_MODULE = "@/lib/sadeed/self-healing/crash-loop";
  let frames: FrameRequestCallback[];
  let ran: number;
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cleanups: Array<() => void>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    frames = [];
    ran = 0;
    cleanups = [];
    // مفردات جديدة لكل فحص: عارضٌ تركه فحصٌ أحمر «يعمل» يجعل `start()` التالي
    // يعود مبكّرًا فيمرّ أجوفَ (المادة ٣٠).
    vi.resetModules();
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const fn of cleanups.reverse()) fn();
    vi.doUnmock(CRASH_LOOP_MODULE);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  /**
   * العارض لا يطلب إطارًا بلا مشترك (إيقاعه تابعٌ للطلب)، ففحصٌ بلا مشترك
   * يمرّ أجوفَ تحت الوضع الآمن وخارجه سواءً (المادة ٣٠). فالمسبار يشترك
   * أولًا كما يفعل مستهلكوه الحقيقيون.
   */
  async function load() {
    const { avatarRenderer } = await import("@/lib/sadeed-core/core/avatar-renderer");
    const { avatarBrain } = await import("@/lib/sadeed-core/core/avatar-brain");
    const unsubscribe = avatarRenderer.subscribe(() => {});
    cleanups.push(() => {
      unsubscribe();
      avatarBrain.shutdown();
      avatarRenderer.stop();
    });
    return { renderer: avatarRenderer, brain: avatarBrain };
  }

  /**
   * إطار عرضٍ واحد لكل خطوة: تُشغَّل الطلبات المعلّقة **عند بدء الخطوة** وحدها
   * — ما تطلبه هي يُنتظر إلى الخطوة التالية كما في المتصفّح — ثم يمضي الزمن.
   */
  function pump(steps: number): void {
    for (let i = 0; i < steps; i += 1) {
      const pending = frames.length;
      while (ran < pending) {
        ran += 1;
        frames[ran - 1](ran * 16);
      }
      vi.advanceTimersByTime(16);
    }
  }

  function stubPointer(query: string | null): void {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (q: string) => ({
        matches: query !== null && q === query,
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  /** المسبار ١: الوضع الآمن قائم قبل الإقلاع، ثم يُشغَّل العارض (أو الدماغ). */
  async function probeStartUnderSafeMode(via: "renderer" | "brain") {
    document.documentElement.classList.add(SAFE_MODE_CLASS);
    const { renderer, brain } = await load();
    const timersBefore = vi.getTimerCount();
    if (via === "renderer") renderer.start();
    else brain.onOpen();
    pump(10);
    return { rafCalls: rafSpy.mock.calls.length, timerDelta: vi.getTimerCount() - timersBefore };
  }

  /** المسبار ٢: الحلقة حيّة، ثم يدخل الوضع الآمن في أثناء الجلسة. */
  async function probeMidSession(pointer: string | null) {
    stubPointer(pointer);
    const { renderer } = await load();
    const timersBefore = vi.getTimerCount();
    renderer.start();
    pump(20);
    const aliveFrames = frames.length;
    document.documentElement.classList.add(SAFE_MODE_CLASS);
    pump(1);
    const settled = frames.length;
    pump(50);
    return {
      aliveFrames,
      growthAfterSafeMode: frames.length - settled,
      timerDelta: vi.getTimerCount() - timersBefore,
    };
  }

  const CADENCES = [
    ["سطح المكتب — إطار لكل إطار عرض", null],
    ["الجوال — (pointer: coarse)، مسار آيفون المالك", "(pointer: coarse)"],
  ] as const;

  describe("الانتهاك المزروع: عارضٌ يتجاهل الوضع الآمن — المسابير تحمرّ (المادة ٣٠)", () => {
    beforeEach(() => {
      vi.doMock(CRASH_LOOP_MODULE, async (importOriginal) => ({
        ...(await importOriginal<typeof import("./crash-loop")>()),
        isSafeMode: () => false,
      }));
    });

    it.each(["renderer", "brain"] as const)("المسبار ١ عبر %s يلتقط حلقةً بدأت", async (via) => {
      const seen = await probeStartUnderSafeMode(via);
      expect(seen.rafCalls).toBeGreaterThan(0);
    });

    it.each(CADENCES)("المسبار ٢ يلتقط حلقةً لم تقف: %s", async (_name, pointer) => {
      const seen = await probeMidSession(pointer);
      expect(seen.aliveFrames).toBeGreaterThanOrEqual(3);
      expect(seen.growthAfterSafeMode).toBeGreaterThan(0);
    });
  });

  it("تحت html.safe-mode لا يبدأ عارض الأفاتار — لا إطار ولا مؤقّت", async () => {
    expect(await probeStartUnderSafeMode("renderer")).toEqual({ rafCalls: 0, timerDelta: 0 });
  });

  it("ولا عبر الدماغ الذي يشغّله عند تركيب المزوّد", async () => {
    expect(await probeStartUnderSafeMode("brain")).toEqual({ rafCalls: 0, timerDelta: 0 });
  });

  it.each(CADENCES)("دخول الوضع الآمن في أثناء الجلسة يوقف الحلقة: %s", async (_name, pointer) => {
    const seen = await probeMidSession(pointer);
    // الحلقة حيّة في هذا الإيقاع قبل الوضع الآمن — لا نجاح فوق حلقةٍ ميتة.
    expect(seen.aliveFrames).toBeGreaterThanOrEqual(3);
    expect(seen.growthAfterSafeMode).toBe(0);
    expect(seen.timerDelta).toBe(0);
  });

  it("Lottie والأنماط يقرآن الصنف المشترك نفسه", () => {
    expect(LOTTIE_SRC).toContain(`root.classList.contains("${SAFE_MODE_CLASS}")`);
    expect(STYLES_SRC).toContain(`html.${SAFE_MODE_CLASS} video`);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ⑥ الخروج غير النظيف — الانهيار بعد مهلة الغفران
   ═══════════════════════════════════════════════════════════════════════ */

describe("⑥ الخروج غير النظيف: انهيارٌ بعد المهلة يُحسب ضربة", () => {
  /** بعد مهلة الغفران بهامش: العدّاد ممحوّ، والمستخدم يفتح سَدِيد الآن. */
  const LATE_MS = HEALTHY_UPTIME_MS + 5_000;

  /** الشكوى بعينها: انهياران متتاليان كلاهما بعد المهلة. */
  function twoLateCrashes(script?: string): { second: boolean; third: boolean } {
    let page = boot(armHealthyBootReset, script);
    crashAfter(page, LATE_MS);
    page = boot(armHealthyBootReset, script);
    const second = page.safe;
    crashAfter(page, LATE_MS);
    page = boot(armHealthyBootReset, script);
    return { second, third: page.safe };
  }

  it("السكربت يحمل علَم الحياة بمستمعيه — من الثوابت المشتركة", () => {
    expect(ALIVE_KEY).not.toBe(BOOT_ATTEMPTS_KEY);
    expect(PRE_HYDRATION_SCRIPT).toContain(`'${ALIVE_KEY}'`);
    for (const listener of [
      "window.addEventListener('pagehide',down)",
      "window.addEventListener('pageshow',up)",
      "document.addEventListener('visibilitychange',up)",
    ]) {
      expect(PRE_HYDRATION_SCRIPT).toContain(listener);
    }
  });

  it("الانتهاك المزروع (سكربت b996d1e مع مهلة المهمّة A) لا يبلغ الوضع الآمن — الثغرة (المادة ٣٠)", () => {
    expect(twoLateCrashes(B996D1E_PRE_HYDRATION_SCRIPT)).toEqual({ second: false, third: false });
  });

  it("السكربت المشحون: الإقلاع بعد أوّل انهيارٍ متأخّر في الوضع الآمن، وما بعده كذلك", () => {
    expect(twoLateCrashes()).toEqual({ second: true, third: true });
  });

  it("مهلة الغفران تمحو العدّاد ولا تمحو علَم الحياة", () => {
    const page = boot(armHealthyBootReset);
    expect(alive()).toBe("1");
    vi.advanceTimersByTime(LATE_MS);
    expect(counter()).toBeNull();
    expect(alive()).toBe("1");
    crashAfter(page, 0);
    expect(boot(armHealthyBootReset).safe).toBe(true);
    expect(counter()).toBe("2");
  });

  it("ولا تمحوه نبضة المعالج الدائم — انهيارٌ بعد ٣٥ ثانية يُحسب", async () => {
    vi.resetModules();
    const agent = await import("./permanent-agent");
    const page = boot(armHealthyBootReset);
    const uninstall = agent.installPermanentHealer();
    expect(uninstall).toBeTypeOf("function");
    vi.advanceTimersByTime(35_000);
    expect(counter()).toBeNull();
    expect(alive()).toBe("1");
    uninstall?.();
    crashAfter(page, 0);
    expect(boot(armHealthyBootReset).safe).toBe(true);
  });

  it("الخروج النظيف بعد المهلة لا يُحسب: إعادة التحميل عادية", () => {
    const page = boot(armHealthyBootReset);
    vi.advanceTimersByTime(LATE_MS);
    leaveCleanly(page);
    expect(alive()).toBeNull();
    expect(boot(armHealthyBootReset).safe).toBe(false);
    expect(counter()).toBe("0");
  });

  /** إعادتا تحميلٍ نظيفتان بفاصل ثانية: سحبتا تحديث، أو عودة OAuth سريعة. */
  function twoQuickCleanReloads(script?: string): {
    second: boolean;
    third: boolean;
    n: string | null;
  } {
    let page = boot(armHealthyBootReset, script);
    vi.advanceTimersByTime(1_000);
    leaveCleanly(page);
    page = boot(armHealthyBootReset, script);
    const second = page.safe;
    vi.advanceTimersByTime(1_000);
    leaveCleanly(page);
    page = boot(armHealthyBootReset, script);
    return { second, third: page.safe, n: counter() };
  }

  it("الانتهاك المزروع (الزيادة عند كل إقلاع): إعادتا تحميلٍ نظيفتان ⇐ وضعٌ آمن كاذب ثم «شفاء صلب» (المادة ٣٠)", () => {
    expect(PLUS_ONE_PRE_HYDRATION_SCRIPT).not.toBe(PRE_HYDRATION_SCRIPT);
    expect(twoQuickCleanReloads(PLUS_ONE_PRE_HYDRATION_SCRIPT)).toEqual({
      second: true,
      third: true,
      n: "3",
    });
  });

  it("two clean reloads 1 s apart ⇒ page.safe === false", () => {
    expect(twoQuickCleanReloads()).toEqual({ second: false, third: false, n: "0" });
  });

  it("القتل في الخلفية لا يُحسب: الإخفاء يمحو العلَم قبل أن تموت الصفحة", () => {
    const page = boot(armHealthyBootReset);
    vi.advanceTimersByTime(LATE_MS);
    setVisibility("hidden");
    expect(alive()).toBeNull();
    crashAfter(page, 60_000);
    // المستخدم يعود إلى التبويب فيُعيد المتصفّح تحميله ظاهرًا. والصفحة الميتة
    // بلا مستمعين، فالظهور لا يرفع العلَم باسمها.
    setVisibility("visible");
    expect(alive()).toBeNull();
    expect(boot(armHealthyBootReset).safe).toBe(false);
    expect(counter()).toBe("0");
  });

  it("الظهور بعد الإخفاء و`pageshow` بعد `pagehide` يعيدان العلَم — فالانهيار بعدهما يُحسب", () => {
    let page = boot(armHealthyBootReset);
    vi.advanceTimersByTime(LATE_MS);
    setVisibility("hidden");
    setVisibility("visible");
    expect(alive()).toBe("1");
    crashAfter(page, 0);
    expect(boot(armHealthyBootReset).safe).toBe(true);

    // ذاكرة الرجوع (bfcache): الصفحة تُخفى ثم تُستعاد حيّةً كما هي.
    window.sessionStorage.clear();
    page = boot(armHealthyBootReset);
    vi.advanceTimersByTime(LATE_MS);
    window.dispatchEvent(new Event("pagehide"));
    expect(alive()).toBeNull();
    window.dispatchEvent(new Event("pageshow"));
    expect(alive()).toBe("1");
    crashAfter(page, 0);
    expect(boot(armHealthyBootReset).safe).toBe(true);
  });

  it("صفحةٌ تُحمَّل مخفيّةً لا ترفع العلَم حتى تظهر", () => {
    setVisibility("hidden");
    boot(armHealthyBootReset);
    expect(alive()).toBeNull();
    setVisibility("visible");
    expect(alive()).toBe("1");
  });

  /**
   * القاعدة مكتوبةً — المرجع الذي يُطابَق عليه السكربت المشحون: الخروج غير
   * النظيف ضربة، والنظيف يُبقي العدّاد كما هو.
   */
  function expectedAttempts(previous: string | null, aliveLeft: string | null): number {
    let n = parseInt(previous || "0", 10);
    if (!isFinite(n) || n < 0) n = 0;
    return aliveLeft === "1" ? Math.max(n, 1) + 1 : n;
  }

  /** يبذر الحالة، ويُقلع بالسكربت، ويعيد ما قرأه الإقلاع. */
  function bootFrom(
    previous: string | null,
    aliveLeft: string | null,
    script: string = PRE_HYDRATION_SCRIPT,
  ): { n: number; safe: boolean } {
    window.sessionStorage.clear();
    if (previous !== null) window.sessionStorage.setItem(BOOT_ATTEMPTS_KEY, previous);
    if (aliveLeft !== null) window.sessionStorage.setItem(ALIVE_KEY, aliveLeft);
    const page = boot(() => () => {}, script);
    return { n: Number(counter()), safe: page.safe };
  }

  const PREVIOUS = [null, "0", "1", "2", "7", "abc", "-4", "1.9"] as const;
  const ALIVE_LEFT = [null, "1", "0"] as const;

  it.each([
    ["b996d1e", B996D1E_PRE_HYDRATION_SCRIPT],
    ["الزيادة عند كل إقلاع", PLUS_ONE_PRE_HYDRATION_SCRIPT],
  ])("قاعدة العدّ تحمرّ على السكربت المزروع: %s (المادة ٣٠)", (_name, planted) => {
    const mismatches = PREVIOUS.flatMap((p) =>
      ALIVE_LEFT.filter((a) => bootFrom(p, a, planted).n !== expectedAttempts(p, a)),
    );
    expect(mismatches.length).toBeGreaterThan(0);
  });

  it.each(PREVIOUS.flatMap((p) => ALIVE_LEFT.map((a) => [p, a] as const)))(
    "السكربت المشحون يطابق القاعدة: العدّاد %s وعلَم الحياة %s",
    (previous, aliveLeft) => {
      const seen = bootFrom(previous, aliveLeft);
      const n = expectedAttempts(previous, aliveLeft);
      expect(seen).toEqual({ n, safe: n >= 2 });
      // والإقلاع نفسه حيٌّ ظاهر: العلَم مرفوعٌ لحياته هو.
      expect(alive()).toBe("1");
    },
  );
});
