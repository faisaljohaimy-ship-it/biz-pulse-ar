// @vitest-environment node
/**
 * مصنِّف حاجة السؤال إلى الويب، جدول أسئلة بالعربية والإنجليزية وحدّية، ومعه كاشفٌ مجرَّبٌ على مصنِّفاتٍ
 * مزروعة (المادة ٣٠): مصنِّف «حداثةٍ فقط» ومصنِّف «يبحث عن كل شيء» ومصنِّف «لا يبحث عن شيء» كلٌّ منها
 * يُدان بصفٍّ مسمّى في الجدول، فلا يمرّ الجدول أخضر لأنه لا يرى شيئًا.
 */
import { describe, expect, it } from "vitest";
import { classifyWebNeed, foldForNeed, type WebNeed, type WebNeedKind } from "./web-need.server";
import { isInScope } from "@/lib/sadeed/response-contract";
import { sadeedModeFor } from "@/lib/n8n/brief.server";

interface Row {
  readonly q: string;
  readonly kind: WebNeedKind | null;
  readonly why: string;
}

/** `kind: null` ⇒ لا يُبحث. الصفوف مجمَّعة بما يحرسه كلٌّ منها. */
const TABLE: readonly Row[] = [
  // ── تنظيمي: إطار خارجي ───────────────────────────────────────────────────
  {
    q: "هل صدر تحديث على نظام حماية البيانات الشخصية هذا العام؟",
    kind: "regulatory",
    why: "PDPL + تغيّر",
  },
  { q: "ما عقوبة مخالفة نظام حماية البيانات الشخصية؟", kind: "regulatory", why: "PDPL + جزاء" },
  {
    q: "ما متطلبات الضوابط الأساسية للأمن السيبراني من الهيئة الوطنية؟",
    kind: "regulatory",
    why: "NCA + متطلبات",
  },
  {
    q: "What does NCA ECC require for access control?",
    kind: "regulatory",
    why: "NCA ECC + require",
  },
  { q: "latest ZATCA e-invoicing update", kind: "regulatory", why: "ZATCA + latest" },
  {
    q: "ما الساري حاليا من لائحة نظام العمل في الإجازات؟",
    kind: "regulatory",
    why: "نظام العمل + حالي",
  },
  {
    q: "Is the Saudi labour law amendment in force?",
    kind: "regulatory",
    why: "labour law + amendment",
  },
  // ── تنظيمي: مرجع HCIS (يلزم تغيّر صريح) ──────────────────────────────────
  { q: "هل صدر تعديل على التوجيه SEC-12 هذا العام؟", kind: "regulatory", why: "HCIS + تعديل صريح" },
  {
    q: "ما الجديد في توجيهات الهيئة العليا للأمن الصناعي؟",
    kind: "regulatory",
    why: "HCIS + جديد",
  },
  { q: "ما نطاق التوجيه SEC-12؟", kind: null, why: "HCIS بلا تغيّر: الفهرس الداخلي يجيب" },
  {
    q: "ما خطوات إصدار تصريح العمل حسب SAF-03؟",
    kind: null,
    why: "HCIS: «إصدار تصريح» ليس تغيّرًا في اللائحة",
  },
  { q: "اشرح مراحل اعتماد التوجيه SEC-07", kind: null, why: "HCIS داخلي" },
  // ── معايير ──────────────────────────────────────────────────────────────
  { q: "ما متطلبات NFPA 101 للمخارج؟", kind: "standard", why: "معيار + متطلبات" },
  { q: "ما أحدث إصدار من ISO 27001؟", kind: "standard", why: "معيار + أحدث" },
  { q: "What are the clauses of IEC 62443-3-3?", kind: "standard", why: "معيار + clauses" },
  { q: "latest OSHA fall protection rule update", kind: "standard", why: "OSHA + latest" },
  // المواصفات والكود السعودية الحكومية نصٌّ إلزامي: `regulatory` لا `standard` فيبحث التطبيق فيها بمضيف gov.sa
  // وحده (المادة ٩). كانت `standard` والوضع `general` فتصل إلى مدوّنات وويكيبيديا (مراجعة الإصلاح ٢٠٢٦/١٠/٣٠).
  {
    q: "ما المتطلبات الحالية في المواصفة القياسية السعودية للحريق؟",
    kind: "regulatory",
    why: "مواصفة سعودية رسمية + حالي",
  },
  {
    q: "ما متطلبات كود البناء السعودي SBC 801 للحماية من الحريق؟",
    kind: "regulatory",
    why: "كود البناء السعودي + متطلبات",
  },
  {
    q: "ما آخر تحديث لمتطلبات الهيئه السعوديه للمواصفات في الحريق؟",
    kind: "regulatory",
    why: "هيئة المواصفات بالتاء المربوطة هاءً + آخر تحديث",
  },
  {
    q: "What are the current requirements of the Saudi Building Code for fire protection?",
    kind: "regulatory",
    why: "Saudi Building Code + current",
  },
  // الدولي يبقى معيارًا عامًّا: ليس نصًّا نظاميًّا سعوديًّا.
  { q: "ما متطلبات معيار ISO 45001 للسلامة المهنية؟", kind: "standard", why: "ISO دولي + متطلبات" },
  // الكتابة تُطوى قبل المطابقة: الإطار بالإنجليزية أو بلا همزة أو بتاء مربوطة هاءً أو بتشكيل.
  {
    q: "latest news on the Saudi personal data protection law amendments",
    kind: "news",
    why: "PDPL بالإنجليزية: أخبار تسبق التنظيمي",
  },
  {
    q: "ما احدث تعديلات نظام حمايه البيانات الشخصيه؟",
    kind: "regulatory",
    why: "PDPL بالهاء وبلا همزة + احدث",
  },
  { q: "ما هو ISO 27001؟", kind: null, why: "تعريفٌ مجرّد لمعيار" },
  { q: "ما معايير تقييم المخاطر لدينا؟", kind: null, why: "«معايير» داخلية بلا جهة خارجية" },
  // ── أخبار ───────────────────────────────────────────────────────────────
  { q: "آخر أخبار حوادث الحريق في المصانع", kind: "news", why: "أخبار + نطاق" },
  {
    q: "latest news about incident response at industrial facilities",
    kind: "news",
    why: "news + incident",
  },
  { q: "ماذا حدث في حادث الحريق الأخير بالمنطقة الصناعية؟", kind: "news", why: "ماذا حدث" },
  // ── ثغرات ───────────────────────────────────────────────────────────────
  { q: "ما تفاصيل CVE-2025-12345 على كاميرات المراقبة؟", kind: "advisory", why: "CVE" },
  { q: "هل صدرت ثغرة جديدة في أنظمة التحكم بالدخول؟", kind: "advisory", why: "ثغرة + جديد" },
  { q: "ما هي الثغرات الأمنية؟", kind: null, why: "ثغرة بلا تغيّر: تعريف" },
  // ── داخلي تشغيلي: حداثة بلا موضوع خارجي ───────────────────────────────────
  { q: "ما آخر بلاغ سجلناه في الموقع الغربي؟", kind: null, why: "آخر بلاغ داخلي" },
  { q: "أعطني أحدث تصريح عمل ساخن", kind: null, why: "أحدث تصريح داخلي" },
  { q: "ما الوضع الحالي للدوريات في المنطقة الشرقية؟", kind: null, why: "حالي داخلي" },
  {
    q: "show the latest incident and current patrol status",
    kind: null,
    why: "latest/current داخليان",
  },
  { q: "كم عدد المشاريع المحدثة هذا العام؟", kind: null, why: "تحديث/عام داخلي بلا إطار" },
  {
    q: "ما أهمية الأمن السيبراني للمنشآت الصناعية؟",
    kind: null,
    why: "إطارٌ عام بلا طلب نصّ/تغيّر",
  },
  // ── حدّية ───────────────────────────────────────────────────────────────
  { q: "", kind: null, why: "فارغ" },
  { q: "تحديث", kind: null, why: "أقصر من الحدّ" },
  { q: "مرحبا", kind: null, why: "تحية" },
];

