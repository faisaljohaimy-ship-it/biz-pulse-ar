/**
 * عقد التطبيع العربي — كل قاعدة لها حالة، وكل كاشف يُثبت أنه يحمرّ (المادة ٣٠).
 *
 * ## التكافؤ مع SQL يُقاس من نصّ ملف الترحيل لا من ذاكرة الكاتب
 *
 * الاختبار يقرأ `normalize_ar` من ملف الترحيل، يستخرج سلسلتَي `translate`
 * وصنف `regexp_replace`، ويحاكي دلالة Postgres حرفيًّا («الأحرف الزائدة في
 * المصدر تُحذف»)، ثم يقارن المرآة بالمحاكاة على كل حرف مصدر وعلى عيّنات.
 * فلو تغيّر نصّ SQL يومًا احمرّت المرآة من تلقاء نفسها. وما **لا** يقيسه:
 * التطابق مع الدالّة المثبَّتة فعلًا في قاعدة الإنتاج (لم يُقَس — لا قاعدة
 * هنا، والترحيلات ليست مصدر الحقيقة لمخطّطها)، ولا سلوك `lower()` على
 * لاتيني غير ASCII (ترويسة الوحدة).
 *
 * ## الأحرف الخفيّة تُكتب بنقاط رموزها — ويحرسه فحصٌ على البايتات
 *
 * التطويل والفواصل الصفرية وعلامات الاتجاه هنا مكتوبة `\uXXXX` لا بالحرف
 * نفسه: حرفٌ خفيّ خام يُحذف بتحريرٍ عابر فتصير الحالة «نص ← نص» وتمرّ فارغةً.
 * الحارس أدناه يقرأ بايتات هذا الملف وملف الوحدة ويحمرّ على أي حرفٍ خفيّ خام،
 * ويثبت احمراره على نصٍّ مزروع يحمل تطويلًا خامًا. (ولا تطويل كاشيدة في نثر
 * الملفين — المسح يغطّي الملف كلّه.)
 *
 * ## الحالة المزروعة
 *
 * نسخة «مُصلَحة» من المرآة تطوي `ﺔ→ه` (وهو الصواب لغويًّا) تخالف المحاكاة —
 * فيثبت الكاشف أنه يرى عيب الطول في SQL ولا يمرّره.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeArLight, normalizeArSqlParity, normalizeArStrict } from "./normalize-ar.server";

const MIGRATIONS = "supabase/migrations";
const APPLIED_FILE = readdirSync(MIGRATIONS).find((f) => f.startsWith("20260727212435_"));
if (!APPLIED_FILE) throw new Error("ملف ترحيل normalize_ar غير موجود");
const SQL = readFileSync(`${MIGRATIONS}/${APPLIED_FILE}`, "utf8");

const UNIT_PATH = "src/lib/retrieval/normalize-ar.server.ts";
const SELF_PATH = "src/lib/retrieval/normalize-ar.contract.test.ts";

/** التطويل بنقطة رمزه لا بالحرف الخفيّ — كي لا يُحذف بتحريرٍ عابر فيصير الاختبار «مد ← مد». */
const TATWEEL = "\u0640";

/**
 * الأحرف الخفيّة التي لا يجوز أن ترد خامًا في الملفين: التطويل، الشرطة اللينة،
 * واصل الحروف U+034F، علامة الاتجاه العربية، الفواصل الصفرية وعلامات الاتجاه
 * U+200B–U+200F، واصل الكلمات ومعزولات الاتجاه U+2060–U+2069، وBOM.
 */
// U+034F علامة مركّبة (Mn) فتُكتب بديلًا لا داخل الصنف — وإلا قرأها eslint حرفًا مركّبًا على ما قبله.
const RAW_INVISIBLES = /\u034F|[\u0640\u00AD\u061C\u200B-\u200F\u2060-\u2069\uFEFF]/u;

