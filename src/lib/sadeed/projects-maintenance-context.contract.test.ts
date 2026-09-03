/**
 * ما يقوله سَدِيد والوكلاء عن المشاريع والصيانة والبلاغات — حارس الصدق.
 *
 * **تاريخ هذا الملف ثلاث حقب، وذكرُها يمنع تقهقرًا إليها:**
 *   ١. (٢٠٢٦/٠٨/٣١) وسمٌ مزدوج: مشاريع إنتاجية + صيانة محاكاة، وحرّاس
 *      تسريبٍ يمنعون الإنتاجي عن كتلة الزائر.
 *   ٢. (٢٠٢٦/٠٩/٠٢) الصيانة صارت إنتاجية بإقرار المالك، والحرّاس بقوا.
 *   ٣. (٢٠٢٦/٠٩/٠٣) أمر المالك: «البيانات الإنتاجية المعكوسة مؤخرًا
 *      وليست المحاكاة، مع إزالة المحاكاة كاملًا» — فأُخرجت المحاكاة
 *      المولّدة من **كل** مسارات إجابات سَدِيد والوكلاء (كتلة الزائر
 *      ومجلس الوكلاء ووقت تشغيلهم والطبقة الفورية)، وحلّت محلّها
 *      المجموعات الإنتاجية نفسها التي تعرضها شاشات العرض المفتوحة
 *      للزائر أصلًا. حرّاسُ حقبة التسريب انقلبوا حرّاسَ إزالةٍ: العطب
 *      المحروس اليوم هو **عودة المحاكاة** إلى فمَي سَدِيد والوكلاء، أو
 *      وصف الإنتاجيّ محاكاةً.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import { REAL_SEC_WORK_ORDERS } from "@/lib/exec/maintenance-report.real.server";
import {
  buildMaintenanceContextSection,
  buildProjectsContextSection,
  MAINTENANCE_PRODUCTION_ORIGIN,
} from "@/lib/sadeed/projects-maintenance-context.server";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("الأقسام تُبنى من المجموعات الإنتاجية وتعدّها كاملةً", () => {
  it("قسم المشاريع يعدّ الـ697 بوسم [PROD:PROJECTS_EXPORT]", () => {
    const section = buildProjectsContextSection(REAL_SEC_PROJECTS).join("\n");
    expect(REAL_SEC_PROJECTS.length).toBe(697);
    expect(section).toContain(`الإجمالي: ${REAL_SEC_PROJECTS.length}`);
    expect(section).toContain("[PROD:PROJECTS_EXPORT]");
    expect(section).not.toContain("[SIM:");
  });

  it("وقسم الصيانة يعدّ الـ249 بوسم [PROD:MAINTENANCE_EXPORT] افتراضًا", () => {
    // الافتراض إنتاجيّ منذ ٢٠٢٦/٠٩/٠٣ — نسيان وسيط الأصل لا يسم
    // الإنتاجيّ محاكاةً بعد اليوم.
    const section = buildMaintenanceContextSection(REAL_SEC_WORK_ORDERS).join("\n");
    expect(REAL_SEC_WORK_ORDERS.length).toBe(249);
    expect(section).toContain(`الإجمالي: ${REAL_SEC_WORK_ORDERS.length}`);
    expect(section).toContain(MAINTENANCE_PRODUCTION_ORIGIN.provenance);
    expect(section).toContain("إنتاجية");
    expect(section).not.toContain("[SIM:");
  });

  it("والمجموعة الفارغة تعطي قسمًا فارغًا لا عنوانًا بلا محتوى", () => {
    expect(buildProjectsContextSection([])).toEqual([]);
    expect(buildMaintenanceContextSection([])).toEqual([]);
  });
});

describe("المادة ٢٧ داخل فم سَدِيد — الإنتاجية لا تجعل الغائب مقيسًا", () => {
  it("صحّة المشاريع غير المقيسة معلَنة بعددها لا مطويّة خلف «سليم»", () => {
    const unmeasured = REAL_SEC_PROJECTS.filter((p) => p.health === null).length;
    expect(unmeasured).toBe(539);
    const section = buildProjectsContextSection(REAL_SEC_PROJECTS).join("\n");
    expect(section).toContain(`لم تُقَس ${unmeasured}`);
    expect(section).toContain("لا تصفها سليمة ولا متعثّرة");
  });

  it("وأوامر الصيانة بلا أولوية معلَنة بعددها", () => {
    const section = buildMaintenanceContextSection(REAL_SEC_WORK_ORDERS).join("\n");
    expect(section).toContain("أوامر بلا أولوية في المصدر: 97");
  });

  it("ولا يُسرَّب null نصًّا إلى السياق", () => {
    const all = [
      ...buildProjectsContextSection(REAL_SEC_PROJECTS),
      ...buildMaintenanceContextSection(REAL_SEC_WORK_ORDERS),
    ].join("\n");
    expect(all).not.toMatch(/\bnull\b/);
    expect(all).not.toContain("undefined");
  });
});

describe("إزالة المحاكاة من مسارات سَدِيد — أمر المالك ٢٠٢٦/٠٩/٠٣", () => {
  it("وحدة محاكاة الزائر حُذفت ولا مستورِد لها", () => {
    expect(existsSync(join(root, "src/lib/sadeed/reference-simulation-context.server.ts"))).toBe(
      false,
    );
    for (const p of [
      "src/routes/api/chat.ts",
      "src/routes/api/sadeed/chat.ts",
      "src/lib/sadeed-context.server.ts",
      "src/lib/sadeed/executive-brain/context.server.ts",
    ]) {
      expect(code(p), `${p} ما زال يستورد محاكاة الزائر`).not.toContain(
        "reference-simulation-context",
      );
    }
  });

  it("ولا مولِّد محاكاةٍ في أي مسار إجابة — دردشةً ومجلسًا ووقتَ تشغيل", () => {
    for (const p of [
      "src/routes/api/chat.ts",
      "src/routes/api/sadeed/chat.ts",
      "src/lib/sadeed-context.server.ts",
      "src/lib/sadeed/executive-brain/context.server.ts",
      "src/lib/sadeed/instant-data-answers.server.ts",
      "src/lib/exec/agent-runtime.server.ts",
    ]) {
      const src = code(p);
      expect(src, `${p} يستدعي مولّد محاكاة`).not.toMatch(
        /buildOmsSimulation|buildSecProjectsSimulation|buildSecOverviewSimulation|buildCommandCenterSimulation/,
      );
    }
  });

  it("فرع الزائر في الدردشة يقرأ لقطة الإنتاج ولا يعلن محاكاة", () => {
    const chat = code("src/routes/api/chat.ts");
    expect(chat).toMatch(/buildProductionDatasetsSnapshot\(\s*lastUserText/);
    expect(chat).toContain('"anonymous"');
    expect(chat).not.toContain("REFERENCE SIMULATION");
    expect(chat).not.toContain("simulationDataAvailable,");
    // العلمان اللذان كانا يحملان المحاكاة إلى المغلّف صارا false ثابتة.
    expect(chat).toMatch(/isSimulationEnv: false/);
  });

  it("ومسار التوافق /api/sadeed/chat كذلك", () => {
    const compat = code("src/routes/api/sadeed/chat.ts");
    expect(compat).toMatch(/buildProductionDatasetsSnapshot\(/);
    expect(compat).toContain("PRODUCTION DATASETS");
    expect(compat).toMatch(/isSimulation: false/);
    expect(compat).toMatch(/isSimulationEnv: false/);
  });

  it("ومجلس الوكلاء مجمعاه إنتاجيان بلا بوابة تعيد المحاكاة", () => {
    const brain = code("src/lib/sadeed/executive-brain/context.server.ts");
    expect(brain).toMatch(/const projectPool = REAL_SEC_PROJECTS;/);
    expect(brain).toMatch(/const orderPool = REAL_SEC_WORK_ORDERS;/);
    expect(brain).toMatch(/buildEnterpriseKnowledgeBlock\(req\.question\)/);
    expect(brain).not.toContain("[SIM:");
  });

  it("والمسار المصادَق يسقط إلى المجموعات الإنتاجية بوسمها", () => {
    const ctx = code("src/lib/sadeed-context.server.ts");
    expect(ctx).toMatch(
      /buildMaintenanceContextSection\(REAL_SEC_WORK_ORDERS, MAINTENANCE_PRODUCTION_ORIGIN\)/,
    );
    expect(ctx).toMatch(/sections\.push\(\s*\.\.\.buildProjectsContextSection\(REAL_SEC_PROJECTS/);
    expect(ctx).toMatch(/maintenance-report\.real\.server/);
  });

  it("وتوجيه الدردشة يصف الكتل إنتاجًا لا محاكاة", () => {
    const chat = code("src/routes/api/chat.ts");
    expect(chat).toContain("[PROD:*]");
    expect(chat).toContain("never call them simulation");
  });
});

describe("الوسم يتبع المصدر المُمرَّر — لمصدرٍ قاعديّ مستقبلي", () => {
  it("تجاوز الوسم ما زال يعمل حين يُمرَّر", () => {
    const tagged = buildProjectsContextSection(REAL_SEC_PROJECTS.slice(0, 3), {
      provenance: "[PROD:DB_LIVE]",
      note: "صفوف القاعدة الحيّة.",
    }).join("\n");
    expect(tagged).toContain("[PROD:DB_LIVE]");
    expect(tagged).not.toContain("[PROD:PROJECTS_EXPORT]");
  });
});
