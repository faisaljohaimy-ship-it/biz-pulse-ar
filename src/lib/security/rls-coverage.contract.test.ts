/**
 * تغطية RLS في **الترحيلات** — وما لا يشهد له هذا الحارس.
 *
 * ## تصحيحٌ أوّلًا (٢٠٢٦/٠٩/٢٠)
 *
 * كُتب هذا الملفّ على أن «سبعة جداول حيّة عاشت شهورًا بلا RLS، والكشف
 * عابرٌ للمؤسسات». ثم فُحصت القاعدة الحيّة، فكان الوصف **خطأ**: السبعة
 * عليها RLS، ولكلٍّ سياستان — `<tbl>_read` بـ`is_org_member(org_id,'viewer')`
 * و`<tbl>_write` بـ`manager`/`operator` — ومقصورتان على `authenticated`،
 * فالزائر يقرأ صفرًا. ولا جدول من **142** في `public` بلا RLS.
 *
 * **وسبب الخطأ هو حدُّ هذا الملفّ نفسه: يقرأ الترحيلات لا القاعدة.**
 * الحماية موضوعة في الإنتاج بغير `supabase/migrations/**` (لوحة Supabase
 * أو خطّ Lovable)، فالمستودع ليس مصدر الحقيقة لمخطّط هذه القاعدة.
 *
 * ## فما الذي يبقى هذا الحارس نافعًا له
 *
 * الفجوة **في الاتجاه المعاكس، وهي حقيقية**: بناءُ بيئةٍ جديدة من
 * الترحيلات وحدها يعطي جداول بلا RLS، لأن الترحيلات لا تُنتج ما في
 * الإنتاج. فالمحروس هنا **قابلية الاستنساخ**: أي جدولٍ جديد يجب أن يُعلن
 * حاجزه في ترحيلٍ مقروء، لا أن يُوضع بيدٍ في لوحة فيضيع عند إعادة البناء.
 *
 * **وهو لا يشهد لأمان الإنتاج إطلاقًا.** الشهادة لذلك من
 * `supabase/preflight/rls_coverage_check.sql` على قاعدةٍ حيّة — وقد حذّر
 * من هذا الافتراق حرفًا، ثم وقعتُ فيه.
 *
 * **فالمحروس هنا القاعدة لا الحادثة:** أي جدولٍ جديد في `public` يجب أن
 * يحمل RLS، وإلا سقط هذا الاختبار قبل الدفع. والسبعة لم تعُد استثناءً —
 * صارت محكومةً بالقاعدة نفسها.
 *
 * ## ولماذا القراءة من الترحيلات لا من القاعدة
 *
 * القاعدة الحيّة خارج صلاحية جلسة التطوير. والترحيلات هي **مصدر الحقيقة
 * المُعلَن** لما يجب أن يكون عليه المخطط، وهي ما يُراجَع في الدفعة. فحارسٌ
 * هنا يمنع **إدخال** الثغرة؛ وأداةُ `supabase/preflight/rls_coverage_check.sql`
 * تقيس **الواقع** على قاعدةٍ حيّة. الاثنان لازمان ولا يغني أحدهما.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
const SQL = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .join("\n");

/** ملفّ الإصلاح وحده — ما يُحرَس فيه لا يُقرأ من جاره. */
const FIX_FILE = "20260919120000_rls_ptw_hcis_tables.sql";
const FIX = readFileSync(join(DIR, FIX_FILE), "utf8");

/** كل جدولٍ أُنشئ في `public` عبر الترحيلات. */
function declaredTables(): string[] {
  const re = /create table\s+(?:if not exists\s+)?(?:public\.)?"?(\w+)"?/gi;
  return [...new Set([...SQL.matchAll(re)].map((m) => m[1]))];
}

/** الجداول التي أُسقطت لاحقًا — لا يُطالَب المحذوف بحاجز. */
function droppedTables(): Set<string> {
  const re = /drop table\s+(?:if exists\s+)?(?:public\.)?"?(\w+)"?/gi;
  return new Set([...SQL.matchAll(re)].map((m) => m[1]));
}

