/**
 * حارس «قراءات العرض لا تُغلَق خلف المصادقة».
 *
 * ## القاعدة المحروسة
 *
 * من `CLAUDE.md` («بيانات لا تفرغ» · الطبقة الرابعة):
 *
 * > قراءات العرض تستخدم `optionalSupabaseAuth` (لا Unauthorized للزائر
 * > أبدًا)؛ الكتابات فقط خلف `requireSupabaseAuth`.
 *
 * ومسار `_authenticated` **لا يحوّل** الزائر إلى `/auth` (قرار مثبَّت في
 * `src/routes/_authenticated.tsx`). فكل شاشة تحته يفتحها زائر بلا رمز
 * حامل، و`requireSupabaseAuth` ترمي حرفيًّا
 * `"Unauthorized: No authorization header provided"` — فيرى الزائر جدولًا
 * فارغًا وبطاقات غائبة على شاشةٍ وظيفتها العرض.
 *
 * ## لماذا حارسٌ نصّي لا اختبار سلوك
 *
 * ما يجب منعه ليس نتيجةً تُقاس بل **سطرٌ يُكتب**: عودة
 * `.middleware([requireSupabaseAuth])` فوق دالّة قراءة. وهو تراجعٌ صامت —
 * لا يكسر `tsc` ولا `lint`، ولا يظهر في اختبار يعمل بجلسة صالحة، ويُقرأ
 * في المراجعة سطرًا واحدًا يشبه جيرانه. فالحارس يقرأ المصدر نفسه.
 *
 * ## الحارس يقطع في الاتجاهين
 *
 * لو حرس الجدول الأول وحده لكان دعوةً إلى الإصلاح المعاكس: «وحّد
 * المصادقة» بجعل كل شيء `optionalSupabaseAuth`. فالجدول الثاني يثبّت أن
 * الكتابات — وما يمنح قدرة كالرابط الموقّع — تبقى خلف `requireSupabaseAuth`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");

const sourceOf = (relativePath: string) =>
  readFileSync(join(ROOT, "src", "lib", relativePath), "utf8");

/**
 * الوسيط المُعلن فوق دالّة خادم مصدَّرة باسمها.
 *
 * يُقرأ أول `.middleware([...])` بعد `export const <name> = createServerFn`,
 * فلا يخلط دالّةً بجارتها ولا يخدعه ذكرُ الاسم في تعليق أو استيراد.
 */
function middlewareOf(source: string, fnName: string): string {
  const anchor = new RegExp(
    `export const ${fnName}\\s*=\\s*createServerFn\\([^)]*\\)([\\s\\S]{0,600}?)\\.middleware\\(\\[([^\\]]*)\\]\\)`,
  );
  const match = anchor.exec(source);
  if (!match) throw new Error(`لم يُعثر على وسيط الدالّة ${fnName} — أُعيدت تسميتها أو نُقلت.`);
  return match[2]!.trim();
}

