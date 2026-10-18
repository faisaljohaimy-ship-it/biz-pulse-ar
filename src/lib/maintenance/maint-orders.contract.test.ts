/**
 * عقد «أوامر عمل الصيانة» (أمر المالك ٢٠٢٦/١٠/٠٦) — ما يسهل كسره بلا أن يسقط
 * بناء: منحٌ افتراضي يبقى للزائر (درس TRUNCATE على `staff_accounts`)، أو مقارنة
 * فاعلٍ تبتلعها NULL (قِيست: مشغّلٌ غير مُسنَد قدّم أمرًا)، أو عرضٌ يتجاوز RLS بلا
 * شرط عضوية، أو أوزان مراحل تفترق بين القاعدة والواجهة، أو بياناتٌ حقيقية
 * تتسرّب إلى المستودع أو إلى الزائر. السلوك نفسه قِيس على Postgres حقيقي
 * (`supabase/preflight/maint_orders_check.sql`: ٨٧ حالة).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAGES, STAGE_PCT } from "@/lib/maintenance/cm-log-rules";

const MIG = readFileSync("supabase/migrations/20261006120000_maint_orders.sql", "utf8");
const RB = readFileSync("supabase/migrations/20261006120001_maint_orders_rollback.sql", "utf8");
const CODE = MIG.replace(/--.*$/gm, "");

describe("الترحيل — لا شيء للزائر، والكتابة عبر الدوالّ وحدها", () => {
  it("كل امتيازٍ يُنزع ثم تُمنح القراءة وحدها", () => {
    expect(CODE).toContain(
      "revoke all on public.maint_orders, public.maint_order_events from anon, authenticated",
    );
    expect(CODE).toContain(
      "grant select on public.maint_orders, public.maint_order_events to authenticated",
    );
    expect(CODE).toContain("revoke all on public.maint_orders_v from anon, authenticated");
    // لا منح كتابةٍ ولا سياسة كتابة على الجدولين.
    expect(CODE).not.toMatch(
      /grant [^;]*(insert|update|delete|truncate|all)[^;]* on public\.maint_/i,
    );
    expect(CODE).not.toMatch(/create policy [^;]*for (insert|update|delete|all)/i);
  });

  it("كل دالّة تُنزع من public وanon صراحةً قبل منحها للمصادَق", () => {
    const fns = [...CODE.matchAll(/create or replace function (public\.maint_\w+)\(/g)].map(
      (m) => m[1],
    );
    expect(fns.length).toBeGreaterThanOrEqual(10);
    for (const fn of fns) {
      expect(CODE, `${fn} بلا نزعٍ صريح`).toMatch(
        new RegExp(`revoke all on function ${fn.replace(".", "\\.")}\\([^)]*\\) from public, anon`),
      );
    }
  });

  it("مقارنة الفاعل لا تبتلعها NULL (قِيست الثغرة قبل التطبيق)", () => {
    expect(CODE).not.toMatch(/o\.assigned_to = auth\.uid\(\)/);
    expect(CODE.match(/o\.assigned_to is not distinct from auth\.uid\(\)/g)?.length).toBe(2);
    expect(CODE).toContain(
      "auth.uid() is not null and o.assigned_to is not distinct from auth.uid()",
    );
  });

  it("العرض يتجاوز RLS فيحمل شرط العضوية داخله", () => {
    const view = CODE.slice(CODE.indexOf("create view public.maint_orders_v"));
    expect(view).toContain("security_invoker = false");
    expect(view.slice(0, view.indexOf(";"))).toContain(
      "where public.is_org_member(o.org_id, 'viewer'::public.org_role)",
    );
  });

  it("الإغلاق والإرجاع والإلغاء للمدير، والفني إلى الأمام حتى الاختبار", () => {
    expect(CODE).toContain("only a manager can close or move back");
    expect(CODE).toContain("only a manager can cancel");
    expect(CODE).toContain("hold reason required");
  });

  it("أوزان المراحل في القاعدة = أوزانها في الواجهة", () => {
    const fn = CODE.slice(CODE.indexOf("function public.maint_stage_pct"));
    for (const s of STAGES) {
      expect(fn, `${s} يفترق`).toContain(`when '${s}' then ${STAGE_PCT[s]}`);
    }
    expect(fn).toContain("when _status = 'cancelled' then null");
  });

  it("التراجع مقابلٌ ولا يحذف بيانات", () => {
    for (const fn of [
      "maint_analytics()",
      "maint_kpis()",
      "maint_create_order(",
      "maint_advance_stage(",
      "maint_assign(",
      "maint_set_status(",
      "maint_staff_directory()",
    ]) {
      expect(RB).toContain(`drop function if exists public.${fn}`);
    }
    expect(RB).toContain("drop view if exists public.maint_orders_v");
    expect(RB.replace(/--.*$/gm, "")).not.toMatch(/drop table/i);
  });

  it("الحزمة تحاكي منح Supabase الافتراضي وترفض غير قاعدتها", () => {
    const H = readFileSync("supabase/preflight/maint_orders_check.sql", "utf8");
    expect(H).toContain("if current_database() <> 'sadeed_rls_harness'");
    expect(H).toContain(
      "alter default privileges in schema public grant all on tables to anon, authenticated",
    );
    expect(H).toContain("A advance (not assignee)");
    expect(H).toContain("anon truncate");
  });
});

describe("نقض حارس الجودة الثاني — لا يعود", () => {
  it("دور التطبيق العامّ مشروطٌ بعضوية مؤسسة الأمر", () => {
    const fn = CODE.slice(CODE.indexOf("function public.maint_is_manager"));
    const body = fn.slice(0, fn.indexOf("$$;"));
    expect(body).toMatch(
      /\(public\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)\s+or public\.has_role\(auth\.uid\(\), 'manager'::public\.app_role\)\)\s+and public\.is_org_member\(_org, 'viewer'::public\.org_role\)/,
    );
  });

  it("الفني المُسنَد يكتب ما دام عضوًا", () => {
    expect(
      CODE.match(
        /o\.assigned_to is not distinct from auth\.uid\(\)\s+and public\.is_org_member\(o\.org_id, 'viewer'::public\.org_role\)/g,
      )?.length,
    ).toBe(2);
  });

  it("سبب الإيقاف في عموده لا في نصّ الملاحظة", () => {
    expect(CODE).not.toMatch(/concat_ws\([^)]*_hold_reason/);
    expect(CODE).toContain("to_status, hold_reason, note)");
    const SHEET = readFileSync("src/components/sec/maint/MaintOrderSheet.tsx", "utf8");
    expect(SHEET).toContain("holdAr(e.hold_reason)");
  });

  it("الحزمة تحمل حالات الثغرتين", () => {
    const H = readFileSync("supabase/preflight/maint_orders_check.sql", "utf8");
    expect(H).toContain("X app-manager of org9 cancels org1 order");
    expect(H).toContain("T removed from org advances own assigned order");
    expect(H).toContain("V app-manager AND org1 member assigns (positive control)");
  });

  const PAGE = readFileSync("src/routes/_authenticated/sec.maintenance.tsx", "utf8");
  it("لا شارة محاكاة ولا مصدرٌ مرجعي — البيانات فعلية وحدها، والشارة تقول مصدرها", () => {
    expect(PAGE).not.toMatch(/محاكاة مرجعية|"reference"/);
    expect(PAGE).toContain("<SourceBadge source={s.source} exportDate={s.exportDate} />");
    const UI = readFileSync("src/components/sec/maint/maint-ui.tsx", "utf8");
    expect(UI).toContain("نسخة تصدير SAP PM — {fmtDate(exportDate)}");
  });

  it("نسخة التصدير معلنةٌ في الصفحة، ولا تُعرض عليها أدوات الإسناد ولا «أوامري» (قرار ٢٠٢٦/١٠/١٨)", () => {
    expect(PAGE).toContain("القاعدة الحية لا تجيب الآن — المعروض أوامر تصدير SAP PM المعتمد");
    expect(PAGE).toMatch(/\{s && s\.source === "database" && \(\s*<Attention/);
    expect(PAGE).toContain("signedIn={!!user && !exportMode}");
    // البديل مؤقّت: يُعاد السؤال فتعود القاعدة الحية متى أجابت.
    expect(PAGE).toContain(
      'refetchInterval: (q) => (q.state.data?.source === "export" ? 60_000 : false)',
    );
    const SHEET = readFileSync("src/components/sec/maint/MaintOrderSheet.tsx", "utf8");
    expect(SHEET).toContain("enabled: !!id && !isExportOrder({ id })");
    expect(SHEET).toContain("نسخة التصدير للقراءة وحدها");
  });

  it("فشل الملخّص رسالةٌ وزرّ إعادة لا هيكلٌ أبدي", () => {
    expect(PAGE).toContain("<SummaryError onRetry={() => summary.refetch()} />");
    expect(PAGE.match(/summary\.isError/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("الغرامة: الفراغ «لم يُقَس/غير مسجّلة» والصفر وحده «لا غرامة»", () => {
    expect(PAGE).not.toContain('k?.penalties ? fmtSar(k.penalties) : "لا غرامات"');
    expect(PAGE).toContain('"لم يُقَس"');
    const SHEET = readFileSync("src/components/sec/maint/MaintOrderSheet.tsx", "utf8");
    expect(SHEET).toContain('"غير مسجّلة"');
  });

  it("رقم المؤشر يلتفّ داخل بطاقته لا يخرج منها", () => {
    expect(PAGE).toContain("[overflow-wrap:anywhere]");
    expect(PAGE).not.toMatch(/whitespace-nowrap font-black tabular-nums/);
  });

  it("«بلا فني مُسنَد» يفلتر فعلًا", () => {
    expect(PAGE).toContain('onPick({ unassigned: true }, "active")');
    const FN = readFileSync("src/lib/maint.functions.ts", "utf8");
    // على `is_assigned` لا `assigned_to`: هوية الفني محجوبة عن الزائر، فالفلتر
    // عليها يعدّ كل أمرٍ نشط «بلا فني» (نقض الحارس ٢٠٢٦/١٠/٠٦ — المادة ٢٧).
    expect(FN).toContain('q = q.eq("is_assigned", false)');
    expect(FN).not.toContain('q.is("assigned_to", null)');
    const MIG = readFileSync(
      "supabase/migrations/20261006190000_maint_orders_sap_public.sql",
      "utf8",
    );
    expect(MIG).toContain("(o.assigned_to is not null) as is_assigned");
    expect(MIG).toContain("and not is_assigned)");
  });

  it("الخطأ يظهر خلال مهلة الخادم — لا إعادة محاولة تلقائية تُطيل الهيكل (المادة ١٤)", () => {
    expect(PAGE.match(/retry: false/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const SHEET = readFileSync("src/components/sec/maint/MaintOrderSheet.tsx", "utf8");
    expect(SHEET).toContain("retry: false");
  });
});

describe("البيانات الحقيقية لا تدخل المستودع ولا تصل الزائر", () => {
  it("لا ملف xlsx/csv في المستودع خارج node_modules", () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.name === "node_modules" ||
        e.name.startsWith(".") ||
        e.name === "dist" ||
        e.name === ".output"
          ? []
          : e.isDirectory()
            ? walk(`${d}/${e.name}`)
            : [`${d}/${e.name}`],
      );
    const hits = [...walk("src"), ...walk("supabase"), ...walk("scripts")].filter((f) =>
      /\.(xlsx|xls|csv)$/i.test(f),
    );
    expect(hits).toEqual([]);
  });

  it("لا موقع حقيقيّ ولا رقم SAP حقيقي في ملفات الصيانة (نقض الحارس الثاني)", () => {
    const files = [
      "src/lib/maintenance/cm-log-rules.test.ts",
      "src/lib/maintenance/cm-log-rules.ts",
      "src/lib/maintenance/sap-export-rules.ts",
      "src/lib/maintenance/sap-export-rules.test.ts",
      "src/lib/maintenance/maint-export-fallback.server.ts",
      "src/lib/maintenance/maint-export-fallback.test.ts",
      "scripts/import-sap-export.mjs",
      "src/components/sec/maint/NewMaintOrderDialog.tsx",
      "supabase/preflight/maint_orders_check.sql",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/Power Plant|محطة توليد|JEDDAH HQ|\b66000\d{6}\b/i);
    }
  });

  it("لا نصّ دون ١٢px في الصيانة — أرضية ui-audit على الإنتاج (رسبت ٢٠٢٦/١٠/٠٧ بشارة 11px)", () => {
    for (const f of [
      "src/routes/_authenticated/sec.maintenance.tsx",
      ...readdirSync("src/components/sec/maint").map((n) => `src/components/sec/maint/${n}`),
    ]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/);
    }
    // عنوان الشهر (12px) أعرض من عموده: بلا حشوة يُقصّ أوّلها عند حافة البداية
    // في RTL حيث لا يصل السكرول — فيُقرأ «١١» «١» (نقض الحارس ٢٠٢٦/١٠/٠٧).
    expect(readFileSync("src/components/sec/maint/MaintAnalytics.tsx", "utf8")).toContain(
      "overflow-x-auto px-2 pb-6",
    );
  });

  it("لا محاكاة في الصيانة — الملف محذوف ولا مرجع له (أمر المالك ٢٠٢٦/١٠/٠٦)", () => {
    expect(existsSync("src/lib/maintenance/maint-simulation.ts")).toBe(false);
    for (const f of [
      "src/lib/maint.functions.ts",
      "src/routes/_authenticated/sec.maintenance.tsx",
      "src/components/sec/maint/MaintOrderSheet.tsx",
      "src/components/sec/maint/maint-ui.tsx",
      "src/lib/maintenance/maint-export-fallback.server.ts",
    ]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/maint-simulation|Simulation\(|is_simulation/);
    }
    // البديل يقرأ التصدير الحقيقي وحده — لا مرجع محاكاة ولا `resilient` ولا وسم.
    const FB = readFileSync("src/lib/maintenance/maint-export-fallback.server.ts", "utf8").replace(
      /^\s*(\/\/|\*|\/\*\*).*$/gm,
      "",
    );
    expect(FB).toContain('from "@/lib/exec/maintenance-report.real.server"');
    expect(FB).not.toMatch(/showcase-simulation|resilient\(|markSimulation|is_simulation/);
    // نصّ العرض نفسه: لا يُقال للزائر «محاكاة» فوق بيانات فعلية، ولا حارس صفوف `sim-`.
    for (const f of [
      "src/components/sec/maint/MaintOrderSheet.tsx",
      "src/components/sec/maint/MaintOrderCard.tsx",
      "src/components/sec/maint/MaintAnalytics.tsx",
    ]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/محاكاة|"sim-"/);
    }
  });

  it("القاعدة أوّلًا للجميع؛ وعطلها ⇐ تصدير SAP الحقيقي أو خطأٌ صريح، والكتابة كلّها خلف المصادقة", () => {
    const FN = readFileSync("src/lib/maint.functions.ts", "utf8");
    // لا مسار للزائر يتجاوز القاعدة: العرض يقرّر ما يُرى. والعطل وحده يستدعي البديل (قرار المالك
    // ٢٠٢٦/١٠/١٨) — بعد سؤال القاعدة لا قبله — وحيث لا بديل يُرفع الخطأ العربي.
    for (const [r, call, fb] of [
      ["listMaintOrders", "withTimeout(q.range(", "maintExportPage(data)"],
      ["getMaintSummary", 'db.rpc("maint_kpis")', "maintExportSummary()"],
    ] as const) {
      const at = FN.indexOf(`export const ${r}`);
      const body = FN.slice(at, FN.indexOf("export const", at + 10));
      expect(body, r).not.toMatch(/if \(!context\.userId\) return/);
      expect(body, r).toContain('await import("@/lib/maintenance/maint-export-fallback.server")');
      expect(body.indexOf(call), `${r}: القاعدة أوّلًا`).toBeGreaterThan(-1);
      expect(body.indexOf(call), `${r}: البديل بعد القاعدة`).toBeLessThan(body.indexOf(fb));
      expect(body.indexOf("} catch (e) {"), `${r}: البديل في مسار العطل وحده`).toBeLessThan(
        body.indexOf(fb),
      );
      expect(body, r).toMatch(/if \(fallback\) return fallback;\s*throw new Error\(READ_FAILED\);/);
    }
    expect(FN.match(/throw new Error\(READ_FAILED\)/g)?.length).toBeGreaterThanOrEqual(3);
    for (const w of [
      "createMaintOrder",
      "assignMaintOrder",
      "advanceMaintStage",
      "setMaintStatus",
    ]) {
      const at = FN.indexOf(`export const ${w}`);
      expect(FN.slice(at, at + 200), w).toContain(".middleware([requireSupabaseAuth])");
    }
    expect(FN).toContain('"maint_create_order_v2"');
  });

  it("الزائر يقرأ في النافذة ويُقال له ما يُحجب، وبعدها يُدعى للدخول", () => {
    const PAGE = readFileSync("src/routes/_authenticated/sec.maintenance.tsx", "utf8");
    expect(PAGE).toContain("قراءةٌ عامة حتى ٦ أبريل ٢٠٢٧");
    expect(PAGE).toContain("انتهت فترة القراءة العامة");
    expect(PAGE).toContain("const guestLocked = !!s && !user && !publicOpen;");
    // البوابة الوحيدة لاستعلامات العرض `!authLoading` (لا `enabled: !!user`).
    expect(PAGE).not.toMatch(/enabled:\s*!!user/);
  });
});
