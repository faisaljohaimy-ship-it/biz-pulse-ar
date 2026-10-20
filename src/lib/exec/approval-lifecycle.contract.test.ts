/**
 * P0-3 — دورةُ حياةِ الاعتماد، **وأن المهلة لا تعتمد شيئًا.**
 *
 * المقيس في الإنتاج: ثلاثة تنفيذات في `pending_approval` منذ
 * ٢٠٢٦/٠٧/٠٧، وستّة مقترحات معلَّقة. والجذر أن `reapStaleExecutions`
 * يحصد `status = 'running'` وحده — فالمعلَّق للاعتماد بلا حاصدٍ ولا
 * مهلة، والمخطّط لا يعرف له حالةَ انتهاءٍ أصلًا.
 *
 * وأخطر ما يُحرس هنا **ألّا تنقلب المهلة اعتمادًا**: بابٌ يفتح نفسه بمرور
 * الوقت أسوأ من غياب الباب، لأنه يُقرأ حراسةً.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APPROVAL_TTL_MS } from "./tool-orchestrator.server";

const read = (p: string) => readFileSync(p, "utf8");
const ORCH = read("src/lib/exec/tool-orchestrator.server.ts");
const MIG = read("supabase/migrations/20260920150000_approval_lifecycle.sql");

describe("① المخطّط يعرف حالات الانتهاء", () => {
  it("`expired` و`superseded` في القيد", () => {
    // الحالة التي لا يسمّيها المخطّط لا يمكن أن تقع، فيبقى المعلَّق
    // معلَّقًا لأن لا اسم لانتهائه.
    expect(MIG).toMatch(/'expired'/);
    expect(MIG).toMatch(/'superseded'/);
  });

  it("والحالات الخمس المطلوبة كلّها ممثَّلة", () => {
    for (const s of ["rejected", "expired", "cancelled", "superseded", "queued"]) {
      expect(MIG, `الحالة ${s} غير ممثَّلة`).toMatch(new RegExp(`'${s}'`));
    }
  });

  it("واسم القيد يُقرأ من الكتالوج لا يُفترض", () => {
    // التسمية التلقائية تختلف بين بيئةٍ أُنشئت بالترحيل وأخرى بأداة.
    expect(MIG).toMatch(/select c\.conname/);
    expect(MIG).toMatch(/pg_get_constraintdef/);
  });

  it("والترحيل لا ينقل صفًّا — النقل فعلٌ مُصرَّح به من الشيفرة", () => {
    expect(MIG, "الترحيل يحدّث حالات صفوف").not.toMatch(
      /update public\.tool_executions\s+set status/i,
    );
  });

  it("وله تراجعٌ يفشل صراحةً بدل أن يُفسد", () => {
    const down = read("supabase/migrations/20260920150001_approval_lifecycle_rollback.sql");
    expect(down).toMatch(/raise exception\s*\n?\s*'لا يمكن التراجع/);
  });
});

describe("② المهلة تُنهي الانتظار — **ولا تنفّذ**", () => {
  it("تنقل إلى `expired` لا إلى `queued` ولا `approved`", () => {
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    const body = fn.slice(0, fn.indexOf("export async function reapStaleExecutions"));
    expect(body).toMatch(/status: "expired"/);
    expect(body, "المهلة تعتمد الطلب").not.toMatch(/status: "queued"/);
    expect(body, "المهلة تنفّذ الأداة").not.toMatch(/runWithExecutor|getExecutor\(/);
  });

  it("**ولا تستدعي المنفّذ بحال**", () => {
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    const body = fn.slice(0, fn.indexOf("export async function reapStaleExecutions"));
    expect(body).not.toMatch(/exec\.execute\(/);
  });

  it("وتشترط الحالة **عند الكتابة** لا عند القراءة وحدها", () => {
    // بين القراءة والكتابة قد يعتمد مسؤولٌ الطلب؛ والشرط المكرَّر يمنع
    // أن تمحو المهلةُ ذلك القرار. والـregex العامّة كان يُشبعها شرطُ
    // القراءة وحده، فتمرّ على شيفرةٍ بلا حمايةٍ عند الكتابة.
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    const updateAt = fn.indexOf(".update({");
    expect(updateAt).toBeGreaterThan(0);
    const afterUpdate = fn.slice(updateAt);
    expect(afterUpdate, "لا شرط حالةٍ بعد update").toMatch(/\.eq\("status", "pending_approval"\)/);
  });

  it("وقراءةٌ فاشلة ترمي — ولا تُقرأ «صفرٌ منتهٍ»", () => {
    // `{ expired: 0 }` عن قراءةٍ فاشلة يقول «لا شيء تجاوز مهلته» وهو
    // «لم نستطع النظر» — وهما نقيضان (المادة ٢٧).
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    expect(fn).toMatch(/error: readError/);
    expect(fn).toMatch(/Failed to read pending approvals/);
  });

  it("وأثر الانتهاء يُكتب بمفتاح الخدمة — وإلا رفضته RLS صامتًا", () => {
    // سياسة `audit_logs_org_insert` تشترط `actor_id = auth.uid()`،
    // وفاعلُ الانتهاء نظامٌ لا إنسان.
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    expect(fn).toMatch(/await audit\(admin, \{/);
  });

  it("والمهلة معلَنة لا مدفونة", () => {
    expect(APPROVAL_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("③ كلّ انتقالٍ مُسجَّل بفاعلٍ مسمًّى", () => {
  it("الانتهاء يُكتب في الأثر", () => {
    expect(ORCH).toMatch(/action: "tool\.approval\.expired"/);
  });

  it("وبمصدرٍ يقول من أغلق الطلب", () => {
    // «من أغلقه؟» سؤالٌ يجب أن يُجاب بعد شهر.
    expect(ORCH).toMatch(/source: "system:approval-ttl"/);
  });

  it("**ويقول صراحةً إنّه لم يُنفَّذ**", () => {
    expect(ORCH).toMatch(/executed: false/);
  });

  it("وسطرٌ لكلّ طلب لا سطرٌ للدفعة", () => {
    // الأثر يُسأل عن طلبٍ بعينه لا عن عمليةِ صيانة.
    const fn = ORCH.slice(ORCH.indexOf("export async function expireStaleApprovals"));
    expect(fn).toMatch(/for \(const r of rows\)[\s\S]{0,200}await audit\(/);
    expect(fn).toMatch(/resource_id: r\.id/);
  });

  it("والاعتماد والرفض مسجَّلان أصلًا", () => {
    expect(ORCH).toMatch(/action: "tool\.approval\.approved"/);
    expect(ORCH).toMatch(/action: "tool\.approval\.rejected"/);
  });
});

describe("④ لا اعتماد غير مراقَب ينفّذ", () => {
  it("القرار يُرفض على طلبٍ ليس معلَّقًا", () => {
    expect(ORCH).toMatch(/if \(pending\.status !== "pending_approval"\)/);
  });

  it("والرفض لا يُبلَّغ ما لم يُكتب", () => {
    expect(ORCH).toMatch(/Never report a rejection that did not persist/);
  });

  it("والتنفيذ خلف الاعتماد لا يقع إلا بـ`preApproved`", () => {
    // Server policy may strengthen the registry gate; neither source of
    // approval can be bypassed without the internal preApproved path.
    expect(ORCH).toMatch(
      /if \(\(reg\.requires_approval \|\| params\.requireApproval\) && !preApproved\)/,
    );
  });
});
