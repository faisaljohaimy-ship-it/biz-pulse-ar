import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const AGENTS_ROUTE = read("src/routes/_authenticated/agents.tsx");
const ROOT_ROUTE = read("src/routes/__root.tsx");
const LEGACY_FLOW_ROUTE = read("src/routes/agents-flow.tsx");
const LEGACY_REFERENCE_ROUTE = read("src/routes/agents-reference.tsx");
const AGENT_DISPLAY = read("src/lib/agents/industrial-security-display.ts");

describe("agent operations platform contract", () => {
  it("uses the canonical name and industrial-security role mapping", () => {
    expect(AGENTS_ROUTE).toContain('"منصة عمليات الوكلاء"');
    expect(AGENTS_ROUTE).toContain("industrialSecurityAgentDisplay");

    // البند ٢٥ (٢٠٢٦/٠٨/٠٦): مسمّيات وظيفية لا قالب «وكيل X». كان هذا
    // الفحص يثبّت القالب القديم حرفًا بحرف، فصار يثبّت القرار الجديد.
    for (const role of [
      "مراقب العمليات",
      "قائد الحوادث والتصعيد",
      "مخطّط الصيانة التنبؤية",
      "مراقب امتثال HCIS",
      "ضابط الهوية والدخول",
      "قائد الحركة والدوريات",
      "مُعِدّ التقارير الأمنية",
      "محلّل المخاطر الأمنية",
    ]) {
      expect(AGENT_DISPLAY, `المسمّى «${role}» مفقود`).toContain(role);
    }
  });

  it("لا اسم على قالب «وكيل X» — المسمّى دورٌ لا صفة", () => {
    // أربعة عشر اسمًا تبدأ بالكلمة نفسها لا يُميَّز بينها إلا بعد قراءة
    // الكلمة الثانية. الحارس على `nameAr` وحده — `id` مفتاح آلي لا يُمسّ.
    const names = [...AGENT_DISPLAY.matchAll(/nameAr:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(names.length, "لم يُقرأ أي اسم — تغيّر شكل الحقل").toBeGreaterThanOrEqual(10);
    expect(names.filter((n) => n.startsWith("وكيل "))).toEqual([]);
  });

  it("keeps the retired holographic tree out of the canonical page", () => {
    expect(AGENTS_ROUTE).not.toContain("AgentHierarchyGraph");
    expect(AGENTS_ROUTE).not.toContain("AgenticFlowCanvas");
    expect(AGENTS_ROUTE).not.toContain("HolographicFlowShowcase");
  });

  it("removes global portrait and map backdrops from agent operations routes", () => {
    expect(ROOT_ROUTE).toContain("const isAgentOperations");
    expect(ROOT_ROUTE).toMatch(/!isAgentOperations[\s\S]{0,120}<ArabianPeninsulaBackdrop/);
    expect(ROOT_ROUTE).toMatch(/!isAgentOperations[\s\S]{0,120}<GlobalPageBackdrop/);
    expect(ROOT_ROUTE).toContain(
      "const suppressOverlays = isPromo || isAccessGate || isAgentOperations || introActive",
    );
  });

  it("redirects retired agent-tree routes to the canonical platform", () => {
    for (const legacyRoute of [LEGACY_FLOW_ROUTE, LEGACY_REFERENCE_ROUTE]) {
      expect(legacyRoute).toContain('throw redirect({ to: "/agents" })');
      expect(legacyRoute).not.toContain("AgentHierarchyGraph");
      expect(legacyRoute).not.toContain("AgenticFlowCanvas");
    }
  });
});

/**
 * مطابِق رأس المناوبة — الحارس الذي لم يكن.
 *
 * غرفتا العمليات تجدان الوكيل المركزي بمطابقة **اسم صفٍّ في القاعدة**، لا
 * معرّفٍ ثابت. وكسر المعرّفات (٢٠٢٦/٠٨/٠٩) أعاد تسمية الكود ولم يمسّ صفًّا
 * واحدًا: القاعدة ما زالت تحمل «FINN» و«فِن» حتى تُطبَّق
 * `20260809120000_sadeed_visible_text_rename.sql`. فالمطابِق يقبل الاسمين
 * عمدًا.
 *
 * والخطر أن يكون هذا القبول **بلا حارس**: كنسةٌ لاحقة تبحث عن «FINN» في
 * الريبو فتحذفها من التعبير النمطي، فلا يُوجد الرأس، فيسقط قلب المسرح إلى
 * البديل الصامت — بلا خطأ ولا اختبار أحمر. ولذلك يُفحص **السلوك**: يُستخرج
 * التعبير من المصدر ويُجرَّب على الأسماء التي تحملها الصفوف فعلًا.
 *
 * ويسقط هذا الحارس نفسه يوم تُطبَّق الهجرة ويُنزع «FINN» عن قصد — وهذا
 * صوابه: عندئذٍ يُحذف معه، لا أن يبقى قابلًا لِما لم يعد موجودًا.
 */
describe("مطابِق رأس المناوبة يقبل أسماء القاعدة الحيّة", () => {
  const OPS_PAGES = ["src/routes/-nx-flow-page.tsx", "src/routes/-nx-ops-page.tsx"] as const;

  /** ما قد يحمله `name_ar` في الصفوف المنشورة اليوم أو بعد الهجرة. */
  const LIVE_ROW_NAMES = [
    "FINN التنفيذي",
    "فِن التنفيذي",
    "سديد التنفيذي",
    "سَدِيد التنفيذي",
    "SADEED Executive",
  ];

  it.each(OPS_PAGES)("%s — يجد الرأس تحت كل تهجئة", (file) => {
    const src = read(file);
    const literal = src.match(
      /const head = agents\.find\(\(a\) =>\s*(\/(?:[^/\\\n]|\\.)+\/[a-z]*)\.test/,
    );
    expect(literal, "لم يُقرأ المطابِق — تغيّر شكل السطر فبطل الحارس").not.toBeNull();

    const body = literal![1].slice(1, literal![1].lastIndexOf("/"));
    const flags = literal![1].slice(literal![1].lastIndexOf("/") + 1);
    const re = new RegExp(body, flags);

    for (const name of LIVE_ROW_NAMES) {
      expect(re.test(name), `صفٌّ حيّ باسم «${name}» لا يُطابَق — يسقط قلب المسرح`).toBe(true);
    }
    // ولا يبتلع أيّ وكيل آخر: مطابِقٌ يقبل الجميع يجعل الأوّل رأسًا دائمًا.
    expect(re.test("مراقب العمليات")).toBe(false);
  });
});
