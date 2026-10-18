/**
 * مسار «إنشاء أمر عمل» في شاشة الصيانة — حارس العقد.
 *
 * مرتدّان من V4 علّمهما المالك «لم ينجز» (٢٠٢٦/٠٨/٢٤):
 *
 * ① كان زرّ «إنشاء» يعرض للزائر رسالة الجلسة «انتهت الجلسة أو لم تبدأ بعد…»
 *   ويرفض الإنشاء — خرق مزدوج للبند الثالث من الطريقة المحفوظة (لا عبارات
 *   مصادقة ظاهرة) ولطبقة «بيانات لا تفرغ». المسار المفروض: مصادَق أولًا ⇒
 *   الكتابة الحقيقية؛ زائر أو 401/403 ⇒ إنشاء محاكاة مرجعية محلي موسوم
 *   `is_simulation` يظهر فورًا في القائمة، مع toast صدق كتابة بنمط
 *   SIM_ACTION_INFO (عبارة «محاكاة مرجعية» في toast فعل كتابة مسموحة —
 *   استثناء REQ-021 الصريح). وأي فشل آخر ⇒ رسالة عربية محايدة + إعادة محاولة.
 *
 * ② حقل تاريخ الاستحقاق كان مُدخلًا خامًا يُكتب يدويًا — المفروض منتقي تقويم
 *   بصري (Popover + Calendar فوق react-day-picker) عربي RTL، والقيمة تبقى
 *   بصيغة yyyy-MM-dd نفسها فلا يتغيّر عقد due_at.
 *
 * الحارس نصّي عمدًا: لا واحد من الارتدادين يُسقط tsc أو eslint — إعادة سطر
 * `toast.info(SESSION_ERROR_AR)` أو إرجاع `type="date"` يُقرآن كودًا سليمًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");

const DIALOGS = read("src/components/sec/oms-dialogs.tsx");
const DIALOGS_CODE = strip(DIALOGS);

/** جسم NewWorkOrderDialog وحده — من تعريفه حتى المكوّن التالي. */
const woStart = DIALOGS_CODE.indexOf("export function NewWorkOrderDialog");
const woEnd = DIALOGS_CODE.indexOf("export function WorkOrderActions");
const WO_DIALOG = DIALOGS_CODE.slice(woStart, woEnd);

// ٢٠٢٦/١٠/٠٦ — جدول أوامر `sec_work_orders` نُقل كما هو إلى تبويب «من البلاغات»
// حين أُعيد بناء صفحة الصيانة على سجل الصيانة التصحيحية؛ العقد يتبعه.
const MAINTENANCE = strip(read("src/components/sec/maint/IncidentWorkOrdersTab.tsx"));
const CALENDAR = read("src/components/ui/calendar.tsx");

describe("① لا نص مصادقة ظاهرًا في مسار الإنشاء", () => {
  it("حدود الشريحة صحيحة — حارسٌ على شريحة فارغة لا يحرس شيئًا", () => {
    expect(woStart).toBeGreaterThan(-1);
    expect(woEnd).toBeGreaterThan(woStart);
    expect(WO_DIALOG).toContain("createWorkOrder");
  });

  it("رسالة الجلسة لا تعود إلى زرّ الإنشاء", () => {
    expect(WO_DIALOG, "عاد SESSION_ERROR_AR إلى مسار الإنشاء").not.toContain("SESSION_ERROR_AR");
    expect(WO_DIALOG).not.toContain("انتهت الجلسة");
    expect(WO_DIALOG).not.toMatch(/سجّ?ل الدخول/);
  });

  it("ولا عبارة مصادقة تقنية بأي صياغة (نمط الطريقة المحفوظة، البند ٣)", () => {
    // isSessionError مُعرَّف خارج الشريحة ولا يطابق النمط — ما يطابقه هو
    // النصوص المعروضة الخام من جنس Unauthorized/token التي يمنعها البند.
    expect(WO_DIALOG).not.toMatch(/authenticat|unauthor|token|forbidden|jwt|bearer/i);
  });

  it("الفشل غير 401/403 يعرض رسالة عربية محايدة + زر إعادة المحاولة", () => {
    expect(WO_DIALOG).toContain("GENERIC_ERROR_AR");
    expect(WO_DIALOG).toContain("إعادة المحاولة");
    // ولا يمرّ عبر userFacingError الذي قد يعيد رسالة الجلسة.
    expect(WO_DIALOG, "onError عاد يمرّر خطأ الخادم إلى مرشِّح قد يُظهر رسالة جلسة").not.toContain(
      "userFacingError",
    );
  });
});