/** قراءات عرض: نافذة يفتحها زائر ⇒ لا `requireSupabaseAuth` أبدًا. */
const DISPLAY_READS: Array<[file: string, fn: string, window: string]> = [
  ["oms.functions.reports.ts", "listIncidents", "/sec/incidents — جدول البلاغات"],
  ["oms.functions.reports.ts", "listWorkOrders", "/sec/maintenance — أوامر العمل"],
  ["maint.functions.ts", "listMaintOrders", "/sec/maintenance — أوامر الصيانة التصحيحية"],
  ["maint.functions.ts", "getMaintSummary", "/sec/maintenance — المؤشرات والتحليلات"],
  ["maint.functions.ts", "getMaintOrder", "/sec/maintenance — درج تفاصيل الأمر"],
  [
    "maint.functions.ts",
    "getMaintStaffDirectory",
    "/sec/maintenance — دليل الإسناد (فارغ لغير المدير)",
  ],
  ["oms.functions.reports.ts", "listPermits", "/sec/permits — التصاريح"],
  ["oms.functions.reports.ts", "getOmsKpis", "بطاقات الرأس فوق الشاشات الثلاث"],
  ["oms.functions.reports.ts", "getIncidentDetail", "درج تفاصيل البلاغ"],
  ["oms.functions.reports.ts", "getEntityTimeline", "الخطّ الزمني داخل الدرج"],
  ["oms.functions.reports.ts", "getRecentActivity", "شريط النشاط الأخير"],
  ["sec.functions.ts", "getProjects", "/sec/projects — مشاريع الأنظمة الأمنية"],
  ["sec.functions.ts", "getWorkOrders", "شبكة الصيانة"],
  ["sec.functions.ts", "getSections", "/sec/sections — الأقسام"],
  ["sec.functions.ts", "getCircles", "الدوائر — تسمية المشاريع"],
  ["authz.functions.ts", "getCurrentUserIsAdmin", "إظهار أدوات الإدارة على شاشات العرض"],
  ["executive-presentation.functions.ts", "getSystemPulse", "/live-dashboard — نبض المنصّة"],
  ["executive-presentation.functions.ts", "getLivePipelines", "/live-dashboard — المسارات الحيّة"],
  ["executive-presentation.functions.ts", "getBusinessKpis", "/live-dashboard — مؤشرات الأعمال"],
  ["executive-presentation.functions.ts", "listPendingDecisions", "مركز القرارات — العرض"],
  ["executive-presentation.functions.ts", "getExecutiveTimeline", "الخط الزمني التنفيذي"],
  ["exec/decisions.functions.ts", "getExecutiveDecisions", "غرفة العمليات — محرّك القرارات"],
  ["exec/conversation.functions.ts", "getAgentConversation", "غرفة العمليات — حوار الوكلاء"],
  ["sec-exec-kpis.functions.ts", "getExecTimeseries", "السلسلة الزمنية التنفيذية"],
  ["runtime/execution-timeline.functions.ts", "getExecutionTimeline", "درج الخط الزمني للتنفيذ"],
  ["enterprise-search.functions.ts", "enterpriseSearch", "/knowledge-hub — البحث"],
  ["enterprise-search.functions.ts", "getKnowledgeStats", "/knowledge-hub — الإحصاءات"],
  ["exec-reports-binary.functions.ts", "listReportSchedules", "لوحة التقارير المجدولة"],
  ["exec.functions.ts", "getWorkflowRunDetail", "درج تفاصيل تشغيلة سير العمل"],
  ["exec.functions.ts", "getToolSampleContext", "حقول نموذج مشغّل الأدوات"],
  ["learn/lessons.functions.ts", "listLessons", "/learn — قائمة الدروس"],
  ["learn/lessons.functions.ts", "getLesson", "/learn/$slug — الدرس"],
  ["learn/lessons.functions.ts", "getQuiz", "أسئلة الاختبار (بلا إجابات)"],
];

/**
 * ما يبقى خلف المصادقة بحقّ: كل كتابة، وكلُّ ما يمنح **قدرةً** لا بيانًا
 * (رابط موقّع إلى مستودع خاص).
 */
const GUARDED: Array<[file: string, fn: string, why: string]> = [
  ["oms.functions.reports.ts", "sadeedAnalyzeIncident", "يكتب تحليلًا ويقيّد حدثًا"],
  ["oms.functions.reports.ts", "setExecutiveReview", "يكتب مراجعة تنفيذية"],
  ["oms.functions.reports.ts", "addIncidentAttachment", "يكتب مرفقًا"],
  ["oms.functions.reports.ts", "removeIncidentAttachment", "يحذف مرفقًا ويمسّ التخزين"],
  ["oms.functions.reports.ts", "getIncidentAttachmentUrl", "رابط موقّع — منحُ قدرة لا عرضُ بيان"],
  ["oms.functions.ts", "createIncident", "كتابة"],
  ["oms.functions.ts", "closeIncident", "كتابة"],
  ["oms.functions.ts", "approvePermit", "كتابة واعتماد"],
  ["executive-presentation.functions.ts", "approveDecision", "يعتمد قرارًا ويطلق سير عمل"],
  ["executive-presentation.functions.ts", "dismissDecision", "يرفض قرارًا"],
  ["learn/lessons.functions.ts", "submitQuiz", "يكتب نتيجة ويصحّح خادميًّا"],
  ["learn/lessons.functions.ts", "updateProgress", "يكتب تقدّم المستخدم"],
  ["exec.functions.ts", "runTool", "ينفّذ أداة"],
  ["exec.functions.ts", "setAgentEnabled", "يغيّر حالة وكيل"],
  ["exec-reports-binary.functions.ts", "upsertReportSchedule", "يكتب جدولة"],
  ["exec-reports-binary.functions.ts", "deleteReportSchedule", "يحذف جدولة"],
  ["security-center.functions.ts", "getSecretInventory", "جرد أسرار — لا يُعرض لزائر"],
  ["security-center.functions.ts", "listAuditLogs", "سجلّ تدقيق مؤسسة معزولة"],
  ["governance/governance.functions.ts", "getCostBudgetStatus", "مالية مؤسسة عبر service-role"],
  ["governance/governance.functions.ts", "getSecretsRotationStatus", "حالة تدوير الأسرار"],
  ["sadeed/rag/stats.functions.ts", "getRagStats", "سجلّ استعلامات معزول بـRLS مقيِّدة"],
  ["sadeed/directive/directive.functions.ts", "getDirectiveAudit", "خلف صلاحية مسؤول المنصّة"],
  ["org/org.functions.ts", "listMyOrgs", "عضوية المستخدم نفسه — لا شاشة عرض"],
];