describe("المصنِّف: جدول الأسئلة", () => {
  for (const row of TABLE) {
    it(`${row.kind ?? "لا بحث"} ⇐ ${row.q || "(فارغ)"} | ${row.why}`, () => {
      const got = classifyWebNeed(row.q);
      expect(got.kind).toBe(row.kind);
      expect(got.need).toBe(row.kind !== null);
    });
  }

  it("عقد المصنِّف والمختار: كل صفٍّ صنّفه المصنِّف `regulatory` يقرأه مختار الوضع `regulatory` (المادة ٩: لا بحث عامّ لتنظيمي)", () => {
    const regulatoryRows = TABLE.filter((r) => r.kind === "regulatory");
    expect(regulatoryRows.length).toBeGreaterThanOrEqual(10);
    for (const row of regulatoryRows) {
      expect(sadeedModeFor(row.q), row.q).toBe("regulatory");
    }
    // وعكسه حدٌّ مقصود: معيارٌ دولي أو خبرٌ أو تنبيهٌ بلا إطار يبقى general.
    for (const row of TABLE.filter((r) => r.kind === "standard")) {
      expect(sadeedModeFor(row.q), row.q).toBe("general");
    }
  });

  it("الجدول يغطي الأصناف الأربعة والرفض (لا جدول أحادي الجانب)", () => {
    const kinds = new Set(TABLE.map((r) => r.kind));
    for (const k of ["regulatory", "standard", "news", "advisory", null] as const) {
      expect(kinds.has(k), String(k)).toBe(true);
    }
    expect(TABLE.filter((r) => r.kind === null).length).toBeGreaterThanOrEqual(10);
    expect(TABLE.filter((r) => r.kind !== null).length).toBeGreaterThanOrEqual(15);
  });

  it("نتيجة غير النصّ ⇒ لا بحث (لا رمي)", () => {
    expect(classifyWebNeed(undefined as unknown as string)).toEqual({ need: false, kind: null });
    expect(classifyWebNeed(42 as unknown as string)).toEqual({ need: false, kind: null });
  });
});