/** يستخرج `translate(COALESCE(_input, ''), 'from', 'to')` والصنف المحذوف من نصّ الدالّة. */
function readSqlRules(sql: string) {
  const start = sql.indexOf("FUNCTION public.normalize_ar");
  const fn = sql.slice(start, sql.indexOf("$$;", start) + 3);
  const translate = fn.match(
    /translate\(\s*COALESCE\(_input, ''\),\s*(?:--[^\n]*\n\s*)?'([^']*)',\s*'([^']*)'/,
  );
  const strip = fn.match(/regexp_replace\([\s\S]*?'\[((?:\\u[0-9A-Fa-f]{4}-?)+)\]',\s*'',\s*'g'/);
  if (!translate || !strip) throw new Error("تعذّر قراءة قواعد normalize_ar من الترحيل");
  const from = Array.from(translate[1]);
  const to = Array.from(translate[2]);
  const cls = strip[1].replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16)),
  );
  return { from, to, stripClass: new RegExp(`[${cls}]`, "g") };
}

/** دلالة `translate` في Postgres: حرفٌ بحرف، والزائد في المصدر يُحذف. */
function pgTranslate(input: string, from: string[], to: string[]): string {
  let out = "";
  for (const ch of input) {
    const i = from.indexOf(ch);
    if (i < 0) out += ch;
    else if (i < to.length) out += to[i];
  }
  return out;
}

const RULES = readSqlRules(SQL);
const simulateSql = (s: string) =>
  pgTranslate(s, RULES.from, RULES.to).replace(RULES.stripClass, "").toLowerCase();

describe("الأحرف الخفيّة بنقاط رموزها — حارس على البايتات (المادة ٣٠)", () => {
  const unit = readFileSync(UNIT_PATH, "utf8");
  const self = readFileSync(SELF_PATH, "utf8");

  it("لا حرف خفيّ خام في الوحدة ولا في هذا الملف", () => {
    expect(unit).not.toMatch(RAW_INVISIBLES);
    expect(self).not.toMatch(RAW_INVISIBLES);
  });

  it("الأصناف مكتوبة بالهروب فعلًا — كما تدّعي ترويسة الوحدة", () => {
    for (const esc of ["\\u0640", "\\u064B-\\u0652", "\\u0670", "\\uFE94", "\\u0660-\\u0669"]) {
      expect(unit, esc).toContain(esc);
    }
    for (const esc of [
      "\\u0640",
      "\\u200C",
      "\\uFEFF",
      "\\u200F",
      "\\u061C",
      "\\u2060",
      "\\u00AD",
      "\\u034F",
    ]) {
      expect(self, esc).toContain(esc);
    }
  });

  it("مزروع: نصّ يحمل تطويلًا أو فاصلًا صفريًّا خامًا يُدان بالكاشف نفسه", () => {
    expect(RAW_INVISIBLES.test(`const T = "${TATWEEL}";`)).toBe(true);
    expect(RAW_INVISIBLES.test(`"می\u200Cخواهم"`)).toBe(true);
    // والهروب نفسه كنصٍّ لا يُدان — فالكاشف يرى الحرف لا كتابته.
    expect(RAW_INVISIBLES.test('const T = "\\u0640";')).toBe(false);
  });
});

