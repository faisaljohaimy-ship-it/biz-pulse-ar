/**
 * الموجّه الحتمي بلا تكلفة — سلوكيًّا على المجموعات والسجلّات الحقيقية.
 *
 * وجها الخطر نفساهما في `instant-data-answers.test.ts`: **التفويت** (أمرٌ صريح لا
 * يُجاب) و**الاختطاف** (سؤال تحليلي يُجاب بقائمةٍ أو رابط) — والثاني أسوأ. والأرقام
 * تُقاس ضد العدّادات الكنسية لا ضد أرقامٍ منسوخة، والروابط ضد سجلّ الشاشات نفسه.
 */
import { describe, expect, it } from "vitest";
import { REAL_PROJECT_COUNTS } from "@/lib/exec/projects-report.real.server";
import { REAL_WORK_ORDER_COUNTS } from "@/lib/exec/maintenance-report.real.server";
import { REAL_INCIDENT_COUNTS } from "@/lib/exec/event-report.real.server";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { SCREEN_NAMES } from "@/lib/nav/screen-names";
import { isVendorSafe } from "@/lib/sadeed/vendor-mask";
import { hasForbiddenFiller } from "@/lib/sadeed/response-contract";
import { matchInstantDataAnswer } from "@/lib/sadeed/instant-data-answers.server";
import {
  detectLocale,
  helpReply,
  matchEnglishCount,
  matchHelpIntent,
  matchNavigation,
  matchZeroCostAnswer,
  ZERO_COST_EXAMPLES,
  zeroCostUnsupportedReply,
} from "./zero-cost-router.server";

const GUEST = { signedIn: false, engineAvailable: false };
const MEMBER = { signedIn: true, engineAvailable: false };

/** أسماء مزوّدين ومتغيّرات بيئة لا يجوز أن تصل نصًّا يقرؤه المستخدم. */
const FORBIDDEN_TEXT =
  /gemini|google|openai|anthropic|lovable|gpt|claude|_API_KEY|SADEED_[A-Z_]+|env\b|متغيّر البيئة/i;

describe("detectLocale", () => {
  it("حرفٌ عربيّ واحد ⇐ ar، وإلا en", () => {
    expect(detectLocale("كم عدد المشاريع؟")).toBe("ar");
    expect(detectLocale("open الصيانة")).toBe("ar");
    expect(detectLocale("How many projects?")).toBe("en");
    expect(detectLocale("")).toBe("en");
  });
});

