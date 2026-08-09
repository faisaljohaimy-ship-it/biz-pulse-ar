/**
 * حارس المادة ٢٧ — الصدق العددي على أسطح التشغيل.
 *
 * العطل الذي وُلد هذا الملف لأجله: في `command-center.functions.ts` كان
 * يُكتب `incidents_open: i === 0 ? openIncidents : 0` — فيُسنَد كل البلاغات
 * المفتوحة إلى المنطقة الأولى وتُعرض الثلاث الباقية «بلا بلاغات» بشارة
 * «سليم». لا `tsc` يراه ولا `eslint`: السطر صحيح نحويًّا، وأثره لا يُرى إلا
 * بفتح الشاشة ومعرفة أن `sec_incidents` لا يحمل منطقة أصلًا.
 *
 * لذلك حارسان لا واحد:
 * ① **سلوكي** — يُشغَّل المسار الحيّ بعميل مُصطنع ويُتحقَّق أن كل منطقة
 *    تعود `null`. لا تخدعه إعادة صياغة السطر.
 * ② **نصّي** — يمنع عودة الأنماط بعينها (سُلَّم صحّة مؤلَّف، نسبة تقدّم من
 *    عدد الخطوات، صفرٌ مكان نسبة بلا عيّنة). يلزم لأنّ هذه الأسطح مكوّنات
 *    مسارات لا تُشغَّل في اختبار وحدة.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchCommandCenterLive } from "./command-center.functions";
import { REGIONS } from "@/lib/regions";

const read = (p: string) => readFileSync(p, "utf8");

/**
 * عميل Supabase مُصطنع: كل حلقة في السلسلة تعيد الوعد نفسه، فيصحّ
 * `from().select().neq().order().limit()` بأي ترتيب، ويُنتظر كوعدٍ واحد.
 */
function stubSupabase(tables: Record<string, unknown[]>) {
  const make = (rows: unknown[]) => {
    const p = Promise.resolve({ data: rows }) as Promise<{ data: unknown[] }> &
      Record<string, () => unknown>;
    for (const link of ["select", "order", "limit", "neq", "eq", "gte", "not"]) {
      p[link] = () => p;
    }
    return p;
  };
  return { from: (t: string) => make(tables[t] ?? []) };
}

/** ثلاثة بلاغات مفتوحة، وامتثالٌ مقيس للغربية وحدها. */
const TABLES: Record<string, unknown[]> = {
  intelligence_agents: [{ id: "a1", name_ar: "وكيل", role: "دور", status: "active" }],
  evolution_proposals: [],
  finn_improvement_proposals: [],
  urgent_tasks: [],
  support_requests: [],
  sec_incidents: [
    { id: "i1", status: "open", severity: "critical" },
    { id: "i2", status: "investigating", severity: "high" },
    { id: "i3", status: "contained", severity: "medium" },
  ],
  hcis_compliance_status: [
    { region_code: "western", status: "compliant" },
    { region_code: "western", status: "compliant" },
    { region_code: "central", status: "not_assessed" },
  ],
};

