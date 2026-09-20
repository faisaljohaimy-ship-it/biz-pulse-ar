/**
 * P0-2 — أثرٌ يسجّل **قرارات المنع** لا نتائج التنفيذ وحدها.
 *
 * ## ما كشفه التحقيق — وهو غير ما بدا
 *
 * `audit_logs = 0` في الإنتاج، والاستنتاج الأوّل أن الكاتب معطوب. وهو
 * **ليس كذلك**: `audit.server.ts` وكلّ نداءاته في المنسّق أُنشئت في
 * `6442aeb` بتاريخ ٢٠٢٦/٠٨/٢١، والتنفيذات الخمسين ألفًا وقعت بين
 * ٢٠٢٦/٠٦/٢٦ و٠٧/٠٧. فالكاتب **لم يكن موجودًا حين وقع ما كان يُسجَّل**،
 * ولم يقع بعده شيء. والجدول الفارغ نتيجةٌ حسابية صحيحة لا عطل.
 *
 * ## والعطل الحقيقيّ: التغطية
 *
 * ثمانية عشر فعلًا مسجَّلًا، كلّها **نتائج تنفيذ** (`tool.execute.*` ·
 * `agent.run.*` · `workflow.*`). ولا واحد منها **قرارُ منع**: من حاول
 * أداةً لا يملك دورها كان يُرمى بلا سطرٍ واحد.
 *
 * والمحاولة المرفوضة أدلّ أمنيًّا من الناجحة: تكرارُها من فاعلٍ واحد هو
 * ما يُقرأ محاولةَ تصعيدِ صلاحيات، وغيابُها يجعل ذلك غير مرئيّ.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { audit, auditHealth, resetAuditHealth } from "./audit.server";

const read = (p: string) => readFileSync(p, "utf8");
const ORCH = read("src/lib/exec/tool-orchestrator.server.ts");

/** عميل Supabase زائف — يسجّل ما أُدرج، أو يُخفق عند الطلب. */
function fakeClient(opts: { fail?: string } = {}) {
  const rows: Record<string, unknown>[] = [];
  const client = {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          if (opts.fail) return Promise.resolve({ error: { message: opts.fail } });
          rows.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, rows };
}

beforeEach(() => resetAuditHealth());

describe("① قرار المنع يُسجَّل — الثلاثة", () => {
  it.each([
    ["unauthorized", /Forbidden: missing role/],
    ["disabled", /Tool disabled/],
    ["misconfigured", /no permissions configured/],
  ])("المنع «%s» له سطرٌ قبل الرمي", (decision, throwPattern) => {
    // كلّ منعٍ يسبقه `auditDenial` ثم يرمي — لا رميٌ بلا أثر.
    expect(ORCH).toMatch(new RegExp(`decision: "${decision}"`));
    expect(ORCH).toMatch(throwPattern);
  });

  it("والفعل المسجَّل يسمّي القرار لا «فشل» عامًّا", () => {
    expect(ORCH).toMatch(/action: `tool\.denied\.\$\{params\.decision\}`/);
  });

  it("ويحمل الفاعل والمؤسسة والأداة — لا منعًا مجهول النسبة", () => {
    expect(ORCH).toMatch(/actor_id: params\.actorId/);
    expect(ORCH).toMatch(/org_id: params\.orgId/);
    expect(ORCH).toMatch(/resource_id: params\.toolId/);
    expect(ORCH).toMatch(/status: "denied"/);
  });

  it("**والمنع يقع قبل أي تنفيذ** — لا بعد أثرٍ جانبيّ", () => {
    const denyAt = ORCH.indexOf('decision: "unauthorized"');
    const insertAt = ORCH.indexOf('.from("tool_executions")');
    expect(denyAt).toBeGreaterThan(0);
    expect(denyAt, "المنع يقع بعد إدراج صفّ تنفيذ").toBeLessThan(insertAt);
  });

  it("**وتسجيل المنع لا يرمي** — سلوكًا لا تعليقًا", async () => {
    // الصيغة الأولى كانت grep على تعليقٍ عربيّ: تُثبت أن أحدًا كتب
    // الوعد، لا أنّ الشيفرة تفي به.
    const { client } = fakeClient({ fail: "row-level security" });
    await expect(
      audit(client, {
        actor_id: "user-1",
        action: "tool.denied.unauthorized",
        resource_type: "tool",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("② الكتابة الناجحة تحمل ما يُحتَجّ به", () => {
  it("الحقول المطلوبة كلّها في الصفّ", async () => {
    const { client, rows } = fakeClient();
    await audit(client, {
      actor_id: "user-1",
      org_id: "org-1",
      action: "tool.denied.unauthorized",
      resource_type: "tool",
      resource_id: "sec.create_incident",
      status: "denied",
      correlation_id: "corr-1",
      metadata: { decision: "unauthorized" },
    });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    // فاعل · فعل · هدف · نتيجة · وقت · معرّف ارتباط · سياق.
    expect(r.actor_id).toBe("user-1");
    expect(r.action).toBe("tool.denied.unauthorized");
    expect(r.resource_type).toBe("tool");
    expect(r.resource_id).toBe("sec.create_incident");
    expect(r.status).toBe("denied");
    expect(r.correlation_id).toBe("corr-1");
    expect(r.org_id).toBe("org-1");
    expect(typeof r.occurred_at).toBe("string");
    expect(r.metadata).toEqual({ decision: "unauthorized" });
  });
});

describe("③ الإخفاق مرئيّ — جدولٌ فارغ ليس «لم يقع شيء»", () => {
  it("الكتابة لا ترمي ولو أخفقت", async () => {
    const { client } = fakeClient({ fail: "new row violates row-level security policy" });
    await expect(
      audit(client, { action: "tool.denied.unauthorized", resource_type: "tool" }),
    ).resolves.toBeUndefined();
  });

  it("**لكنّ الإخفاق يُعدّ ويُقرأ** — لا يذهب إلى الطرفيّة وحدها", async () => {
    // لو رفضت RLS الإدراج لعمل النظام بلا أثرٍ إطلاقًا ولا شيء يقول ذلك.
    expect(auditHealth().failures).toBe(0);
    const { client } = fakeClient({ fail: "row-level security" });
    await audit(client, { action: "x", resource_type: "tool" });
    await audit(client, { action: "y", resource_type: "tool" });
    expect(auditHealth().failures).toBe(2);
    expect(auditHealth().lastFailure?.message).toMatch(/row-level security/);
    expect(auditHealth().lastFailure?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("والنجاح لا يرفع العدّاد", async () => {
    const { client } = fakeClient();
    await audit(client, { action: "ok", resource_type: "tool" });
    expect(auditHealth().failures).toBe(0);
    expect(auditHealth().lastFailure).toBeNull();
  });
});

// الجذر (الكاتب أُنشئ في `6442aeb` ٢٠٢٦/٠٨/٢١ بعد أن توقّف النشاط) موثَّق
// في ترويسة هذا الملفّ. ولا يُختبر: اختبارٌ يؤكّد أن ملفًّا يحوي نصّ نفسه
// يقيس نفسه، ويمرّ أبدًا ولا يحرس شيئًا.