describe("المساعدة", () => {
  it.each([
    "ماذا تستطيع أن تفعل؟",
    "ما الأوامر المدعومة؟",
    "الأوامر المدعومة",
    "مساعدة",
    "ساعدني",
    "يا سديد ماذا تستطيع؟",
  ])("«%s» ⇐ قائمة عربية", (q) => {
    expect(matchHelpIntent(q)).toBe(true);
    const hit = matchZeroCostAnswer(q, GUEST);
    expect(hit?.source).toBe("help");
    expect(hit!.answer).toMatch(/دون محرّك التحليل اللغوي/);
    expect(detectLocale(hit!.answer)).toBe("ar");
  });

  it.each(["help", "Help me", "What can you do?", "commands", "list commands"])(
    "«%s» ⇐ قائمة إنجليزية",
    (q) => {
      const hit = matchZeroCostAnswer(q, GUEST);
      expect(hit?.source).toBe("help");
      expect(hit!.answer).toMatch(/without the language analysis engine/);
      expect(detectLocale(hit!.answer)).toBe("en");
    },
  );

  it("طلب تحليلٍ يبدأ بـ«ساعدني» أو «help» ليس طلب مساعدة", () => {
    expect(matchHelpIntent("ساعدني في تحليل مخاطر المنطقة الشرقية")).toBe(false);
    expect(matchHelpIntent("help me analyze the incident trend")).toBe(false);
    expect(matchHelpIntent("ما الأوامر التي صدرت أمس للمقاولين؟")).toBe(false);
  });

  it("المسجَّل وحده يرى متابعة التنفيذ والموافقات، والسطر الأخير يصدق حال المحرّك", () => {
    expect(helpReply("ar", GUEST)).not.toMatch(/الموافقات/);
    expect(helpReply("ar", MEMBER)).toMatch(/الموافقات المعلّقة/);
    expect(helpReply("en", MEMBER)).toMatch(/pending approvals/);
    expect(helpReply("ar", GUEST)).toMatch(/غير متاح الآن/);
    expect(helpReply("ar", { signedIn: false, engineAvailable: true })).not.toMatch(/غير مفعّل/);
    expect(helpReply("en", { signedIn: false, engineAvailable: true })).toMatch(
      /goes to the language analysis engine/,
    );
  });

  it("والعنوان لا يقول «بلا المحرّك» والمحرّك يعمل", () => {
    const on = { signedIn: false, engineAvailable: true };
    expect(helpReply("ar", on)).not.toMatch(/دون محرّك التحليل/);
    expect(helpReply("ar", on)).toMatch(/^إجاباتٌ حتمية فورية/);
    expect(helpReply("en", on)).not.toMatch(/without the language analysis engine/);
    expect(helpReply("en", on)).toMatch(/^Instant deterministic answers/);
  });

  it("كل أمرٍ تقترحه المساعدة يُجاب حتميًّا فعلًا", () => {
    // «افتح صفحة الصيانة» و«افتح محرك التنفيذ» من نصّ القائمة نفسه.
    for (const q of ["افتح صفحة الصيانة", "افتح محرك التنفيذ", "Open the Execution Engine page"]) {
      expect(matchNavigation(q), q).not.toBeNull();
    }
  });
});

describe("العدّ بالإنجليزية — العدّادات الكنسية نفسها", () => {
  it("how many projects ⇐ الإجمالي بتوزيعه", () => {
    const a = matchEnglishCount("How many projects?");
    expect(a).toContain(String(REAL_PROJECT_COUNTS.total));
    expect(a).toContain(String(REAL_PROJECT_COUNTS.in_progress));
    expect(a).toContain(String(REAL_PROJECT_COUNTS.cancelled));
  });

  it("الحالات التي يدعمها المطابق العربي", () => {
    expect(matchEnglishCount("how many projects are in progress")).toBe(
      `Projects in progress: ${REAL_PROJECT_COUNTS.in_progress}.`,
    );
    expect(matchEnglishCount("number of completed projects")).toBe(
      `Completed projects: ${REAL_PROJECT_COUNTS.completed}.`,
    );
    expect(matchEnglishCount("How many open incidents?")).toBe(
      `Open incidents: ${REAL_INCIDENT_COUNTS.open}.`,
    );
    expect(matchEnglishCount("how many closed incidents")).toBe(
      `Closed incidents: ${REAL_INCIDENT_COUNTS.closed}.`,
    );
    expect(matchEnglishCount("number of preventive work orders")).toBe(
      `Preventive maintenance orders: ${REAL_WORK_ORDER_COUNTS.preventive}.`,
    );
    expect(matchEnglishCount("How many maintenance work orders do we have?")).toContain(
      String(REAL_WORK_ORDER_COUNTS.total),
    );
  });

  it("والجواب الإنجليزي يحمل أرقام الجواب العربي نفسها", () => {
    const ar = matchInstantDataAnswer("كم عدد البلاغات؟")!.answer;
    const en = matchEnglishCount("how many incidents")!;
    const digits = (s: string) => s.match(/\d+/g)?.join(",");
    expect(digits(en)).toBe(digits(ar));
  });

  it("العدّ المقيَّد أو التحليلي لا يُختطف", () => {
    expect(matchEnglishCount("how many projects in Qassim?")).toBeNull();
    expect(matchEnglishCount("number of incidents by region")).toBeNull();
    expect(matchEnglishCount("why did the number of incidents rise?")).toBeNull();
    expect(matchEnglishCount("how many work permits are active?")).toBeNull();
    expect(matchEnglishCount("how many projects and incidents")).toBeNull();
    expect(matchEnglishCount("list the projects")).toBeNull();
    expect(matchEnglishCount("كم عدد المشاريع")).toBeNull();
  });
});