describe("normalizeArSqlParity — مرآة normalize_ar كما في ملف الترحيل", () => {
  it("قواعد SQL قُرئت من الملف: ١٦ مصدرًا و١٥ هدفًا (عيب الطول حقيقي لا مفترض)", () => {
    expect(RULES.from).toHaveLength(16);
    expect(RULES.to).toHaveLength(15);
  });

  it("كل حرف مصدر في translate يُطبَّع كما يطبّعه نصّ الترحيل", () => {
    expect(RULES.from.length).toBeGreaterThan(0);
    for (const ch of RULES.from) {
      const probe = `x${ch}y`;
      expect(normalizeArSqlParity(probe), `U+${ch.codePointAt(0)!.toString(16)}`).toBe(
        simulateSql(probe),
      );
    }
  });

  it.each([
    ["أإآ ٱٲٳ ﺃﺇﺁ", "ااا ااا ااا"], // ألفات ← ا
    ["ةﺓ", "هه"], // تاء مربوطة ← ه
    ["ﺔ", "ي"], // عيب الطول: الثاني عشر يقع على ي
    ["ىﯨﯩ", "ييي"], // ألف مقصورة ← ي
    [`م${TATWEEL.repeat(3)}د`, "مد"], // التطويل يُحذف
    ["مُحَمَّدٌ", "محمد"], // التشكيل يُحذف
    ["رحمٰن", "رحمن"], // الألف الخنجرية U+0670
    ["ABC Def", "abc def"], // لاتيني ← صغير
    ["مسؤول شيئ", "مسؤول شيئ"], // ؤ/ئ لا تُطوى — تكافؤ لا إصلاح
    ["٢٠٢٦", "٢٠٢٦"], // الأرقام الهندية تبقى — تكافؤ لا إصلاح
  ])("%s ← %s", (input, expected) => {
    expect(normalizeArSqlParity(input)).toBe(expected);
    expect(simulateSql(input)).toBe(expected);
  });

  it("null/undefined ⇐ سلسلة فارغة كما COALESCE", () => {
    expect(normalizeArSqlParity(null)).toBe("");
    expect(normalizeArSqlParity(undefined)).toBe("");
  });

  it("مزروع: مرآة «مُصلَحة» تطوي ﺔ→ه تخالف SQL — فالكاشف يرى عيب الطول", () => {
    const corrected = (s: string) => normalizeArSqlParity(s.replace(/ﺔ/g, "ة"));
    expect(corrected("ﺔ")).toBe("ه");
    expect(corrected("ﺔ")).not.toBe(simulateSql("ﺔ"));
  });
});

