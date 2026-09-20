/**
 * P0-1 — لا أداةٌ مفعَّلة تشير إلى كائنٍ غير موجود.
 *
 * المقيس في الإنتاج قبل هذا الإصلاح: `rag.propose_candidate` و
 * `rag.record_gap` مسجَّلتان `enabled = true`، وجدولاهما
 * (`rag_candidates` · `rag_gaps`) يعيدان `to_regclass = NULL`. فالنداء
 * يُخفق بخطأ Postgres خام، والسجلّ يقول «الأداة مفعَّلة».
 *
 * والجذر ليس نسيانًا: ترحيل التسجيل `20260801183309` **يحرس** `comment on
 * table` بـ`if to_regclass(...) is not null`، ولا يحرس
 * `insert into tool_registry`. فالكاتب علم بالاحتمال وحرس الأقلّ أثرًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const MIGRATIONS = "supabase/migrations";
const GUARD = `${MIGRATIONS}/20260920140000_rag_tool_schema_guard.sql`;

describe("① الحارس يشتقّ الحالة ولا يؤكّدها", () => {
  const sql = read(GUARD);

  it("يقرأ المخطّط الفعليّ لا حالةً مفترَضة", () => {
    // `update ... set enabled = true` ثابتًا يكذب في البيئة التي لا
    // جداول فيها. الاشتقاق من `to_regclass` صحيحٌ في البيئتين.
    expect(sql).toMatch(/present\s*:=\s*to_regclass\(dep_name\) is not null/);
    expect(sql).toMatch(/set enabled = present/);
  });

  it("**ولا يُنشئ جدولًا** — جدولٌ فارغ يجعل الأداة تنجح في الفراغ", () => {
    // نجاحٌ كاذب أسوأ من إخفاقٍ صريح: يكتب البند ولا يقرؤه أحد.
    expect(sql, "الحارس ينشئ جدولًا").not.toMatch(/create table/i);
  });

  it("ويكتب سبب التعطيل — لا تعطيلًا صامتًا", () => {
    expect(sql).toMatch(/disabled_reason/);
    expect(sql).toMatch(/missing_dependency/);
  });

  it("ويرفع التعطيل تلقائيًّا حين يحضر التابع", () => {
    // يوم تُطبَّق ترحيلات 20260728* يعود التفعيل بلا ترحيلٍ ثالث.
    expect(sql).toMatch(/when present then \(metadata - 'disabled_reason'/);
  });

  it("وهو لا يغيّر شيئًا حين تكون الحالة صحيحة (idempotent)", () => {
    expect(sql).toMatch(/enabled is distinct from present/);
  });

  it("**ويمحو سببًا بائدًا** عن صفٍّ عاد تابعُه — وفاءً بما تعِد به ترويسته", () => {
    // الشرط الأوّل وحده كان يمنع المحو، فيبقى سببُ تعطيلٍ يناقض الحالة.
    expect(sql).toMatch(/or \(present and metadata \? 'disabled_reason'\)/);
  });

  it("**والأدوات الثلاث كلّها في الخريطة** — لا ثالثةٌ خارج الحكم", () => {
    // `rag.search_verified` أداةُ قراءة بلا `writes`، فكانت تخرج من العدّ
    // ويمرّ الحكم مطلقًا فوق ثغرةٍ معلومة. تابعها مقيسٌ على الإنتاج.
    for (const t of ["rag.propose_candidate", "rag.record_gap", "rag.search_verified"]) {
      expect(sql, `${t} خارج الخريطة`).toContain(`'${t}'`);
    }
  });

  it("والشهادة تُشتقّ من المخطّط لا من مفتاحٍ يكتبه الحارس نفسه", () => {
    // عدُّ الصفوف الموسومة وحدها دائرةٌ تشهد لنفسها: أداةٌ خارج الخريطة
    // (مثل `rag.search_verified`) تمرّ خضراء مهما كان تابعها.
    expect(sql).toMatch(/metadata->>'writes'/);
  });

  it("ويفشل صراحةً لو بقي خرقٌ بعده", () => {
    expect(sql).toMatch(/raise exception 'أدواتٌ مفعَّلة بتوابع غائبة/);
  });

  it("وله تراجعٌ مرافق في الدفعة نفسها", () => {
    const down = read(`${MIGRATIONS}/20260920140001_rag_tool_schema_guard_rollback.sql`);
    expect(down).toMatch(/set enabled = true/);
    expect(down).toMatch(/guarded_by' = '20260920140000_rag_tool_schema_guard'/);
  });
});

describe("② الإخفاق مرئيّ لا صامت", () => {
  const orch = read("src/lib/exec/tool-orchestrator.server.ts");

  it("الأداة المعطَّلة تُرفض قبل أي تنفيذ", () => {
    expect(orch).toMatch(/if \(!reg\.enabled\)/);
  });

  it("**والسبب يُنقل مع الرفض** — لا «Tool disabled» عارية", () => {
    // بلا السبب يُقرأ تعطيلُ حارسِ المخطّط قرارًا تشغيليًّا، فيُبحث عن
    // العلّة في غير موضعها.
    expect(orch).toMatch(/disabled_reason/);
    expect(orch).toMatch(
      /select\("id, enabled, permissions, requires_approval, rollback_kind, metadata"\)/,
    );
  });

  it("ولا يبتلع المنسّق خطأ الأداة", () => {
    // `rag.record_gap` و`rag.propose_candidate` يرميان على خطأ القاعدة.
    const reg = read("src/lib/exec/tool-registry.server.ts");
    expect(reg).toMatch(/throw new Error\(`rag\.record_gap failed/);
    expect(reg).toMatch(/throw new Error\(`rag\.propose_candidate failed/);
  });
});

describe("③ الدرس: ترحيلٌ يسجّل أداةً يحرس تابعها", () => {
  it("ترحيل التسجيل حرس `comment` ولم يحرس `insert` — وهو الجذر", () => {
    const src = read(`${MIGRATIONS}/20260801183309_ba1047d4-9912-42d8-b966-dce5c43bfe22.sql`);
    // يُقرأ هنا شاهدًا على الجذر لا مطالبةً بتعديله: الترحيلات المطبَّقة
    // لا تُعدَّل (عقيدة المشروع)، والإصلاح يأتي بترحيلٍ لاحق.
    expect(src).toMatch(/if to_regclass\('public\.rag_candidates'\) is not null then/);
    expect(src).toMatch(/insert into public\.tool_registry/);
  });

  it("وأي ترحيلٍ لاحق يسجّل أداةً يجب أن يحرس تابعها", () => {
    // حارسٌ للمستقبل: أي ترحيلٍ جديد (بعد الحارس) يضيف أداةً إلى
    // `tool_registry` يجب أن يذكر `to_regclass` أو `enabled` صراحةً.
    const files = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql") && f > "20260920140001")
      .filter((f) => /insert into public\.tool_registry/i.test(read(`${MIGRATIONS}/${f}`)));
    for (const f of files) {
      const sql = read(`${MIGRATIONS}/${f}`);
      expect(/to_regclass/i.test(sql), `${f} يسجّل أداةً بلا حارس to_regclass على تابعها`).toBe(
        true,
      );
    }
  });
});
