-- ============================================================================
-- نمو المتن المبذور لطبقة المعرفة — 21 ← 41 وثيقة (قرار المالك ٢٠٢٦/٠٨/٠٥)
--
-- العائق الذي يُزيله هذا الترحيل: بوابة `rag_enabled` تشترط قياسًا على ≥30
-- سؤالًا، والمرساة كانت 21 بندًا من بذرة `hcis_directives` — فالحدّ الأقصى
-- الممكن 21 < 30 والبوابة مغلقة **بنيويًا** لا تقصيرًا.
--
-- **لا تأليف.** الفارق لا يُسدّ بنصوص من عندنا؛ كل وثيقة هنا مُشتقّة
-- بـ`insert … select` من صفوفٍ **موجودة في القاعدة نفسها**:
--   • hcis_directives     (21) — التوجيهات الأمنية بأسمائها ونطاقاتها.
--   • hcis_approval_stages (7) — دورة الاعتماد السبع بوصف كل مرحلة.
--   • hcis_sectors        (13) — القطاعات الخاضعة للتنظيم.
-- المجموع 41 وثيقة حقيقية ⇒ مرساة تتجاوز عتبة الثلاثين بلا اختلاق حرفٍ واحد.
--
-- العزل أولًا: الجداول الثلاثة مراجع عامة بلا `org_id`، فالإدخال يضرب في
-- `organizations` — لكل مؤسسة نسختها الخاصة، وسياسات RLS القائمة تحكمها كما
-- هي. `is_simulation = true` لأن المصدر بذرة مرجعية لا سجلّ منشأة حيّ
-- (المادة ٨: كل ما ليس حيًّا يُوسم).
--
-- المتجهات تبقى NULL: هذا الترحيل يبذر **المتن** لا التضمين؛ مهمة الإدخال
-- (rag-ingest) تملؤها لاحقًا، والاسترجاع المعجمي (tsv/trgm) يعمل قبلها.
-- والصدق العددي محفوظ: لا رقم استدعاء ولا دقة استشهاد يُكتب هنا — البوابة
-- لا تُرفع بهذا الترحيل، إنما يُزال العائق البنيوي أمام قياسها.
--
-- idempotent — إعادة التشغيل لا تضاعف صفًّا (حارس `not exists` على المصدر).
-- ============================================================================

set local search_path = public, extensions;

-- ── 1) التوجيهات الأمنية ─────────────────────────────────────────────────
insert into public.rag_documents
  (org_id, doc_type, code, title, source, lang, content_sha256, is_simulation, metadata)
select
  o.id,
  case when d.code like 'SAF-%' then 'saf' else 'sec' end,
  d.code,
  d.name_ar,
  'بذرة hcis_directives — مرجع تنظيمي داخلي',
  'ar',
  encode(extensions.digest(src.content, 'sha256'), 'hex'),
  true,
  jsonb_build_object('origin', 'hcis_directives', 'sort_order', d.sort_order)
from public.organizations o
cross join public.hcis_directives d
cross join lateral (
  select concat_ws(
    E'\n',
    d.code || ' — ' || d.name_ar,
    nullif(d.category, ''),
    nullif(d.scope_ar, ''),
    nullif(d.issue_note_ar, '')
  ) as content
) src
where not exists (
  select 1 from public.rag_documents x
  where x.org_id = o.id
    and x.code = d.code
    and x.metadata->>'origin' = 'hcis_directives'
);

-- ── 2) دورة الاعتماد السبع ───────────────────────────────────────────────
insert into public.rag_documents
  (org_id, doc_type, code, title, source, lang, content_sha256, is_simulation, metadata)
select
  o.id,
  'general',
  'STAGE-' || lpad(s.stage_no::text, 2, '0'),
  'دورة الاعتماد — المرحلة ' || s.stage_no || ': ' || s.name_ar,
  'بذرة hcis_approval_stages — دورة الاعتماد المعتمدة',
  'ar',
  encode(extensions.digest(src.content, 'sha256'), 'hex'),
  true,
  jsonb_build_object('origin', 'hcis_approval_stages', 'stage_no', s.stage_no)
from public.organizations o
cross join public.hcis_approval_stages s
cross join lateral (
  select concat_ws(
    E'\n',
    'المرحلة ' || s.stage_no || ' من دورة الاعتماد: ' || s.name_ar,
    nullif(s.name_en, ''),
    nullif(s.description_ar, '')
  ) as content
) src
where not exists (
  select 1 from public.rag_documents x
  where x.org_id = o.id
    and x.code = 'STAGE-' || lpad(s.stage_no::text, 2, '0')
    and x.metadata->>'origin' = 'hcis_approval_stages'
);