describe("normalizeArStrict — الطيّ الصارم للفهرس الذاكري", () => {
  const cases: Array<[string, string, string]> = [
    ["ألفات", "أإآٱٲٳ", "اااااا"],
    ["أشكال العرض عبر NFKC", "ﺃﺇﺁ ﻻ", "ااا لا"],
    ["تاء مربوطة بشكليها", "ةﺔ", "هه"],
    ["ألف مقصورة وياء فارسية", "ىی", "يي"],
    ["كاف فارسية", "ک", "ك"],
    ["واو همزة", "مسؤول", "مسوول"],
    ["ياء همزة", "شيئ", "شيي"],
    ["تشكيل", "مُحَمَّدٌ", "محمد"],
    ["ألف خنجرية", "رحمٰن", "رحمن"],
    ["علامة الملحق العربي A (U+08F0 فتحتان مفتوحتان)", "ن\u08F0ص", "نص"],
    ["تطويل", `م${TATWEEL.repeat(3)}د`, "مد"],
    ["فاصل صفري ZWNJ", "می\u200Cخواهم", "ميخواهم"],
    ["علامات اتجاه وBOM", "\uFEFFنص\u200F", "نص"],
    ["علامة الاتجاه العربية U+061C داخل كلمة", "الأمن\u061Cية", "الامنيه"],
    ["واصل الكلمات U+2060 داخل كلمة", "الأمن\u2060ية", "الامنيه"],
    ["الشرطة اللينة U+00AD داخل كلمة", "الأمن\u00ADية", "الامنيه"],
    ["واصل الحروف U+034F داخل كلمة", "الأمن\u034Fية", "الامنيه"],
    ["أرقام هندية", "٢٠٢٦", "2026"],
    ["أرقام فارسية", "۲۰۲۶", "2026"],
    ["عرض كامل لاتيني", "ＡＢＣ", "abc"],
    ["لاتيني صغير", "HCIS Sec", "hcis sec"],
    ["İ التركية: الحالة الصغيرة تولّد علامةً تُحذف بعدها", "İstanbul", "istanbul"],
    ["مسافات مطوية", "  أمن   صناعي ", "امن صناعي"],
  ];

  it.each(cases)("%s: %s ← %s", (_label, input, expected) => {
    expect(normalizeArStrict(input)).toBe(expected);
  });

  it("null/undefined ⇐ سلسلة فارغة", () => {
    expect(normalizeArStrict(null)).toBe("");
    expect(normalizeArStrict(undefined)).toBe("");
  });

  it("تكافؤ المتغيّرات الشائعة: الهمزة والتاء المربوطة لا تفرّق كلمة عن نفسها", () => {
    expect(normalizeArStrict("الإنارة الأمنية")).toBe(normalizeArStrict("الانارة الامنيه"));
    expect(normalizeArStrict("مسؤولية")).toBe(normalizeArStrict("مسوولية"));
  });

  it("حدٌّ موثَّق: مقعدا الهمزة لا يُوحَّدان — «مسؤول» ≠ «مسئول» بعد الطيّ (ترويسة الوحدة)", () => {
    expect(normalizeArStrict("مسؤول")).toBe("مسوول");
    expect(normalizeArStrict("مسئول")).toBe("مسيول");
    expect(normalizeArStrict("مسؤول")).not.toBe(normalizeArStrict("مسئول"));
  });

  it("ثابت: الصارم على مخرج الخفيف أو على مخرجه هو يعطي النتيجة نفسها — عربيًّا وعلى «İ»", () => {
    for (const s of [
      "الإنارة الأمنيّة",
      "مسؤول\u200Cية",
      "٢٠٢٦ SEC-02",
      "İ",
      "İstanbul Istanbul",
    ]) {
      expect(normalizeArStrict(normalizeArLight(s)), s).toBe(normalizeArStrict(s));
      expect(normalizeArStrict(normalizeArStrict(s)), s).toBe(normalizeArStrict(s));
    }
  });

  it("مزروع: الحالة الصغيرة بعد حذف العلامات تُبقي علامة «İ» فيفقد الصارم ثباته — والكاشف يراه", () => {
    const lowerLast = (s: string) => s.normalize("NFKC").replace(/\p{M}/gu, "").toLowerCase();
    expect(lowerLast("İ")).toBe("i\u0307");
    expect(lowerLast(lowerLast("İ"))).not.toBe(lowerLast("İ"));
    expect(normalizeArStrict(normalizeArStrict("İ"))).toBe(normalizeArStrict("İ"));
  });

  it("مزروع: طيٌّ ناقص (بلا ة→ه) يفرّق المتغيّرين — فالكاشف يراه", () => {
    const broken = (s: string) => normalizeArStrict(s.replace(/ة/g, "\u0000")).replace(/\0/g, "ة");
    expect(broken("الإنارة")).not.toBe(normalizeArStrict("الانارة"));
  });

  it("مزروع: قائمة علامات يدوية بلا الملحق A تترك U+08F0 فتشقّ الكلمة — والخاصّية لا", () => {
    // U+0610–U+061A، U+064B–U+065F، U+0670، U+06D6–U+06ED — بلا U+08D3–U+08FF.
    const handList = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
    expect("ن\u08F0ص".replace(handList, "")).not.toBe("نص");
    expect(normalizeArStrict("ن\u08F0ص")).toBe("نص");
  });
});

describe("normalizeArLight — ما يسبق طيّ الحروف", () => {
  it("لا يطوي الهمزة ولا الألف المقصورة ولا التاء ولا الأرقام", () => {
    expect(normalizeArLight("إلى")).toBe("إلى");
    expect(normalizeArLight("آلي")).toBe("آلي");
    expect(normalizeArLight("إلى")).not.toBe(normalizeArLight("آلي"));
    expect(normalizeArLight("٢٠٢٦ ة ى")).toBe("٢٠٢٦ ة ى");
  });

  it("يحذف العلامات وغير المرئي ويطوي الحالة والمسافات — و«İ» حرفٌ واحد بلا علامة باقية", () => {
    expect(normalizeArLight("  مُحَمَّد\u200C  HCIS ")).toBe("محمد hcis");
    expect(normalizeArLight("İ")).toBe("i");
    expect(normalizeArLight(null)).toBe("");
  });
});