describe("التوحيد: ما يُخفي الكلمةَ لا يُخفي الحاجة", () => {
  it("تشكيل وتطويل وهمزات وأرقام هندية وأحرف تنسيق", () => {
    const plain = classifyWebNeed("هل صدر تحديث على نظام حماية البيانات الشخصية هذا العام؟");
    expect(plain.kind).toBe("regulatory");
    // تشكيل + تطويل داخل الكلمة المفتاحية
    expect(classifyWebNeed("هل صَـدَرَ تَحْدِيـثٌ على نظام حماية البيانات الشخصية؟").kind).toBe(
      "regulatory",
    );
    // حرف اتجاه خفي بين الحروف
    expect(classifyWebNeed("هل صدر تحدي‏ث على نظام حماية البيانات الشخصية؟").kind).toBe(
      "regulatory",
    );
    // سنة بأرقام هندية
    expect(classifyWebNeed("ما متطلبات NFPA ١٠١ لعام ٢٠٢٦؟").kind).toBe("standard");
    expect(foldForNeed("٢٠٢٦ ۱۲")).toBe("2026 12");
    expect(foldForNeed("أإآ ى ة")).toBe("ااا ي ه");
  });

  it("الإدخال الطويل يُقصّ لا يُهمل: الجزء الأول وحده يُقرأ", () => {
    const long = `${"ما متطلبات NFPA 101 للمخارج؟ "}${"x".repeat(5_000)}`;
    expect(classifyWebNeed(long).kind).toBe("standard");
    const tailOnly = `${"x ".repeat(600)}متطلبات NFPA 101`;
    expect(classifyWebNeed(tailOnly).kind).toBeNull();
  });
});

describe("النطاق: الخارج عن النطاق لا يمرّ إلى المصنِّف من المسار الحقيقي", () => {
  it("«أخبار» و«news» وحدهما خارج النطاق (المادة ٢٢)، فلا ذراع قبل سطر الرفض", () => {
    expect(isInScope("ما آخر الأخبار؟")).toBe(false);
    expect(isInScope("latest news")).toBe(false);
    // ومعهما كلمةٌ صناعية-أمنية يصيران ضمن النطاق ويصنَّفان أخبارًا.
    expect(isInScope("آخر أخبار حوادث الحريق في المصانع")).toBe(true);
  });
});

// ── المادة ٣٠: كاشفٌ مجرَّبٌ على مصنِّفاتٍ مزروعة ────────────────────────────────

/** فشلُ مصنِّفٍ ما على الجدول: كل صفٍّ يخالفه. */
function failures(classify: (q: string) => WebNeed): string[] {
  return TABLE.filter((r) => classify(r.q).kind !== r.kind).map((r) => r.q || "(فارغ)");
}

describe("مزروع: مصنِّفات معيبة تُدان بالجدول نفسه", () => {
  it("الحقيقي: صفر مخالفات", () => {
    expect(failures(classifyWebNeed)).toEqual([]);
  });

  it("«حداثةٌ فقط» يبحث في كل سؤال فيه آخر/أحدث/حالي ⇒ يُدان بالأسئلة الداخلية", () => {
    const recencyOnly = (q: string): WebNeed =>
      /آخر|أحدث|حالي|latest|current/i.test(q)
        ? { need: true, kind: "regulatory" }
        : { need: false, kind: null };
    const bad = failures(recencyOnly);
    expect(bad).toContain("ما آخر بلاغ سجلناه في الموقع الغربي؟");
    expect(bad).toContain("show the latest incident and current patrol status");
  });

  it("«يبحث عن كل شيء» يُدان", () => {
    const everything = (): WebNeed => ({ need: true, kind: "regulatory" });
    expect(failures(everything).length).toBeGreaterThanOrEqual(10);
  });

  it("«لا يبحث عن شيء» يُدان", () => {
    const nothing = (): WebNeed => ({ need: false, kind: null });
    expect(failures(nothing).length).toBeGreaterThanOrEqual(15);
  });

  it("«HCIS كأي إطار» يبحث في نطاق التوجيه الداخلي ⇒ يُدان", () => {
    const hcisAsFrame = (q: string): WebNeed =>
      /SEC-|SAF-/i.test(q) ? { need: true, kind: "regulatory" } : classifyWebNeed(q);
    const bad = failures(hcisAsFrame);
    expect(bad).toContain("ما نطاق التوجيه SEC-12؟");
  });

  it("«تعريف المعيار يُبحث له» يُدان", () => {
    const defineToo = (q: string): WebNeed =>
      /iso\s?\d+/i.test(q) ? { need: true, kind: "standard" } : classifyWebNeed(q);
    expect(failures(defineToo)).toContain("ما هو ISO 27001؟");
  });
});