describe("التنقّل — من سجلّ أسماء الشاشات وحده", () => {
  it.each([
    ["افتح صفحة الصيانة", "/sec/maintenance"],
    ["افتح البلاغات", "/sec/incidents"],
    ["اذهب إلى التقارير", "/sec/reports"],
    ["اعرض شاشة التصاريح", "/sec/permits"],
    ["افتح لي الأمن الصناعي من فضلك", "/sec"],
    ["open the maintenance page", "/sec/maintenance"],
    ["Open the incidents", "/sec/incidents"],
    ["open incidents page", "/sec/incidents"],
    ["go to the executive dashboard", "/sec/exec"],
    ["take me to the reports screen", "/sec/reports"],
    ["show me the permits page", "/sec/permits"],
  ])("«%s» ⇐ %s", (q, route) => {
    const hit = matchNavigation(q);
    expect(hit?.route).toBe(route);
    expect(hit!.answer).toContain(`](${route})`);
    expect(SCREEN_NAMES[route]).toBeDefined();
    expect(isRouteHidden(route)).toBe(false);
  });

  it("الوجهة المجهولة أو المحجوبة ⇐ null لا تخمين", () => {
    expect(matchNavigation("افتح صفحة الطقس")).toBeNull();
    expect(matchNavigation("open the weather page")).toBeNull();
    // مؤشرات الأداء /sec/kpi حُجبت بأمر المالك — لا رابط إليها.
    expect(matchNavigation("افتح مؤشرات الأداء")).toBeNull();
    expect(matchNavigation("open live kpis")).toBeNull();
    expect(matchNavigation("افتح غرفة العمليات")).toBeNull();
  });

  it("«اعرض» وحدها فعلُ تحليلٍ لا تنقّل، و«show» كذلك", () => {
    expect(matchNavigation("اعرض المشاريع المتأخرة")).toBeNull();
    expect(matchNavigation("اعرض البلاغات")).toBeNull();
    expect(matchNavigation("show me the incidents")).toBeNull();
  });

  it("«open» بلا أداةٍ ولا كلمة صفحة صفةٌ: «open incidents» سؤالٌ عن المفتوح لا طلب شاشة", () => {
    expect(matchNavigation("open incidents")).toBeNull();
    expect(matchNavigation("Open permits")).toBeNull();
    expect(matchNavigation("open tasks")).toBeNull();
    // والأفعال التي لا تكون صفةً تبقى تنقّلًا بلا أداة.
    expect(matchNavigation("go to incidents")?.route).toBe("/sec/incidents");
  });

  it("كل رابطٍ يُنتج يشير إلى مسارٍ غير محجوب في السجلّ", () => {
    for (const [route, name] of Object.entries(SCREEN_NAMES)) {
      const hit = matchNavigation(`افتح ${name.ar}`);
      if (isRouteHidden(route)) expect(hit, route).toBeNull();
      else expect(hit?.route, route).toBe(route);
    }
  });
});