describe("قراءات العرض تحت optionalSupabaseAuth", () => {
  it.each(DISPLAY_READS)("%s · %s — نافذة %s", (file, fn) => {
    const mw = middlewareOf(sourceOf(file), fn);
    expect(mw).toBe("optionalSupabaseAuth");
  });

  it("لا نافذة عرض واحدة تراجعت إلى requireSupabaseAuth", () => {
    const regressed = DISPLAY_READS.filter(
      ([file, fn]) => middlewareOf(sourceOf(file), fn) !== "optionalSupabaseAuth",
    ).map(([file, fn, window]) => `${file} · ${fn} (${window})`);
    expect(regressed).toEqual([]);
  });
});

describe("الكتابات ومنحُ القدرة يبقيان خلف requireSupabaseAuth", () => {
  it.each(GUARDED)("%s · %s — %s", (file, fn) => {
    const mw = middlewareOf(sourceOf(file), fn);
    expect(mw).toBe("requireSupabaseAuth");
  });
});

describe("«بيانات لا تفرغ» — البديل المرجعي يملأ نوافذ OMS فعلًا", () => {
  // فتح الوسيط وحده يمنع خطأ المصادقة، ولا يمنع **الفراغ**. وشاشة فارغة
  // بلا خطأ عطلٌ أهدأ لا عطلٌ أقل. فالبديل يُقاس هنا لا يُفترض.
  it("كل نافذة من الثلاث تصل بصفوف، وسجلّ النشاط ليس فارغًا", async () => {
    const { buildOmsSimulation } = await import("./exec/showcase-simulation.server");
    const sim = buildOmsSimulation(Date.now());
    expect(sim.incidents.length).toBeGreaterThan(0);
    expect(sim.work_orders.length).toBeGreaterThan(0);
    expect(sim.permits.length).toBeGreaterThan(0);
    expect(sim.activity.length).toBeGreaterThan(0);
  });

  it("بطاقات الرأس تجد ما تعدّه — لا عدّاد صفر على جدول ممتلئ", async () => {
    const now = Date.now();
    const { buildOmsSimulation } = await import("./exec/showcase-simulation.server");
    const sim = buildOmsSimulation(now);
    // «مفتوحة» و«حرجة» و«متأخرة» و«قيد الاعتماد» أعمدةٌ يقرؤها المشاهد
    // أولًا؛ صفرٌ فيها جميعًا يجعل الشاشة تبدو ميتة رغم امتلاء جدولها.
    expect(
      sim.incidents.filter((i) => i.status !== "closed" && i.status !== "resolved").length,
    ).toBeGreaterThan(0);
    expect(sim.incidents.filter((i) => i.severity === "critical").length).toBeGreaterThan(0);
    expect(
      sim.work_orders.filter(
        (w) => w.status !== "closed" && w.due_at !== null && new Date(w.due_at).getTime() < now,
      ).length,
    ).toBeGreaterThan(0);
    expect(sim.permits.filter((p) => p.status === "pending").length).toBeGreaterThan(0);
    expect(
      sim.activity.filter((e) => new Date(e.occurred_at).getTime() >= now - 24 * 3600_000).length,
    ).toBeGreaterThan(0);
  });

  it("سجلّ النشاط يشير إلى كيانات موجودة — لا مرجع يتيم في الدرج", async () => {
    const { buildOmsSimulation } = await import("./exec/showcase-simulation.server");
    const sim = buildOmsSimulation(Date.now());
    const ids = new Set([...sim.incidents, ...sim.work_orders].map((r) => r.id));
    expect(sim.activity.every((e) => ids.has(e.entity_id))).toBe(true);
  });

  it("أوامر العمل المُسنَدة تشير إلى بلاغات من المجموعة نفسها", async () => {
    const { buildOmsSimulation } = await import("./exec/showcase-simulation.server");
    const sim = buildOmsSimulation(Date.now());
    const incidentIds = new Set(sim.incidents.map((i) => i.id));
    const linked = sim.work_orders.filter((w) => w.source_incident_id !== null);
    expect(linked.length).toBeGreaterThan(0);
    expect(linked.every((w) => incidentIds.has(w.source_incident_id!))).toBe(true);
  });

  it("مشاريع الأنظمة الأمنية: المصروف لا يتجاوز الميزانية أبدًا", async () => {
    const { buildSecProjectsSimulation } = await import("./exec/showcase-simulation.server");
    const rows = buildSecProjectsSimulation(Date.now());
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((p) => p.spent_sar <= p.budget_sar)).toBe(true);
  });
});

