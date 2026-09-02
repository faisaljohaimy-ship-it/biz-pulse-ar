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
import { REAL_SEC_WORK_ORDERS } from "@/lib/exec/maintenance-report.real.server";
import { buildReferenceSimulationContext } from "@/lib/sadeed/reference-simulation-context.server";
import {
  buildMaintenanceContextSection,
  buildProjectsContextSection,
  MAINTENANCE_IMPORT_ORIGIN,
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
  it("قسم المشاريع حاضر في كتلة الزائر (محاكاةً)", () => {
    expect(BLOCK).toContain("## المشاريع");
  });

  it("والمسار المصادَق يعدّ المجموعة كاملةً لا المعروض منها", () => {
    // 697 و539 أرقامُ **المجموعة الإنتاجية**، ومكانها المسار المصادَق.
    // كانت تُفحص على كتلة الزائر قبل إغلاق التسريب — ووجودُها هناك كان
    // هو العطل نفسه لا دليلَ صحّة.
    const section = buildProjectsContextSection(REAL_SEC_PROJECTS).join("\n");
    expect(REAL_SEC_PROJECTS.length).toBe(697);
    expect(section).toContain(`الإجمالي: ${REAL_SEC_PROJECTS.length}`);
  });

  it("وقسم الصيانة حاضر كذلك", () => {
    expect(BLOCK).toContain("## الصيانة وأوامر العمل");
  });

  it("والكتلة تسع نافذة السياق — سقف 48k حرفًا في chat.ts", () => {
    expect(BLOCK.length).toBeLessThan(20_000);
  });
});