describe("② السقوط عند 401/403 إلى إنشاء محاكاة مرجعية محلي", () => {
  it("مصادَق أولًا: الكتابة الحقيقية تبقى المسار الأول للجلسة الصالحة", () => {
    // ترتيب النص يحفظ ترتيب المسارين: الكتابة الحقيقية قبل السقوط المحاكى.
    const real = WO_DIALOG.indexOf("await fn(");
    const sim = WO_DIALOG.indexOf("addLocalSimWorkOrder(");
    expect(real).toBeGreaterThan(-1);
    expect(sim).toBeGreaterThan(real);
  });

  it("التقاط 401/403 عبر isSessionError ثم السقوط للمحاكاة", () => {
    expect(WO_DIALOG).toContain("isSessionError");
    expect(WO_DIALOG).toContain("addLocalSimWorkOrder(");
  });

  it("الصف المحاكى موسوم is_simulation ويحمل معرّف sim-*", () => {
    expect(DIALOGS_CODE).toMatch(/is_simulation:\s*true/);
    expect(DIALOGS_CODE).toContain("sim-local-");
  });

  it("toast صدق الكتابة يقول «بيانات مرجعية» وإنه لا يُحفَظ — صراحةً (استثناء REQ-021)", () => {
    expect(DIALOGS_CODE).toContain("SIM_WO_CREATED_INFO");
    expect(DIALOGS_CODE).toMatch(
      /SIM_WO_CREATED_INFO\s*=\s*\n?\s*"[^"]*بيانات مرجعية[^"]*لا يُحفَظ في قاعدة البيانات"/,
    );
    expect(WO_DIALOG).toContain("toast.info(SIM_WO_CREATED_INFO)");
  });

  it("لا كتابة قاعدة للزائر: المسار المحاكى لا يستدعي الخادم ولا supabase", () => {
    // داخل الفرع المحاكى (بعد addLocalSimWorkOrder لا نداء fn/supabase آخر).
    const simAt = WO_DIALOG.indexOf("addLocalSimWorkOrder(");
    const afterSim = WO_DIALOG.slice(simAt, WO_DIALOG.indexOf("onSuccess"));
    expect(afterSim).not.toContain("await fn(");
    expect(afterSim).not.toContain("supabase.");
  });

  it("جدول الصيانة يدمج المخزن المحلي ويعرض وسم «مرجعي» بأنه ليس حيًّا", () => {
    expect(MAINTENANCE).toContain("useLocalSimWorkOrders");
    expect(MAINTENANCE).toContain('title="بيانات مرجعية — ليست حيّة"');
    expect(MAINTENANCE).toMatch(/>\s*مرجعي\s*</);
    expect(MAINTENANCE).toMatch(/is_simulation/);
  });
});

describe("③ منتقي التقويم البصري مركّب على تاريخ الاستحقاق", () => {
  it("لا مُدخل تاريخ خام يُكتب يدويًا في حوار الإنشاء", () => {
    expect(WO_DIALOG).not.toContain('type="date"');
    expect(WO_DIALOG).not.toContain('type="datetime-local"');
  });

  it("Popover + Calendar مركّبان في الحوار", () => {
    expect(WO_DIALOG).toContain("<Calendar");
    expect(WO_DIALOG).toContain("PopoverTrigger");
    expect(WO_DIALOG).toContain("PopoverContent");
    expect(DIALOGS).toContain('from "@/components/ui/calendar"');
    expect(DIALOGS).toContain('from "@/components/ui/popover"');
  });

  it("مكوّن التقويم عربي RTL فوق react-day-picker وأهداف لمسه ≥44px", () => {
    expect(CALENDAR).toContain("react-day-picker");
    expect(CALENDAR).toContain('dir="rtl"');
    expect(CALENDAR).toContain("arSA");
    // size-11 = 44px — خلايا الأيام وزرّا التنقّل.
    expect(CALENDAR).toMatch(/size-11/);
  });

  it("القيمة تبقى بصيغة yyyy-MM-dd وتُحوَّل لنهاية اليوم في الإرسال — عقد due_at كما هو", () => {
    expect(DIALOGS_CODE).toContain("toLocalYmd");
    // ٢٠٢٦/٠٩/١٣ — التثبيت عند نهاية اليوم انتقل إلى `buildWorkOrderPayload`
    // مع بناء الحمولة كلّها، فالبند يتبعه إلى موضعه الجديد ولا يسقط: العقد
    // المحروس هو **أن التحويل يقع**، لا أن يقع في هذا الملفّ بعينه.
    // (وقيمته مقيسة بالمساواة في `src/lib/work-orders/draft.test.ts`.)
    expect(WO_DIALOG).toContain("buildWorkOrderPayload(form)");
    expect(strip(read("src/lib/work-orders/draft.ts"))).toContain("T23:59:59");
  });
});
