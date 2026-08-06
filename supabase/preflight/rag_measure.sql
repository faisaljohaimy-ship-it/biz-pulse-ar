-- ============================================================================
-- قياس استرجاع الرَّاق — الذراع المعجمية على Postgres حقيقي.
--
-- ## لماذا لا قائمة مجسّات في هذا الملف
--
-- المجسّ هو **عنوان الصف نفسه** كما بُذر في `rag_documents.title`، والجواب
-- الصحيح هو `rag_documents.code` للصف ذاته. فلا قائمة ثانية تُكتب هنا ولا
-- سؤال يُؤلَّف — ولا تفترق عن مرساة TypeScript لأنها لا تُنسخ أصلًا.
-- (هذا نفس الدرس المتكرّر في هذه الجلسة: نسختان من الحقيقة تفترقان بصمت.)
--
-- ## ما يُقاس هنا
--
-- `rag_hybrid_search(probe, null, 8)` — والمتّجه `null` عمدًا، فيسقط فرع
-- المتّجهات ويبقى النصّ الكامل والثلاثيّات عبر RRF. أي: **الذراع المعجمية
-- وحدها**، وهي وحدها ما يمكن قياسه بلا مزوّد تضمين.
--
-- المقاييس: hit@1 · hit@5 · MRR · التغطية — رتبيّة خالصة، تناسب الاستشهاد.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off

-- السقالة نفسها التي تستعملها فحوص ما قبل التطبيق — تُقرأ من ملفها لا
-- تُنسخ هنا: نسختان من سقالةٍ واحدة تفترقان، وهذا الدرس تكرّر اليوم مرارًا.
\i :scaffold_file

-- مؤسسة واحدة: نموّ المتن يبذر لكل مؤسسة، فبلا صفٍّ هنا لا يُبذر شيء
-- ويعود القياس صفرًا (وهو ما وقع أول تشغيل).
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'مؤسسة القياس', 'measure')
on conflict do nothing;

-- pgvector متاح على هذا العنقود، فتُنشأ الامتدادة ويُبنى جدول المقاطع
-- بعموده المتّجهي كما هو في الإنتاج — لا نسخة مبتورة منه.
create extension if not exists vector with schema extensions;

-- التوجيهات الحقيقية من البذرة — تُقرأ من ملف الترحيل لا تُكتب هنا.
\i :hcis_seed_file

\i :normalize_file
\i :documents_file
\i :chunks_file
\i :search_file
\i :growth_file

-- ── القياس ────────────────────────────────────────────────────────────────
-- **ذراعان، لأن ذراعًا واحدة تكذب.**
--
-- (أ) العنوان: المجسّ هو عنوان الوثيقة نفسه. هذا استرجاعٌ شبه تطابقي —
--     نتيجته المثالية لا تعني «الاسترجاع جيّد»، بل «البحث بالعنوان يعمل».
--     تُبقى كخطّ سلامة: سقوطها يعني عطلًا في الفهرسة أو التطبيع.
-- (ب) المتن: المجسّ هو `scope_ar` للتوجيه — حقلٌ **آخر** من الصف نفسه،
--     منسوخ حرفيًّا من البذرة لا مؤلَّفًا. هذه هي الذراع المُخبِرة: تسأل
--     «هل يُستدعى التوجيه من وصف نطاقه؟» وهو ما يشبه سؤال المستخدم.
with title_probes as (
  select d.code as expect_code, d.title as probe
  from public.rag_documents d
  where d.code is not null
),
body_probes as (
  select h.code as expect_code, h.scope_ar as probe
  from public.hcis_directives h
  where coalesce(h.scope_ar, '') <> ''
),
title_rank as (
  select p.expect_code,
         min(case when r.doc_code = p.expect_code then r.rn end) as hit_rank
  from title_probes p
  cross join lateral (
    select doc_code, row_number() over (order by rrf_score desc) as rn
    from public.rag_hybrid_search(p.probe, null, 8)
  ) r
  group by p.expect_code
),
body_rank as (
  select p.expect_code,
         min(case when r.doc_code = p.expect_code then r.rn end) as hit_rank
  from body_probes p
  cross join lateral (
    select doc_code, row_number() over (order by rrf_score desc) as rn
    from public.rag_hybrid_search(p.probe, null, 8)
  ) r
  group by p.expect_code
),
score as (
  select 'title' as arm, * from title_rank
  union all
  select 'body'  as arm, * from body_rank
)
select json_build_object(
  'measures', 'lexical arm only (fts+trgm via RRF). الذراع المتّجهية غير مقيسة: تحتاج مزوّد تضمين.',
  'interpretation',
    'رقمٌ مثاليّ هنا لا يعني «الاسترجاع ممتاز». المجسّات مشتقّة حرفيًّا من '
    || 'الصفوف المبذورة نفسها (تأليف الأسئلة ممنوع)، ونموّ المتن يُدرج '
    || 'scope_ar داخل متن الوثيقة — فكل مجسّ نصٌّ فرعيّ من هدفه. ما يثبته '
    || 'هذا القياس: الفهرسة والتطبيع العربي وترتيب RRF تعمل من طرف إلى طرف '
    || 'على Postgres حقيقي. وما لا يثبته: جودة الاسترجاع على أسئلة مستخدم '
    || 'حقيقية. لذلك لا يُقارن بعتبتَي الدستور (0.85 استدعاء@5 · 0.95 دقة '
    || 'استشهاد) ولا يفتح rag_enabled.',
  'source', 'local ephemeral Postgres; production untouched; no authored questions',
  'arms', (
    select json_agg(x order by x->>'arm')
    from (
      select json_build_object(
        'arm', arm,
        'probes', count(*),
        'hit_at_1', count(*) filter (where hit_rank = 1),
        'hit_at_5', count(*) filter (where hit_rank <= 5),
        'missed', count(*) filter (where hit_rank is null),
        'recall_at_5', round(count(*) filter (where hit_rank <= 5)::numeric
                             / nullif(count(*), 0), 4),
        'mrr', round(coalesce(sum(1.0 / hit_rank), 0) / nullif(count(*), 0), 4),
        'misses', coalesce((select json_agg(s2.expect_code order by s2.expect_code)
                            from score s2 where s2.arm = s.arm and s2.hit_rank is null), '[]'::json)
      ) as x
      from score s group by arm
    ) t
  )
)::text;
