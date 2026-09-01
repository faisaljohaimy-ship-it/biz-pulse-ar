/**
 * ما يعرفه سَدِيد عن المشاريع والصيانة — حارس الصدق (٢٠٢٦/٠٨/٣١).
 *
 * الخطر هنا **وسمٌ خاطئ في أحد اتجاهين**، وكلاهما ضرر:
 *   • أن يصف مشروعًا إنتاجيًّا بأنه محاكاة ⇒ يُهدر مصداقية بيانات حقيقية
 *     أمام تنفيذيّ يقرأها.
 *   • أن يصف أمر عملٍ مولَّدًا بأنه واقع ⇒ الفبركة التي تمنعها المادة ٢٧.
 * فالبنود أدناه تقيس الوسم نفسه لا وجود البيانات وحده.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOmsSimulation } from "@/lib/exec/showcase-simulation.server";
import { REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import { buildReferenceSimulationContext } from "@/lib/sadeed/reference-simulation-context.server";
import {
  buildMaintenanceContextSection,
  buildProjectsContextSection,
} from "@/lib/sadeed/projects-maintenance-context.server";

const AT = Date.parse("2026-08-31T12:00:00Z");
const BLOCK = buildReferenceSimulationContext(AT).contextBlock;

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("سَدِيد يرى المشاريع والصيانة", () => {
  it("قسم المشاريع حاضر بعدد المجموعة كاملةً لا بالمعروض منها", () => {
    expect(BLOCK).toContain("## المشاريع");
    expect(BLOCK).toContain(`الإجمالي: ${REAL_SEC_PROJECTS.length}`);
    expect(REAL_SEC_PROJECTS.length).toBe(697);
  });

  it("وقسم الصيانة حاضر كذلك", () => {
    expect(BLOCK).toContain("## الصيانة وأوامر العمل");
  });

  it("والكتلة تسع نافذة السياق — سقف 48k حرفًا في chat.ts", () => {
    expect(BLOCK.length).toBeLessThan(20_000);
  });
});

describe("الوسم بالأصل — لا وسمَ شاملًا يكذب في أحد الاتجاهين", () => {
  it("المشاريع موسومة إنتاجيةً لا محاكاة", () => {
    const line = BLOCK.split("\n").find((l) => l.startsWith("## المشاريع"));
    expect(line, "قسم المشاريع مفقود").toBeTruthy();
    expect(line).toContain("[PROD:");
    expect(line, "بياناتٌ إنتاجية وُسمت محاكاةً").not.toContain("[SIM:");
  });

  it("والصيانة موسومة محاكاةً لا إنتاجًا", () => {
    const line = BLOCK.split("\n").find((l) => l.startsWith("## الصيانة"));
    expect(line).toContain("[SIM:");
    expect(line, "محاكاةٌ وُسمت إنتاجًا — فبركة").not.toContain("[PROD:");
  });

  it("ورأس الكتلة لا يعلنها كلَّها محاكاة بعد أن دخلها قسمٌ إنتاجي", () => {
    // كان السطر `DATA_MODE: REFERENCE_SIMULATION_ONLY` وكان صادقًا حينها.
    // بقاؤه بعد دخول المشاريع يجعل سَدِيد يصف الحقيقيّ محاكاةً.
    expect(BLOCK).not.toContain("REFERENCE_SIMULATION_ONLY");
    expect(BLOCK.split("\n")[0]).toContain("MIXED");
  });

  it("وتوجيه الدردشة يأمر بالنسبة إلى وسم القسم لا بوسمٍ شامل", () => {
    const chat = code("src/routes/api/chat.ts");
    expect(chat).toContain("[PROD:*]");
    expect(chat).toContain("[SIM:*]");
    expect(chat, "الأمر الشامل القديم يجعل الإنتاجيّ محاكاةً").not.toContain(
      "Every derived figure must be labelled as reference simulation",
    );
  });
});

describe("المادة ٢٧ داخل فم سَدِيد", () => {
  it("غير المقيس معلَنٌ بعدده لا مطويٌّ خلف «سليم»", () => {
    const unmeasured = REAL_SEC_PROJECTS.filter((p) => p.health === null).length;
    expect(unmeasured).toBe(539);
    expect(BLOCK).toContain(`لم تُقَس ${unmeasured}`);
    // ونصٌّ صريح يمنعه من تصنيفها من عنده.
    expect(BLOCK).toContain("لا تصفها سليمة ولا متعثّرة");
  });

  it("ولا يُسرَّب null نصًّا إلى السياق", () => {
    expect(BLOCK).not.toMatch(/\bnull\b/);
    expect(BLOCK).not.toContain("undefined");
  });
});

describe("المسار المصادَق يتبع مصدر الشاشة نفسه", () => {
  it("يسقط إلى المجموعة المستوردة حين تفرغ القاعدة", () => {
    // `sec_projects` فارغة فعلًا — ولذلك تسقط الشاشة إلى المستوردة. لو بقي
    // السياق على شرط القاعدة وحده لَظلّ سَدِيد يقول «لا تتوفّر البيانات»
    // عن شاشةٍ مفتوحةٍ أمام المستخدم.
    // **الفحص على الاستدعاء لا على الاسم:** سطر الاستيراد (وتفكيكه) يُبقي
    // الاسم في الملف بعد نزع الاستدعاء — ثبت ذلك بحقنةٍ مرّت زورًا.
    const ctx = code("src/lib/sadeed-context.server.ts");
    expect(ctx, "سقط سقوط المشاريع إلى المجموعة المستوردة").toMatch(
      /sections\.push\(\s*\.\.\.buildProjectsContextSection\(/,
    );
    expect(ctx, "سقط سقوط الصيانة إلى المحاكاة").toMatch(
      /sections\.push\(\s*\.\.\.buildMaintenanceContextSection\(/,
    );
    expect(ctx).toMatch(/projects-report\.real\.server/);
  });

  it("والصحّة غير المقيسة تُعرض «لم تُقَس» لا `null` في فرع القاعدة", () => {
    const ctx = code("src/lib/sadeed-context.server.ts");
    expect(ctx).toMatch(/p\.health \?\? "لم تُقَس"/);
  });
});

describe("الأقسام دوالّ خالصة تُبنى من مجموعةٍ معطاة", () => {
  it("المجموعة الفارغة تعطي قسمًا فارغًا لا عنوانًا بلا محتوى", () => {
    expect(buildProjectsContextSection([])).toEqual([]);
    expect(buildMaintenanceContextSection([])).toEqual([]);
  });

  it("والصيانة تُحسب من المحاكاة الحيّة لا من رقمٍ مكتوب", () => {
    const orders = buildOmsSimulation(AT).work_orders;
    const section = buildMaintenanceContextSection(orders).join("\n");
    expect(section).toContain(`الإجمالي: ${orders.length}`);
  });
});
