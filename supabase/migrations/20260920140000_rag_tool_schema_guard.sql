-- ════════════════════════════════════════════════════════════════════════
-- P0-1 — لا أداةٌ مفعَّلة تشير إلى كائنٍ غير موجود
-- ════════════════════════════════════════════════════════════════════════
--
-- ## العلّة المقيسة
--
-- ثلاث أدوات RAG مسجَّلة `enabled = true` في `tool_registry`، واثنتان منها
-- تعتمدان كائنين **غير موجودَين في الإنتاج**:
--
--   rag.propose_candidate → public.rag_candidates   (to_regclass = NULL)
--   rag.record_gap        → public.rag_gaps          (to_regclass = NULL)
--
-- ## الجذر — لا النسيان
--
-- الترحيل `20260801183309` هو من سجّل الأدوات. وكاتبُه **كان يعلم** أن
-- الجداول قد تغيب: في السطر ٢٦٧ منه حارسٌ صريح
-- `if to_regclass('public.rag_candidates') is not null then comment on …`.
-- فحَرَسَ `comment` — ولم يحرس `insert into tool_registry`. فسُجّلت
-- الأدوات مفعَّلةً بلا قيد.
--
-- ويُفاقمه أن `create or replace function rag_record_gap_for_org` **ينجح**
-- في PostgreSQL ولو غاب `rag_gaps`: متن `plpgsql` لا يُحلَّل عند الإنشاء،
-- بل عند أوّل نداء. فالدالّة موجودة في الإنتاج وتُخفق حين تُستدعى — وهذا
-- أسوأ من غيابها، لأن وجودها يُقرأ جاهزيّة.
--
-- ## العلاج — اشتقاقٌ لا تأكيد
--
-- هذا الترحيل **لا يكتب حالةً مفترَضة**. يقرأ المخطّط الفعليّ لحظةَ
-- التطبيق ويشتقّ `enabled` منه:
--
--   • الكائن غائب  ⇐ enabled = false، مع سببٍ منصوصٍ في `metadata`.
--   • الكائن حاضر  ⇐ enabled = true، ويُمحى سببُ التعطيل.
--
-- فهو صحيحٌ في البيئتين معًا، ويُصلح نفسه تلقائيًّا يوم تُطبَّق ترحيلات
-- `20260728*` — بلا ترحيلٍ ثالث ولا تدخّل يدويّ. وإعادةُ تشغيله لا تغيّر
-- شيئًا (idempotent).
--
-- ## وما لا يفعله عمدًا
--
-- **لا يُنشئ جدولًا.** إنشاء `rag_candidates` فارغًا هنا يجعل الأداة
-- «تنجح» وهي تكتب في فراغٍ لا يقرؤه أحد — نجاحٌ كاذب أسوأ من الإخفاق
-- الصريح. وطبقة RAG برمّتها (‏`20260728*`) برنامجٌ ببوابة قياسٍ لم تُفتح،
-- وفتحُها قرارُ مالكٍ لا أثرٌ جانبيّ لإصلاح P0.
-- ════════════════════════════════════════════════════════════════════════

do $$
declare
  -- الأداة ← الكائن الذي لا تعمل بدونه.
  deps constant jsonb := jsonb_build_object(
    'rag.propose_candidate', 'public.rag_candidates',
    'rag.record_gap',        'public.rag_gaps'
  );
  tool_id  text;
  dep_name text;
  present  boolean;
begin
  if to_regclass('public.tool_registry') is null then
    raise notice 'tool_registry غير موجود — لا شيء يُحرَس.';
    return;
  end if;

  for tool_id, dep_name in select * from jsonb_each_text(deps) loop
    present := to_regclass(dep_name) is not null;

    update public.tool_registry
       set enabled = present,
           metadata = case
             when present then (metadata - 'disabled_reason' - 'missing_dependency')
             else metadata
                  || jsonb_build_object(
                       'disabled_reason',
                       format('الكائن %s غير موجود في هذه القاعدة — الأداة تُخفق عند النداء.', dep_name),
                       'missing_dependency', dep_name,
                       'guarded_by', '20260920140000_rag_tool_schema_guard')
           end,
           updated_at = now()
     where id = tool_id
       -- يُحدَّث حين تختلف الحالة، **أو** حين يحمل صفٌّ حاضرُ التابع
       -- سببَ تعطيلٍ بائدًا: الترويسة تعِد بمحوه، والشرط الأوّل وحده
       -- كان يمنع المحو فيبقى سببٌ يناقض الحالة.
       and (enabled is distinct from present
            or (present and metadata ? 'disabled_reason'));

    if found then
      raise notice 'tool_registry: % ← enabled = % (تابعه %)', tool_id, present, dep_name;
    end if;
  end loop;
end $$;

-- ── شهادة: لا أداةٌ مفعَّلة بتابعٍ غائب ──────────────────────────────────
--
-- **الشهادة تُشتقّ من المخطّط لا من مفتاحٍ يكتبه الحارس نفسه.** الصيغة
-- الأولى كانت تعدّ الصفوف الحاملة `missing_dependency` وحدها — وهي
-- الصفوف التي وسمها الحارس قبل أسطر. فأداةٌ خارج خريطة `deps` تمرّ
-- خضراء مهما كان تابعها: دائرةٌ تشهد لنفسها.
--
-- فيُقرأ التابع من `metadata->>'writes'` (يكتبه ترحيل التسجيل
-- `20260801183309` لكل أداة RAG)، ومن الخريطة، ومن أيّهما وُجد.
do $$
declare
  bad text;
begin
  select string_agg(format('%s → %s', id, dep), ', ')
    into bad
    from (
      select tr.id,
             coalesce(
               tr.metadata->>'missing_dependency',
               case when tr.metadata->>'writes' is not null
                    then 'public.' || (tr.metadata->>'writes') end
             ) as dep
        from public.tool_registry tr
       where tr.enabled
    ) t
   where t.dep is not null
     and to_regclass(t.dep) is null;

  if bad is not null then
    raise exception 'أدواتٌ مفعَّلة بتوابع غائبة: %', bad;
  end if;
end $$;