describe("المدخل الموحّد", () => {
  it("ما ليس أمرًا حتميًّا ⇐ null", () => {
    expect(matchZeroCostAnswer("ما أبرز مخاطر اليوم في المنطقة الشرقية؟", GUEST)).toBeNull();
    expect(matchZeroCostAnswer("Summarise this week's security posture", GUEST)).toBeNull();
    expect(matchZeroCostAnswer("", GUEST)).toBeNull();
  });

  it("المسجَّل والمحرّك بأدواته يبلغه ⇐ المساعدة والتنقّل للمحرّك، والعدّ يبقى حتميًّا", () => {
    const deferred = { signedIn: true, engineAvailable: true, deferCommandsToEngine: true };
    for (const q of ["افتح صفحة الصيانة", "Open the maintenance page", "help", "ماذا تستطيع؟"]) {
      expect(matchZeroCostAnswer(q, deferred), q).toBeNull();
      expect(
        matchZeroCostAnswer(q, { ...deferred, deferCommandsToEngine: false }),
        q,
      ).not.toBeNull();
    }
    expect(matchZeroCostAnswer("How many projects?", deferred)?.source).toBe("count-en");
  });

  it("النصّ الطويل ونصّ المرفقات لا يُطابَقان", () => {
    expect(matchZeroCostAnswer(`help ${"x ".repeat(200)}`, GUEST)).toBeNull();
    expect(matchZeroCostAnswer('مساعدة <attachment name="a.csv">x</attachment>', GUEST)).toBeNull();
  });
});

describe("الردّ حين يحتاج الطلب محرّك التحليل", () => {
  const reasons = ["no_provider", "provider_disabled", "gate_closed"] as const;

  it.each(reasons)("%s — بلغة السائل، بلا مورّد ولا متغيّر بيئة ولا رقم", (reason) => {
    for (const locale of ["ar", "en"] as const) {
      const text = zeroCostUnsupportedReply(locale, reason);
      expect(detectLocale(text)).toBe(locale);
      expect(text).not.toMatch(FORBIDDEN_TEXT);
      expect(text).not.toMatch(/[0-9٠-٩]/);
      expect(isVendorSafe(text)).toBe(true);
    }
  });

  it("يقول ما جرى بصدق ويقترح أمثلةً تعمل", () => {
    expect(zeroCostUnsupportedReply("ar", "no_provider")).toMatch(/غير مفعّل الآن/);
    expect(zeroCostUnsupportedReply("ar", "provider_disabled")).toMatch(/موقوفٌ الآن/);
    expect(zeroCostUnsupportedReply("ar", "gate_closed")).toMatch(/تعذّر التحقّق/);
    expect(zeroCostUnsupportedReply("en", "no_provider")).toMatch(/zero-cost mode/);
    expect(zeroCostUnsupportedReply("ar", "no_provider")).toContain("كم عدد المشاريع؟");
  });

  it("كل مثالٍ مقترح يُجاب حتميًّا فعلًا — لا وعد بأمرٍ لا يعمل", () => {
    for (const locale of ["ar", "en"] as const) {
      for (const q of ZERO_COST_EXAMPLES[locale]) {
        const answered = matchInstantDataAnswer(q) ?? matchZeroCostAnswer(q, GUEST);
        expect(answered, q).not.toBeNull();
      }
    }
  });

  it("قائمة المساعدة خمسة أسطر سقفًا بلا حشو في كل تركيبة (المادة ٢٢ §٢ — نقض الحارس)", () => {
    for (const locale of ["ar", "en"] as const) {
      for (const signedIn of [false, true]) {
        for (const engineAvailable of [false, true]) {
          const text = helpReply(locale, { signedIn, engineAvailable });
          expect(
            text.split("\n").length,
            `${locale}/${signedIn}/${engineAvailable}`,
          ).toBeLessThanOrEqual(5);
          expect(hasForbiddenFiller(text)).toBe(false);
        }
      }
    }
  });

  it("وقوائم المساعدة تعبر القناع سليمة", () => {
    for (const locale of ["ar", "en"] as const) {
      for (const opts of [GUEST, MEMBER, { signedIn: true, engineAvailable: true }]) {
        const text = helpReply(locale, opts);
        expect(isVendorSafe(text)).toBe(true);
        expect(text).not.toMatch(FORBIDDEN_TEXT);
      }
    }
  });
});
