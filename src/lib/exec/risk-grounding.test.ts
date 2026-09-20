/**
 * إسناد المخاطر المتوقَّعة.
 *
 * المحروس هنا **أن رقمًا يخترعه النموذج لا يصل شاشةً أمنية تنفيذية.**
 * الموجِّه كان يقول «Do not add facts beyond the signal» — رجاءً لا قيدًا؛
 * فصار الفحص هو الحاجز، وهذه الاختبارات هي ما يُبقيه حاجزًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  allowedNumbersOf,
  confidenceOf,
  incidentEvidence,
  judgeNarration,
  namesOtherSite,
  numbersIn,
  siteKey,
  type RiskSignal,
} from "./risk-grounding";
import { hasEvidence } from "@/lib/evidence/gate";
import { measured } from "@/lib/evidence/evidence";

const signal: RiskSignal = {
  siteId: "site-7",
  total7d: 12,
  critical7d: 3,
  last24h: 4,
  z: 2.34,
};

describe("① استخراج الأرقام — بالعربية كما باللاتينية", () => {
  it("يقرأ اللاتينية والعربية-الهندية والفارسية", () => {
    // لوحة المفاتيح العربية تكتب ٤٣؛ ورقمٌ لا يُقرأ لا يُفحَص، فيمرّ.
    expect(numbersIn("12 بلاغًا")).toEqual([12]);
    expect(numbersIn("٤٣ درجة")).toEqual([43]);
    expect(numbersIn("۳۴ مقاولًا")).toEqual([34]);
  });

  it("ويقرأ العشريّ", () => {
    expect(numbersIn("z=2.34")).toEqual([2.34]);
  });

  it("ولا يعثر على رقمٍ في نصٍّ بلا أرقام", () => {
    expect(numbersIn("ضغط متصاعد في الموقع")).toEqual([]);
  });
});

describe("② المسموح — العدّات ونافذتا القياس والأفق", () => {
  it("العدّات المرصودة مسموحة", () => {
    const allowed = allowedNumbersOf(signal, 24);
    for (const n of [12, 3, 4]) expect(allowed.has(n)).toBe(true);
  });

  it("ونافذتا القياس ٧ و٢٤ مسموحتان — تظهران بحقٍّ لا اختراعًا", () => {
    const allowed = allowedNumbersOf(signal, 24);
    expect(allowed.has(7)).toBe(true);
    expect(allowed.has(24)).toBe(true);
  });

  it("وما ليس منها ليس مسموحًا", () => {
    const allowed = allowedNumbersOf(signal, 24);
    expect(allowed.has(43)).toBe(false);
    expect(allowed.has(34)).toBe(false);
  });
});

describe("③ الحكم — الصياغة تمرّ والوقائع العددية لا", () => {
  it("نصٌّ يعيد صياغة العدّات المقيسة **يُقبل**", () => {
    // هذا هو المكسب المقصود من النموذج: لغةٌ تنفيذية فوق قياسٍ صحيح.
    const v = judgeNarration(
      ["ضغط متصاعد", "12 بلاغًا خلال 7 أيام منها 3 حرجة و4 في آخر 24 ساعة."],
      signal,
      24,
    );
    expect(v.accepted).toBe(true);
    expect(v.ungrounded).toEqual([]);
  });

  it("**ونصٌّ يخترع رقمًا يُرفض** — والرقم المخترَع يُسمّى", () => {
    // «٣٤ مقاولًا» و«٤٣°» هما بالضبط ما تحمله المحاكاة المرجعية؛ ولو
    // كتبهما النموذج عن موقعٍ حقيقيّ لقُرئا قياسًا على منشأة.
    const v = judgeNarration(["ازدحام متوقع", "تزامن 34 مقاولًا مع حرارة 43 درجة."], signal, 24);
    expect(v.accepted).toBe(false);
    expect(v.ungrounded).toEqual(expect.arrayContaining([34, 43]));
  });

  it("ويُرفض النصّ الفارغ — بندُ خطرٍ بلا سبب أسوأ من بطاقةٍ حتميّة", () => {
    expect(judgeNarration(["عنوان", "   "], signal, 24).accepted).toBe(false);
  });

  it("ورقمٌ واحدٌ بلا أصل يكفي للرفض ولو صحّ سائر النصّ", () => {
    const v = judgeNarration(["12 بلاغًا خلال 7 أيام، وتغطية 9٪ مفقودة."], signal, 24);
    expect(v.accepted).toBe(false);
    expect(v.ungrounded).toEqual([9]);
  });

  it("والأفق المعلَن مسموح — يُمرَّر كما فُحص لا كما افتُرض", () => {
    expect(judgeNarration(["خلال 18 ساعة"], signal, 18).accepted).toBe(true);
    expect(judgeNarration(["خلال 18 ساعة"], signal, 24).accepted).toBe(false);
  });
});

describe("④ الثقة — مصطلحٌ لا نسبة، و`measured` لا تُمنح هنا", () => {
  it("العيّنة الكافية تُعطي مشتقًّا", () => {
    expect(confidenceOf(signal)).toBe("derived");
  });

  it("والعيّنة الصغيرة تقديريّ — لا تُرفَّع بصياغةٍ واثقة", () => {
    expect(confidenceOf({ ...signal, total7d: 2 })).toBe("estimated");
  });

  it("**ولا يُعاد `measured` بحال**: العدّ مقيس، وكونُه «خطرًا متوقَّعًا» استنتاج", () => {
    for (const total of [0, 1, 4, 5, 50, 500]) {
      expect(confidenceOf({ ...signal, total7d: total })).not.toBe("measured");
    }
  });
});

describe("⑤ الدليل — يجتاز حارس FR-19 ويُقبل في طبقة الإسناد", () => {
  const at = "2026-09-20T10:00:00.000Z";

  it("دليلٌ صالحٌ مُسنَدٌ إلى الموقع", () => {
    const e = incidentEvidence(signal, at);
    expect(hasEvidence(e)).toBe(true);
    expect(e.entity).toEqual({ kind: "site", id: "site-7" });
    expect(e.source).toBe("sec_incidents");
  });

  it("وطبقة الإسناد تقبله — لا حكمان على دليلٍ واحد", () => {
    expect(() => measured(12, [incidentEvidence(signal, at)])).not.toThrow();
  });

  it("والعيّنة الصغيرة تُعلن حدّها مع ما يُبنى عليها", () => {
    // الحدّ المعروف يُذكر مع الرقم لا بعد أن يُتصرَّف به.
    expect(incidentEvidence({ ...signal, total7d: 2 }, at).limitation).toMatch(/عيّنة صغيرة/);
    expect(incidentEvidence(signal, at).limitation).toBeUndefined();
  });
});

describe("⑥ المطابقة بالهويّة — لا بالترتيب", () => {
  it("مفتاح الموقع يوحّد الفراغ وحالة الحرف", () => {
    expect(siteKey("  Riyadh  Plant ")).toBe("riyadh plant");
    expect(siteKey("RIYADH PLANT")).toBe(siteKey("riyadh plant"));
    expect(siteKey(undefined)).toBe("");
    expect(siteKey(null)).toBe("");
  });

  it("**ونصٌّ يذكر موقعًا آخر يُرفض** ولو طابق حقلُ `site`", () => {
    // الاسم في المتن هو ما يقرؤه المسؤول، لا الحقل. وبلاغٌ صحيح منسوبٌ
    // إلى المكان الخطأ أسوأ من رفض الصياغة.
    const own = ["محطة الرياض", "Riyadh Plant"];
    const others = ["محطة الرياض", "Riyadh Plant", "محطة جدة", "Jeddah Plant"];
    expect(namesOtherSite(["ضغط متصاعد في محطة جدة"], own, others)).toBe(true);
    expect(namesOtherSite(["Rising pressure at Jeddah Plant"], own, others)).toBe(true);
  });

  it("ونصٌّ يذكر موقعه وحده يمرّ", () => {
    const own = ["محطة الرياض", "Riyadh Plant"];
    const others = ["محطة الرياض", "Riyadh Plant", "محطة جدة", "Jeddah Plant"];
    expect(namesOtherSite(["ضغط متصاعد في محطة الرياض"], own, others)).toBe(false);
    expect(namesOtherSite(["ضغط متصاعد"], own, others)).toBe(false);
  });

  it("والاسم المشترك بين موقعين لا يُعدّ ذكرًا لغيره", () => {
    // موقعٌ اسمه يطابق اسم آخر حرفًا ليس «موقعًا آخر».
    expect(namesOtherSite(["Riyadh Plant"], ["Riyadh Plant"], ["Riyadh Plant"])).toBe(false);
  });
});

describe("⑦ عقد المسار — ما لا يجوز أن ينقلب بصمت", () => {
  const SRC = readFileSync("src/lib/exec/predictive.functions.ts", "utf8");

  it("نصّ النموذج لا يُؤخذ إلا بعد `judgeNarration`", () => {
    // كان `why_ar: String(r.why_ar ?? "")` يمرّ حرفيًّا إلى الشاشة.
    expect(SRC).toMatch(/judgeNarration\(/);
    expect(SRC).toMatch(/if \(!verdict\.accepted\)/);
  });

  it("والمرفوض يسقط إلى البطاقة الحتميّة لا إلى لا شيء", () => {
    // حذفُ البند يترك الموقع الأخطر بلا بطاقة — وهو نقيض المقصود.
    expect(SRC).toMatch(/if \(!verdict\.accepted\) \{[\s\S]{0,400}?return base;/);
  });

  it("والشدّة والثقة من القياس لا من النموذج", () => {
    expect(SRC).toMatch(/severity: base\.severity/);
    expect(SRC).toMatch(/confidence: base\.confidence/);
  });

  it("ولا نسبة ثقة عددية تُبنى من ردّ النموذج", () => {
    expect(SRC, "عاد رقم الثقة من النموذج").not.toMatch(/Number\(r\.confidence/);
  });

  it("**والمطابقة بالهويّة لا بالفهرس** — `raw[idx]` لا تعود", () => {
    // كانت `const r = raw[idx]`، فلو أعاد النموذج الترتيب لالتصقت صياغةُ
    // موقعٍ بعدّات آخر. والفحص العدديّ يلتقط أكثر الحالات، لكن موقعين
    // بعدّاتٍ متطابقة يمرّان.
    expect(SRC, "عادت المطابقة بالفهرس").not.toMatch(/const r = raw\[idx\]/);
    expect(SRC).toMatch(/bySite\.get\(siteKey\(/);
  });

  it("والنموذج مُلزَمٌ بنسخ اسم الموقع حرفيًّا", () => {
    expect(SRC).toMatch(/copied verbatim from the `site=` value/);
  });

  it("وحارس ذكر موقعٍ آخر قائم", () => {
    expect(SRC).toMatch(/namesOtherSite\(texts, ownNames, allSiteNames\)/);
  });

  it("وكل بندٍ يخرج مُسنَدًا", () => {
    expect(SRC).toMatch(/evidence: \[incidentEvidence\(signal, observedAt\)\]/);
  });
});