/**
 * البند الثالث من «الطريقة المحفوظة»: لا عبارة مصادقة تبلغ الشاشة.
 *
 * فتح الوسائط قلّل مصادر الخطأ ولم يُلغِها — وما يبقى خلف
 * `requireSupabaseAuth` بحقّ (الأسرار · سجلّ التدقيق · المالية) يرمي على
 * الزائر النصّ نفسه. فالمرشِّح عند العرض هو خطّ الدفاع الأخير.
 *
 * الحارس يمنع **النمط** لا النتيجة: طباعة `error.message` خامًا في مسار
 * عرض. ولا يُفحص كل `.message` — لبعضها معنى نطاقي (`env.message_ar`,
 * `result.message`) — بل ما يُقرأ من كائن خطأ ويُسلَّم إلى الشاشة.
 */
const AUTHENTICATED_ROUTES = join(ROOT, "src", "routes", "_authenticated");

/**
 * قراءةُ `.message` من كائن خطأ: `error.message` · `err.message` ·
 * `e.message` · `(error as Error).message` · `q.error.message`.
 * لا يطابق `env.message_ar` ولا `result.message` — لهما معنى نطاقي.
 */
const READS_ERROR_MESSAGE = /\b(?:e|err|error)\b\s*(?:as\s+\w+\s*)?\)?\??\s*\.message\b/;

/**
 * مصارف العرض وحدها. `const msg = (e as {…})?.message` في **محلّل** ليس
 * عرضًا — يُقرأ ليُفكَّك لا ليُطبع، فلا يُدان.
 */
const DISPLAY_SINK = /toast\.(?:error|success|warning)\(|setLog\(|description=|>\{|^\s*\{/;

describe("لا نصّ خطأ خام يبلغ شاشة تحت /_authenticated", () => {
  it("كل مسار عرض يمرّ أخطاءه على userFacingError", async () => {
    const { readdirSync } = await import("node:fs");
    const offenders: string[] = [];
    for (const file of readdirSync(AUTHENTICATED_ROUTES).filter((f) => f.endsWith(".tsx"))) {
      const lines = readFileSync(join(AUTHENTICATED_ROUTES, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n");
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "");
        if (code.includes("userFacingError")) return;
        if (!READS_ERROR_MESSAGE.test(code)) return;
        if (!DISPLAY_SINK.test(code)) return;
        offenders.push(`${file}:${i + 1} — ${code.trim().slice(0, 90)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("مسار `_authenticated` يبقى مفتوحًا للزائر", () => {
  it("لا beforeLoad يحوّل إلى /auth — وإلا سقطت علّة الحارس كلّها", () => {
    const layout = readFileSync(join(ROOT, "src", "routes", "_authenticated.tsx"), "utf8");
    // التعليقات تُنزَع أولًا: الملفّ يشرح **بالنصّ** أنه لا يحوّل، وقراءة
    // ذلك الشرح شرطًا يجعل الحارس يفشل على الوثيقة لا على الكود.
    const code = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/beforeLoad\s*:/);
    expect(code).not.toMatch(/\bredirect\s*\(/);
  });
});