-- ── 3) القطاعات الخاضعة للتنظيم ──────────────────────────────────────────
insert into public.rag_documents
  (org_id, doc_type, code, title, source, lang, content_sha256, is_simulation, metadata)
select
  o.id,
  'general',
  'SECTOR-' || lpad(c.id::text, 2, '0'),
  'قطاع خاضع للتنظيم: ' || c.name_ar,
  'بذرة hcis_sectors — نطاق التنظيم',
  'ar',
  encode(extensions.digest(src.content, 'sha256'), 'hex'),
  true,
  jsonb_build_object('origin', 'hcis_sectors', 'sector_id', c.id, 'is_primary', c.is_primary)
from public.organizations o
cross join public.hcis_sectors c
cross join lateral (
  select concat_ws(
    E'\n',
    'القطاع: ' || c.name_ar,
    nullif(c.name_en, ''),
    case when c.is_primary then 'قطاع أساسي ضمن نطاق التنظيم.' else 'قطاع ضمن نطاق التنظيم.' end
  ) as content
) src
where not exists (
  select 1 from public.rag_documents x
  where x.org_id = o.id
    and x.code = 'SECTOR-' || lpad(c.id::text, 2, '0')
    and x.metadata->>'origin' = 'hcis_sectors'
);

-- ── 4) المقاطع: مقطع واحد لكل وثيقة (نصوصها قصيرة مكتملة المعنى) ─────────
-- المتجه يبقى NULL ليملأه rag-ingest؛ `content_norm`/`tsv`/`content_hash`
-- أعمدة مولّدة تُحسب تلقائيًا فيعمل الاسترجاع المعجمي فورًا.
insert into public.rag_chunks
  (org_id, document_id, chunk_index, content, is_simulation)
select
  d.org_id,
  d.id,
  0,
  src.content,
  true
from public.rag_documents d
cross join lateral (
  select case d.metadata->>'origin'
    when 'hcis_directives' then (
      select concat_ws(E'\n', x.code || ' — ' || x.name_ar, nullif(x.category, ''),
                       nullif(x.scope_ar, ''), nullif(x.issue_note_ar, ''))
      from public.hcis_directives x where x.code = d.code)
    when 'hcis_approval_stages' then (
      select concat_ws(E'\n', 'المرحلة ' || s.stage_no || ' من دورة الاعتماد: ' || s.name_ar,
                       nullif(s.name_en, ''), nullif(s.description_ar, ''))
      from public.hcis_approval_stages s
      where s.stage_no = (d.metadata->>'stage_no')::int)
    when 'hcis_sectors' then (
      select concat_ws(E'\n', 'القطاع: ' || c.name_ar, nullif(c.name_en, ''),
                       case when c.is_primary then 'قطاع أساسي ضمن نطاق التنظيم.'
                            else 'قطاع ضمن نطاق التنظيم.' end)
      from public.hcis_sectors c where c.id = (d.metadata->>'sector_id')::int)
  end as content
) src
where d.metadata->>'origin' in ('hcis_directives', 'hcis_approval_stages', 'hcis_sectors')
  and src.content is not null
  and not exists (
    select 1 from public.rag_chunks k
    where k.document_id = d.id and k.chunk_index = 0
  );

-- ── 5) إثبات النمو — يفشل الترحيل إن لم تتجاوز المرساة العتبة ────────────
-- حارسٌ لا تعليق: لو تغيّرت البذرة يومًا فنقص المتن دون الثلاثين، يسقط
-- التطبيق بصوت عالٍ بدل أن يمرّ بوعدٍ لا يقابله متن.
do $$
declare
  anchor_count int;
begin
  select count(*) into anchor_count
  from public.rag_documents
  where metadata->>'origin' in ('hcis_directives', 'hcis_approval_stages', 'hcis_sectors')
    and org_id = (select id from public.organizations order by created_at limit 1);

  if (select count(*) from public.organizations) = 0 then
    raise notice 'لا مؤسسات بعد — المتن يُبذر مع أول مؤسسة.';
  elsif anchor_count < 30 then
    raise exception 'المتن المبذور % وثيقة < 30 — العائق البنيوي قائم.', anchor_count;
  else
    raise notice 'المتن المبذور % وثيقة ≥ 30 — العائق البنيوي أمام القياس أُزيل.', anchor_count;
  end if;
end $$;