describe("المادة ٢٧ — غرفة القيادة: لا توزيع يُخترع للبلاغات", () => {
  it("كل منطقة تعود `null` للبلاغات، ولا منطقة تُخصّ بالعدد كلّه", async () => {
    const state = await fetchCommandCenterLive(stubSupabase(TABLES));

    expect(state.regions).toHaveLength(REGIONS.length);
    for (const row of state.regions) {
      // العطل الأصلي: المنطقة الأولى تأخذ ٣ والباقيات صفر. كلاهما ممنوع.
      expect(row.incidents_open).toBeNull();
      // ولا عدد أصول للمنطقة: كان «عدد المواقع × ٨» لكل منطقة سواء.
      expect(row.assets_active).toBeNull();
      // ولا حكم سلامة مشتقًّا من رقم لم يُقَس.
      expect(row.severity).toBe("idle");
      expect(row.severity).not.toBe("healthy");
    }
    // ولا يُطمس المقيس: العدّ الكلّي قياسٌ وقع فيُعرض كما هو.
    expect(state.counters.incidents_open).toBe(3);
  });

  it("متوسط الامتثال يُقسَم على المقيس وحده لا على المناطق الأربع", async () => {
    const state = await fetchCommandCenterLive(stubSupabase(TABLES));
    // الغربية وحدها مقيسة (١٠٠٪)؛ والوسطى `not_assessed` والباقيتان بلا
    // صفوف. القسمة على أربعة كانت تُخرج «٢٥٪» — انهيار امتثال لم يقع.
    expect(state.counters.compliance_avg).toBe(100);
  });

  it("صفر مقيس يبقى صفرًا — الغياب وحده هو الذي يُقرأ «لم يُقَس»", async () => {
    const state = await fetchCommandCenterLive(stubSupabase({ ...TABLES, sec_incidents: [] }));
    // لا بلاغات مفتوحة قياسٌ صحيح: صفر، لا `null`.
    expect(state.counters.incidents_open).toBe(0);
  });
});

describe("المادة ٢٧ — حارس النصّ على الأسطح غير القابلة للتشغيل", () => {
  it("غرفة القيادة لا تُعيد سُلَّم الشدّة ولا مُضاعِف الأصول", () => {
    const FN = read("src/lib/exec/command-center.functions.ts");
    // إسناد كل العدد إلى منطقة بموضعها في المصفوفة.
    expect(FN).not.toMatch(/i\s*===\s*0\s*\?/);
    // مُضاعِف الأصول المؤلَّف (عدد المواقع × ٨): لا قيمة إلا `null`.
    expect(FN).toMatch(/assets_active:\s*null/);
    expect(FN).not.toMatch(/assets_active:\s*(?!null)\S/);
    // اشتقاق حالة المنطقة من عدد بلاغات غير مقيس.
    expect(FN).not.toMatch(/severity:\s*\(inc/);
    // العدّاد لا يُقسَم على `regions.length` (يبتلع غير المقيس في المقام).
    expect(FN).not.toMatch(/compliance_pct,\s*0\)\s*\/\s*regions\.length/);
  });

  it("سجل الوكلاء لا يُختلق له نسبة نجاح صفرية بلا تشغيل منتهٍ", () => {
    const FN = read("src/lib/exec.functions.ts");
    expect(FN).not.toMatch(/success_rate\s*=\s*finished\s*\?[^;]*:\s*0\s*;/);
    expect(FN).toMatch(/success_rate\s*=\s*finished\s*\?[^;]*:\s*null\s*;/);
  });

  it("غرفة العمليات لا تُعيد صحّة الوكيل المؤلَّفة ولا نسبة التقدّم من الخطوات", () => {
    const OPS = read("src/routes/_authenticated/operations.tsx");
    // سُلَّم الصحّة من الحالة: فاشل ٣٥٪ · يعمل ٩٢٪ · مصطفّ ٧٠٪ · مفعَّل ٨٨٪.
    expect(OPS).not.toMatch(/a\.state\s*===\s*"failed"\s*\?\s*35/);
    expect(OPS).not.toMatch(/`\$\{health\}%`/);
    // «كل خطوة ١٠٪» بسقفٍ عند ٩٥ يُخفي أنه مؤلَّف.
    expect(OPS).not.toMatch(/Math\.min\(95,\s*stepCount\s*\*\s*10\)/);
    // شريط التقدّم لا يُرسم لما لم يُقَس (شريطٌ فارغ يُقرأ صفرًا).
    expect(OPS).toMatch(/progress === null \? null : <Progress/);
    // والنِّسَب تمرّ بالمُنسِّق الموحَّد لا بقولبة مباشرة.
    expect(OPS).toContain("pctOrUnmeasured(progress)");
  });
});