/** الجداول التي فُعِّل عليها RLS — نصًّا أو عبر `format()` في حلقة. */
function rlsEnabled(): Set<string> {
  const direct = [
    ...SQL.matchAll(/alter table\s+(?:public\.)?"?(\w+)"?\s+enable row level security/gi),
  ].map((m) => m[1]);

  // الترحيل الديناميّ يُفعِّل عبر `format('alter table public.%I enable …')`
  // على مصفوفة أسماء. فتُقرأ المصفوفة نفسها، وإلا ظنّ الحارس السبعة
  // مكشوفةً بعد إغلاقها — حارسٌ يكذب في الاتجاه الآخر.
  const dynamic: string[] = [];
  if (/format\(\s*'alter table public\.%I enable row level security'/i.test(SQL)) {
    for (const block of SQL.matchAll(/tables text\[\] :=\s*array\[([\s\S]*?)\]/gi)) {
      for (const name of block[1].matchAll(/'(\w+)'/g)) dynamic.push(name[1]);
    }
  }
  return new Set([...direct, ...dynamic]);
}

/**
 * استثناءات مُعلَنة — **كلٌّ بسببه، ولا يُضاف إليها بلا سبب مكتوب.**
 *
 * فارغة اليوم عمدًا: السبعة أُغلقت بترحيل ٢٠٢٦/٠٩/١٩ ولم يبقَ مكشوف.
 * وأي إضافةٍ هنا قرارُ مالكٍ يُكتب سببه بجانبه، لا تسكينٌ لاختبارٍ أحمر.
 */
const ALLOWED_WITHOUT_RLS: ReadonlyMap<string, string> = new Map();

describe("تغطية RLS — لا جدول في public بلا حاجز", () => {
  it("قائمة الجداول تُقرأ فعلًا — حارسٌ على قائمة فارغة لا يحرس شيئًا", () => {
    expect(declaredTables().length).toBeGreaterThan(100);
    expect(rlsEnabled().size).toBeGreaterThan(100);
  });

  it("كل جدولٍ حيّ عليه `enable row level security`", () => {
    const dropped = droppedTables();
    const enabled = rlsEnabled();
    const exposed = declaredTables()
      .filter((t) => !dropped.has(t))
      .filter((t) => !enabled.has(t))
      .filter((t) => !ALLOWED_WITHOUT_RLS.has(t))
      .sort();

    expect(
      exposed,
      `جداول بلا RLS — RLS المطفأ يعني لا قيد إطلاقًا، و«لا GRANT في الترحيل» ` +
        `ليس حمايةً لأن Supabase تمنح anon افتراضيًّا على مستوى المخطط: ${exposed.join(", ")}`,
    ).toEqual([]);
  });

  it("والسبعة التي كُشفت صارت محكومةً بالقاعدة لا مستثناةً منها", () => {
    const enabled = rlsEnabled();
    for (const t of [
      "permits",
      "permit_approvals",
      "permit_types",
      "hcis_assessments",
      "hcis_findings",
      "hcis_inspections",
      "hcis_requirements",
    ]) {
      expect(enabled.has(t), `${t} فقد حاجزه`).toBe(true);
      expect(ALLOWED_WITHOUT_RLS.has(t), `${t} أُدرج في الاستثناءات بدل أن يُصلَح`).toBe(false);
    }
  });

  it("وامتياز الزائر مسحوبٌ عنها — لا سياسةٌ وحدها", () => {
    // سياسةٌ تُحذف يومًا تُعيد فتح الباب؛ ونزعُ الامتياز يجعل ذلك مستحيلًا
    // لا محروسًا.
    expect(FIX).toMatch(/revoke all on public\.%I from anon/);
  });

  it("وعزلُها بالمؤسسة لا بالمصادقة وحدها", () => {
    // `to authenticated using (true)` يمنع الزائر ولا يمنع عضو مؤسسةٍ من
    // قراءة مؤسسةٍ أخرى — وهو الكشف الأثقل هنا.
    //
    // **والقراءة من ملفّ الإصلاح وحده لا من الترحيلات مجتمعة.** أوّل صياغة
    // فحصت النصّ المتّحد، فمرّت حقنةُ `using (true)` سليمةً: ترحيلُ عزل
    // المستأجرين (٢٠٢٦/٠٦/٢٦) يحمل النمط نفسه حرفًا بحرف على جداول أخرى،
    // فكان الحارس يجد مطابقةً في ملفٍّ لا يحرسه. حارسٌ يقرأ خارج نطاقه
    // يمرّ على العطل الذي وُجد له.
    expect(FIX).toMatch(/public\.is_org_member\(org_id, ''viewer''\)/);
  });

  it("ولكل ترحيلٍ يفعّل RLS تراجعٌ مرافق", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".sql"));
    expect(files).toContain("20260919120000_rls_ptw_hcis_tables.sql");
    expect(files).toContain("20260919120001_rls_ptw_hcis_rollback.sql");
  });
});