describe("بوابة المستأجر — مشاريع الإنتاج لا تبلغ نداءً بلا هوية", () => {
  /**
   * تصحيحُ تسريبٍ أُدخل في 29557456: كتلة الزائر (فرع `!liveDataAvailable`
   * في `/api/chat`) كانت تحمل `REAL_SEC_PROJECTS` — أسماء مشاريع المؤسسة
   * ومراجعها ومديريها وتصنيف تعثّرها — وصفحتُها نفسها خلف
   * `_authenticated`. البنود أدناه تمنع عودته.
   */
  it("كتلة الزائر تحمل محاكاة مشاريع لا مشاريع المؤسسة", () => {
    const line = BLOCK.split("\n").find((l) => l.startsWith("## المشاريع"));
    expect(line, "قسم المشاريع مفقود").toBeTruthy();
    expect(line, "بيانات إنتاجية تسرّبت إلى كتلة الزائر").not.toContain("[PROD:");
    expect(line).toContain("[SIM:");
  });

  it("ولا مرجعُ مشروعٍ إنتاجيّ واحد يظهر فيها", () => {
    // فحصٌ على المحتوى لا على الوسم: وسمٌ صحيح فوق بياناتٍ مسرَّبة يمرّ.
    const realRefs = REAL_SEC_PROJECTS.slice(0, 60).map((p) => p.ref);
    const leaked = realRefs.filter((ref) => BLOCK.includes(ref));
    expect(leaked, `مراجع إنتاجية في كتلة الزائر: ${leaked.slice(0, 3).join(", ")}`).toEqual([]);
  });

  it("وحتى حين يسأل الزائر عن مرجعٍ إنتاجيّ بعينه — الاسترجاع لا يجيبه", () => {
    // باب الاسترجاع أخطر من باب الخلاصة: السؤال المستهدِف («ما حالة
    // NG-…-042؟») هو بالضبط ما يجرّبه من يصطاد البيانات. مجمع الزائر
    // محاكاةٌ، فالمرجع الإنتاجي يجب ألّا يطابق شيئًا.
    const target = REAL_SEC_PROJECTS[42];
    const probed = buildReferenceSimulationContext(
      Date.parse("2026-09-01T08:00:00Z"),
      `ما حالة المشروع ${target.ref}؟ ومن مديره ${target.manager ?? ""}؟`,
    ).contextBlock;
    expect(probed, "الاسترجاع سرّب سجلًّا إنتاجيًّا لزائرٍ سأل عنه").not.toContain(target.ref);
    expect(probed).not.toContain("[PROD:");
  });

  it("وبناء الوكلاء يقيّد الإنتاجية بوجود orgId", () => {
    // الشكل تغيّر مع دخول الاسترجاع (٢٠٢٦/٠٩/٠١): البوابة صارت على
    // **المجمع** (`projectPool`) الذي تتغذّى منه الخلاصة والاسترجاع معًا —
    // فبوابةٌ واحدة تحكم المسارين، ولا يتسرّب الإنتاجي من باب الاسترجاع
    // بعد أن أُغلق باب الخلاصة.
    const brain = code("src/lib/sadeed/executive-brain/context.server.ts");
    expect(brain).toMatch(/projectPool = orgId \? REAL_SEC_PROJECTS : buildSecProjectsSimulation/);
    expect(brain, "الكتلة تُبنى بلا تمرير الهوية").toContain(
      "buildEnterpriseKnowledgeBlock(req.orgId, req.question)",
    );
    // والاسترجاع يقرأ من المجمع المبوَّب لا من المجموعة الإنتاجية رأسًا.
    expect(brain).toMatch(/buildRecallBlock\(question, projectPool, orderPool/);
    const recallDirect = /buildRecallBlock\([^)]*REAL_SEC_PROJECTS/.test(brain);
    expect(recallDirect, "الاسترجاع تجاوز بوابة المستأجر").toBe(false);
  });

  it("والمصادَق وحده يأخذ المجموعة الإنتاجية", () => {
    const ctx = code("src/lib/sadeed-context.server.ts");
    expect(ctx).toMatch(/sections\.push\(\s*\.\.\.buildProjectsContextSection\(REAL_SEC_PROJECTS/);
  });
});

describe("بوابة المستأجر — الصيانة المستوردة خلفها كذلك (٢٠٢٦/٠٩/٠٢)", () => {
  /**
   * تصدير SAP المستورد بيانات عملٍ من ملف المالك: مراجع أوامر ومواقع
   * وظيفية وتكاليف ومنشئون. شارته «محاكاة مرجعية» وسمُ عرضٍ لا إذنُ نشر —
   * فيسلك مسلك مشاريع الإنتاج: المصادَق ومجلس الوكلاء (بهوية) يرونه،
   * وكتلة الزائر تبقى على المحاكاة المولّدة.
   */
  it("لا مرجعُ أمرٍ مستورد واحد في كتلة الزائر", () => {
    // المسح على **كامل** الـ249 لا عيّنة: حقنة تسريبٍ للخلاصة وحدها مرّت
    // من تحت عيّنة أحدث 60 — قسم الزائر يعرض المفتوحة الثمانية وهي ليست
    // بالضرورة من الأحدث إنشاءً. وكل مرجع SAP مستورد على نسق 66000xxxxxx،
    // فمسحُ النسق يصطاد حتى صفًّا واحدًا أيًّا كان بابه.
    const leaked = REAL_SEC_WORK_ORDERS.map((w) => w.ref).filter((ref) => BLOCK.includes(ref));
    expect(leaked, `مراجع مستوردة في كتلة الزائر: ${leaked.slice(0, 3).join(", ")}`).toEqual([]);
    expect(BLOCK).not.toMatch(/\b66000\d{6}\b/);
    expect(BLOCK).not.toContain("[SIM:MAINTENANCE_IMPORT]");
  });

  it("وحتى حين يسأل الزائر عن أمرٍ مستورد بعينه — الاسترجاع لا يجيبه", () => {
    const target = REAL_SEC_WORK_ORDERS[7];
    const probed = buildReferenceSimulationContext(
      Date.parse("2026-09-02T08:00:00Z"),
      `تفاصيل أمر الصيانة ${target.ref} في الموقع ${target.asset_code}؟`,
    ).contextBlock;
    expect(probed, "الاسترجاع سرّب أمرًا مستوردًا لزائرٍ سأل عنه").not.toContain(target.ref);
    expect(probed).not.toContain(target.asset_code ?? " ");
  });

  it("وبناء الوكلاء يقيّد مجمع الصيانة بوجود orgId — البوابة على المجمع", () => {
    const brain = code("src/lib/sadeed/executive-brain/context.server.ts");
    expect(brain).toMatch(
      /orderPool = orgId \? REAL_SEC_WORK_ORDERS : buildOmsSimulation\(now\)\.work_orders/,
    );
    const recallDirect = /buildRecallBlock\([^)]*REAL_SEC_WORK_ORDERS/.test(brain);
    expect(recallDirect, "استرجاع الصيانة تجاوز بوابة المستأجر").toBe(false);
  });

  it("والمصادَق يسقط إلى المجموعة المستوردة بوسم أصلها الصريح", () => {
    const ctx = code("src/lib/sadeed-context.server.ts");
    expect(ctx).toMatch(
      /buildMaintenanceContextSection\(REAL_SEC_WORK_ORDERS, MAINTENANCE_IMPORT_ORIGIN\)/,
    );
    expect(ctx).toMatch(/maintenance-report\.real\.server/);
  });

  it("ووسم الاستيراد يقولها كما هي: مستوردة وموسومة محاكاةً حتى الإقرار", () => {
    expect(MAINTENANCE_IMPORT_ORIGIN.provenance).toBe("[SIM:MAINTENANCE_IMPORT]");
    const section = buildMaintenanceContextSection(
      REAL_SEC_WORK_ORDERS,
      MAINTENANCE_IMPORT_ORIGIN,
    ).join("\n");
    expect(section).toContain("[SIM:MAINTENANCE_IMPORT]");
    expect(section).toContain("مستوردة");
    expect(section).not.toContain("[PROD:");
    expect(section).toContain(`الإجمالي: ${REAL_SEC_WORK_ORDERS.length}`);
    // المادة ٢٧: الـ97 بلا أولوية معلَنة بعددها داخل فم سَدِيد.
    expect(section).toContain("أوامر بلا أولوية في المصدر: 97");
  });
});

describe("الوسم بالأصل — لا وسمَ شاملًا يكذب في أحد الاتجاهين", () => {
  it("الوسم يتبع المصدر المُمرَّر لا اسم الدالّة", () => {
    const simTagged = buildProjectsContextSection(REAL_SEC_PROJECTS.slice(0, 3), {
      provenance: "[SIM:PROJECTS]",
      note: "محاكاة",
    }).join("\n");
    expect(simTagged).toContain("[SIM:PROJECTS]");
    expect(simTagged).not.toContain("[PROD:");
    // والافتراضي يبقى إنتاجيًّا لمن يمرّر المجموعة الحقيقية بلا تجاوز.
    const prodTagged = buildProjectsContextSection(REAL_SEC_PROJECTS.slice(0, 3)).join("\n");
    expect(prodTagged).toContain("[PROD:PROJECTS_EXPORT]");
  });

  it("والصيانة موسومة محاكاةً لا إنتاجًا", () => {
    const line = BLOCK.split("\n").find((l) => l.startsWith("## الصيانة"));
    expect(line).toContain("[SIM:");
    expect(line, "محاكاةٌ وُسمت إنتاجًا — فبركة").not.toContain("[PROD:");
  });

  it("ورأس كتلة الزائر يطابق محتواها: محاكاةٌ خالصة بلا قسمٍ إنتاجي", () => {
    // دورةٌ كاملة: كان الرأس «محاكاة فقط» صادقًا، ثم صار «MIXED» حين دخل
    // قسم المشاريع الإنتاجي، ثم تبيّن أن ذلك القسم تسريبٌ فأُخرج — فعاد
    // الرأس يعلن المحاكاة. الحارس يقيس **تطابق الرأس مع المحتوى**: إن
    // دخلها قسم [PROD:] يومًا فليتغيّر الرأس معه أو فليسقط هذا البند.
    expect(BLOCK.split("\n")[0]).toContain("REFERENCE_SIMULATION");
    const prodHeadings = BLOCK.split("\n").filter(
      (l) => l.startsWith("## ") && l.includes("[PROD:"),
    );
    expect(prodHeadings, "قسمٌ إنتاجي في كتلة الزائر ورأسها يقول محاكاة").toEqual([]);
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
    const section = buildProjectsContextSection(REAL_SEC_PROJECTS).join("\n");
    expect(section).toContain(`لم تُقَس ${unmeasured}`);
    // ونصٌّ صريح يمنعه من تصنيفها من عنده — على المسارين معًا.
    expect(section).toContain("لا تصفها سليمة ولا متعثّرة");
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
