-- ============================================================================
-- O4 — فحص ما قبل التطبيق لدوالّ المطابقة `sadeed_match_*` (ليس ترحيلًا؛ لا يُشحن)
--
-- يُشغَّل على Postgres مؤقّت بـpgvector حقيقي عبر `scripts/sadeed-match-preflight.sh`
-- (`npm run check:sadeed-match`) الذي يشغّله أيضًا على نسخٍ **مكسورة عمدًا** من
-- الترحيل ويشترط أن تفشل كلها (المادة ٣٠: حارسٌ لا يُثبَت أحمر لا يُعدّ حارسًا).
--
-- ## ما يُثبَت هنا (كله تحت `set local role authenticated|anon|service_role`
--    لا بصلاحية superuser — الفحص بصلاحية superuser يمرّ دائمًا ولا يُثبت شيئًا)
--
--  A. الفهرس الفريد: upsert الاستيعاب **يفشل** قبل الترحيل (42P10) ويعمل بعده؛
--     التكرار مرفوض والمتمايز مقبول؛ حارس التكرار يوقف الترحيل برسالته
--     (السيناريو dup_abort) ولا يترك أثرًا.
--  B. المستندات: عضو المؤسسة أ يقرأ مقاطعه الجاهزة ذات المتّجه فقط — صفر من
--     مؤسسة ب، صفر من مستخدم آخر داخل المؤسسة نفسها، صفر من مستند غير جاهز،
--     وصفر من صفّ بلا متّجه؛ وعضو المؤسستين لا تُخلَط له المؤسستان.
--  C. المعرفة: نطاق مؤسسة، `_tags` NULL والفارغة بلا تصفية، والمتقاطعة تصفّي،
--     ومؤسسة NULL ⇐ صفر لمستخدم عضو في مؤسستين (C13) ولـservice_role (E7).
--  D. الذاكرة: شخصية داخل مؤسسة، و`_scope`، ومؤسسة NULL ⇐ صفر (D8).
--  E. الامتيازات: anon يُرفض بالدالّة نفسها (لا بالمخطط)، authenticated وservice_role
--     ينفّذان (ويُشغَّل الملف مرتين: بامتيازات Supabase الافتراضية، وبلا امتيازات
--     افتراضية `full_bare` فيُثبت أن GRANT الصريح هو المانح)، لا PUBLIC؛ ومن لا `auth.uid()` له يقرأ صفرًا من المستندات والذاكرة.
--  F. شكل الدوالّ: INVOKER · STABLE · search_path · الامتيازات.
--  H. الترتيب وقيمة التشابه والسقف، **للدوالّ الثلاث كلٌّ على حدة** (مؤسسة ج:
--     55 صفًّا لكل دالّة بتشابه متناقص ومتمايز): الأقرب أولًا (لا الأبعد)،
--     التشابه = 1 − المسافة لا المسافة نفسها، `_limit` الكبيرة تُقصّ عند 50،
--     والسالبة تعطي صفرًا لا خطأً، وNULL تعطي الافتراضي (المعرفة والذاكرة 6).
--     (المستندات سبقتها B4 وB5 وB6؛ وH تكرّرها على متنٍ أكبر لتشمل السقف.)
--  G. إضافة فقط: `aria_match_*` لم تُمسّ (بصمة الجسم)، فهرس واحد أُضيف ولا GIN،
--     التشغيل المتكرّر لا يغيّر شيئًا، والتراجع يُسقط ما أنشأه وحده ويعاد تطبيق
--     الأصل بعده.
--  وفوقها مصفوفة: كل (مستخدم × مؤسسة × دالّة) يُعدّ فيها الصفوف العابرة للمؤسسة
--  والعابرة للمستخدم — والمطلوب صفر مع عدد صفوف مُرجَعة موجب (الصفر على متنٍ
--  فارغ لا يُثبت عزلًا: CLAUDE.md «قاعدة الفراغ»).
--
-- ## الـRLS هنا أوسع من الإنتاج عمدًا
--
-- سياسة SELECT المسموحة `using (true)` + سياسة `tenant_isolation` المقيِّدة
-- (`is_org_member`) فقط. فحدّ المستخدم داخل المؤسسة (المستندات/الذاكرة) **لا
-- يأتي من RLS هنا** بل من مسند الدالّة وحده — فإن سقط المسند سقط الفحص. الإنتاج
-- أضيق (`auth.uid() = user_id`) فلا يضعف الفحص ما يقيسه.
--
-- ## ما لا يُثبَت هنا (حدود صريحة)
--
--  · سياسات RLS الإنتاج الفعلية على `finn_*` (وُضعت خارج المستودع، المادة
--    «مصدر الحقيقة» في CLAUDE.md): تُقاس على الإنتاج نفسه بعد الإذن.
--  · أداء الفهارس على حجم حقيقي؛ و`pgvector` هنا نسخة الحزمة المحلّية لا نسخة
--    الإنتاج.
--  · جداول `finn_*` هنا **مجموعة جزئية من أعمدة الإنتاج** (الأعمدة التي تقرؤها
--    الدوالّ + مفاتيحها) لأن إنشاءها الأصلي خارج المستودع (تسمية Lovable).
--
-- التشغيل المنفرد:
--   psql -v ON_ERROR_STOP=1 -v scenario=full \
--     -v scaffold_file=supabase/preflight/_scaffold.sql \
--     -v migration_file=supabase/migrations/20261030120000_sadeed_match_functions.sql \
--     -v rollback_file=supabase/migrations/20261030120001_sadeed_match_functions_rollback.sql \
--     -f supabase/preflight/sadeed_match_check.sql
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off

\if :{?scenario}
\else
  \set scenario full
\endif

-- pgvector غير متاح ⇐ تخطٍّ **معلَن** لا نجاح مزيّف: لا يُثبَت شيء، ويقول الملف ذلك.
select exists (select 1 from pg_available_extensions where name = 'vector') as has_vector \gset
select (:'scenario' = 'dup_abort') as is_dup \gset
-- full_bare: بلا امتيازات Supabase الافتراضية على الدوالّ — يُثبت أن GRANT الصريح في الترحيل هو الذي يمنح التنفيذ.
select (:'scenario' <> 'full_bare') as defaults_on \gset

\if :has_vector

\o /dev/null
\i :scaffold_file

create extension if not exists vector with schema extensions;
set search_path = public, extensions;

begin;

-- ── مرآة امتيازات المنصّة (Supabase) ────────────────────────────────────────
-- anon/authenticated/service_role لهم USAGE على auth وpublic وextensions؛ بدون
-- USAGE على public يفشل anon بالمخطط لا بالدالّة فيمرّ فحص الرفض لسببٍ خاطئ.
-- service_role يتجاوز RLS (BYPASSRLS) كما في المنصّة.
grant usage on schema auth, public, extensions to anon, authenticated, service_role;
alter role service_role bypassrls;
-- الامتياز الافتراضي لمالك المخطط على الدوالّ الجديدة في Supabase: EXECUTE لـanon
-- وauthenticated وservice_role. هو سبب أن `REVOKE ... FROM PUBLIC` وحده لا يكفي.
-- (السيناريو full_bare يحذفه: عندها لا يصل authenticated وservice_role إلا الـGRANT
-- الصريح في الترحيل، فيسقط الفحص لو حُذف.)
\if :defaults_on
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
\endif

-- ── جداول finn_* (مجموعة جزئية من أعمدة الإنتاج) ────────────────────────────
create table public.finn_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.finn_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.finn_documents(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(768),
  embedding_v2 vector(1536),
  model_version text,
  created_at timestamptz not null default now()
);
-- الفهرس غير الفريد القائم على الإنتاج (المقيس ٢٠٢٦/١٠/٣٠): الترحيل يضيف الفريد ولا يحذفه.
create index aria_document_chunks_doc_idx on public.finn_document_chunks (document_id, chunk_index);

create table public.finn_knowledge (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source text not null,
  content text not null,
  tags text[] not null default '{}',
  embedding vector(768),
  embedding_v2 vector(1536),
  model_version text,
  created_at timestamptz not null default now()
);

create table public.finn_memory (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  scope text not null default 'user',
  key text not null,
  content text not null,
  importance numeric not null default 0.5,
  embedding vector(768),
  embedding_v2 vector(1536),
  model_version text,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS: قراءة مسموحة + عزل مؤسسة مقيِّد فقط (أوسع من الإنتاج عمدًا — انظر الترويسة).
do $rls$
declare t text;
begin
  foreach t in array array['finn_documents', 'finn_document_chunks', 'finn_knowledge', 'finn_memory'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read_any', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using (public.is_org_member(org_id, ''viewer'')) '
      'with check (public.is_org_member(org_id, ''operator''))',
      'tenant_isolation_' || t, t);
  end loop;
end
$rls$;

-- ── أدوات الفحص (سقالة لا منتج) ─────────────────────────────────────────────
create table public.zz_ids (label text primary key, id uuid not null);
create table public.zz_log (n serial primary key, label text not null);
grant select on public.zz_ids to public;

create function public.zz_id(l text) returns uuid language sql stable as
  $$ select id from public.zz_ids where label = l $$;

create function public.zz_ids_of(labels text[]) returns uuid[] language plpgsql stable as $$
declare out uuid[]; missing text[];
begin
  select coalesce(array_agg(id order by id), '{}') into out from public.zz_ids where label = any(labels);
  select array_agg(l) into missing from unnest(labels) l where not exists (select 1 from public.zz_ids z where z.label = l);
  if missing is not null then raise exception 'zz_ids_of: unknown label(s) %', missing; end if;
  return out;
end $$;

create function public.zz_vec(i int, j int default null) returns extensions.vector
language plpgsql immutable as $$
declare a float8[] := array_fill(0::float8, array[768]);
begin
  a[i] := 1;
  if j is not null then a[j] := 0.5; end if;
  return ('[' || array_to_string(a, ',') || ']')::extensions.vector(768);
end $$;

create function public.zz_check(label text, ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if ok is not true then raise exception 'FAIL: %', label; end if;
  insert into public.zz_log (label) values (label);
  raise notice 'PASS: %', label;
end $$;

create function public.zz_eq(label text, got uuid[], want uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if got is distinct from want then
    raise exception 'FAIL: % | got=% want=%', label, got, want;
  end if;
  insert into public.zz_log (label) values (label);
  raise notice 'PASS: % (%)', label, coalesce(cardinality(want), 0);
end $$;

-- المؤسسة/المستخدم الحقيقيان لصفٍّ ما (يقرأ بلا RLS) — لعدّ العابر للمؤسسة والمستخدم.
create function public.zz_org_of(rid uuid) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select org_id from public.finn_document_chunks where id = rid),
    (select org_id from public.finn_knowledge where id = rid),
    (select org_id from public.finn_memory where id = rid));
$$;
create function public.zz_user_of(rid uuid) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select user_id from public.finn_document_chunks where id = rid),
    (select user_id from public.finn_memory where id = rid));
$$;

-- ── منظومة المؤسستين والمستخدمين ────────────────────────────────────────────
-- أ: uA1 وuA2؛ ب: uB1؛ uAB عضو في المؤسستين (الحالة التي لا تعرفها RLS: أيهما يقصد)؛
-- uNone بلا عضوية.
insert into public.organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Org A', 'org-a'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Org B', 'org-b');
insert into public.zz_ids (label, id) values
  ('orgA', '00000000-0000-0000-0000-00000000aaaa'),
  ('orgB', '00000000-0000-0000-0000-00000000bbbb'),
  ('uA1', '11111111-1111-4111-8111-111111111111'),
  ('uA2', '22222222-2222-4222-8222-222222222222'),
  ('uB1', '33333333-3333-4333-8333-333333333333'),
  ('uAB', '44444444-4444-4444-8444-444444444444'),
  ('uNone', '55555555-5555-4555-8555-555555555555');
insert into public.org_members (org_id, user_id, role) values
  (public.zz_id('orgA'), public.zz_id('uA1'), 'viewer'),
  (public.zz_id('orgA'), public.zz_id('uA2'), 'viewer'),
  (public.zz_id('orgB'), public.zz_id('uB1'), 'viewer'),
  (public.zz_id('orgA'), public.zz_id('uAB'), 'viewer'),
  (public.zz_id('orgB'), public.zz_id('uAB'), 'viewer');

\if :is_dup

-- ════════════════════════════════════════════════════════════════════════════
-- سيناريو dup_abort — تكرار في (document_id, chunk_index) ⇐ الترحيل يتوقف برسالته
-- ولا يترك دالّةً ولا فهرسًا (يُشغَّل داخل معاملة كما يطبّقه المنفّذ).
-- ════════════════════════════════════════════════════════════════════════════
insert into public.finn_documents (id, org_id, user_id, title, status) values
  ('aaaaaaaa-0000-4000-8000-000000000001', public.zz_id('orgA'), public.zz_id('uA1'), 'dup', 'ready');
insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content, embedding) values
  ('aaaaaaaa-0000-4000-8000-000000000001', public.zz_id('orgA'), public.zz_id('uA1'), 0, 'x', public.zz_vec(1)),
  ('aaaaaaaa-0000-4000-8000-000000000001', public.zz_id('orgA'), public.zz_id('uA1'), 0, 'x-dup', public.zz_vec(1));
commit;

\set ON_ERROR_STOP off
begin;
\i :migration_file
rollback;
\set ON_ERROR_STOP on

do $$
begin
  if to_regprocedure('public.sadeed_match_documents(uuid,vector,integer)') is not null
     or to_regprocedure('public.sadeed_match_knowledge(uuid,vector,text[],integer)') is not null
     or to_regprocedure('public.sadeed_match_memory(uuid,vector,text,integer)') is not null then
    raise exception 'FAIL: dup_abort left a function behind';
  end if;
  if to_regclass('public.finn_document_chunks_doc_chunk_uq') is not null then
    raise exception 'FAIL: dup_abort left the unique index behind';
  end if;
  raise notice 'PASS: dup_abort (guard message expected on stderr above; nothing created)';
end $$;
\echo SADEED_MATCH_CHECK: DUP_ABORT_OK

\else

-- ════════════════════════════════════════════════════════════════════════════
-- سيناريو full
-- ════════════════════════════════════════════════════════════════════════════

-- مساعدات الإدراج (superuser فقط) ثم المتن
create function public.zz_doc(lbl text, org text, usr text, st text) returns uuid language plpgsql as $$
declare d uuid;
begin
  insert into public.finn_documents (org_id, user_id, title, status)
  values (public.zz_id(org), public.zz_id(usr), 'doc ' || lbl, st) returning id into d;
  insert into public.zz_ids (label, id) values ('d_' || lbl, d);
  return d;
end $$;

create function public.zz_chunk(lbl text, doc text, org text, usr text, idx int, emb extensions.vector) returns void
language plpgsql as $$
declare c uuid;
begin
  insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content, embedding)
  values (public.zz_id('d_' || doc), public.zz_id(org), public.zz_id(usr), idx, 'chunk ' || lbl, emb)
  returning id into c;
  insert into public.zz_ids (label, id) values ('c_' || lbl, c);
end $$;

create function public.zz_know(lbl text, org text, tgs text[], emb extensions.vector) returns void
language plpgsql as $$
declare k uuid;
begin
  insert into public.finn_knowledge (org_id, title, source, content, tags, embedding)
  values (public.zz_id(org), 'k ' || lbl, 'src-' || lbl, 'knowledge ' || lbl, tgs, emb) returning id into k;
  insert into public.zz_ids (label, id) values ('k_' || lbl, k);
end $$;

create function public.zz_memo(lbl text, org text, usr text, sc text, emb extensions.vector) returns void
language plpgsql as $$
declare m uuid;
begin
  insert into public.finn_memory (org_id, user_id, scope, key, content, embedding)
  values (public.zz_id(org), public.zz_id(usr), sc, 'key ' || lbl, 'memory ' || lbl, emb) returning id into m;
  insert into public.zz_ids (label, id) values ('m_' || lbl, m);
end $$;

-- المستندات (v(1) = مطابق للاستعلام، التشابه 1؛ v(1,2) و v(1,3) ≈ 0.894؛ v(2) متعامد = 0)
select public.zz_doc('A1', 'orgA', 'uA1', 'ready');
select public.zz_chunk('dA1_0', 'A1', 'orgA', 'uA1', 0, public.zz_vec(1));
select public.zz_chunk('dA1_1', 'A1', 'orgA', 'uA1', 1, public.zz_vec(1, 2));
select public.zz_chunk('dA1_2', 'A1', 'orgA', 'uA1', 2, null);                    -- بلا متّجه
select public.zz_doc('A1p', 'orgA', 'uA1', 'processing');
select public.zz_chunk('dA1p_0', 'A1p', 'orgA', 'uA1', 0, public.zz_vec(1));      -- مستند غير جاهز
select public.zz_doc('A2', 'orgA', 'uA2', 'ready');
select public.zz_chunk('dA2_0', 'A2', 'orgA', 'uA2', 0, public.zz_vec(1));
select public.zz_chunk('dA2_1', 'A2', 'orgA', 'uA2', 1, public.zz_vec(1, 3));
select public.zz_doc('B1', 'orgB', 'uB1', 'ready');
select public.zz_chunk('dB1_0', 'B1', 'orgB', 'uB1', 0, public.zz_vec(1));
select public.zz_chunk('dB1_1', 'B1', 'orgB', 'uB1', 1, public.zz_vec(1, 2));
select public.zz_doc('ABa', 'orgA', 'uAB', 'ready');
select public.zz_chunk('dABa_0', 'ABa', 'orgA', 'uAB', 0, public.zz_vec(1));
select public.zz_chunk('dABa_1', 'ABa', 'orgA', 'uAB', 1, public.zz_vec(2));
select public.zz_doc('ABb', 'orgB', 'uAB', 'ready');
select public.zz_chunk('dABb_0', 'ABb', 'orgB', 'uAB', 0, public.zz_vec(1));
select public.zz_chunk('dABb_1', 'ABb', 'orgB', 'uAB', 1, public.zz_vec(2));
-- بيانات غير متّسقة: مالك المقطع غير مالك مستنده (دفاعٌ بالعمق — كل طرفٍ يُحرس وحده)
select public.zz_doc('Mix1', 'orgA', 'uA2', 'ready');                              -- المستند لـuA2
select public.zz_chunk('dMix1_0', 'Mix1', 'orgA', 'uA1', 0, public.zz_vec(1));     -- والمقطع لـuA1
select public.zz_doc('Mix2', 'orgA', 'uA1', 'ready');                              -- المستند لـuA1
select public.zz_chunk('dMix2_0', 'Mix2', 'orgA', 'uA2', 0, public.zz_vec(1));     -- والمقطع لـuA2

-- المعرفة
select public.zz_know('A1', 'orgA', '{safety}', public.zz_vec(1));
select public.zz_know('A2', 'orgA', '{ptw}', public.zz_vec(1, 2));
select public.zz_know('A3', 'orgA', '{}', public.zz_vec(2));
select public.zz_know('Anull', 'orgA', '{safety}', null);                           -- بلا متّجه
select public.zz_know('B1', 'orgB', '{safety}', public.zz_vec(1));

-- الذاكرة
select public.zz_memo('A1a', 'orgA', 'uA1', 'user', public.zz_vec(1));
select public.zz_memo('A1b', 'orgA', 'uA1', 'preference', public.zz_vec(1, 2));
select public.zz_memo('A1n', 'orgA', 'uA1', 'user', null);                           -- بلا متّجه
select public.zz_memo('A2', 'orgA', 'uA2', 'user', public.zz_vec(1));
select public.zz_memo('B1', 'orgB', 'uB1', 'user', public.zz_vec(1));
select public.zz_memo('ABa', 'orgA', 'uAB', 'user', public.zz_vec(1));
select public.zz_memo('ABb', 'orgB', 'uAB', 'user', public.zz_vec(1));

-- ── مؤسسة ج: متنٌ للترتيب والتشابه والسقف (القسم H) ─────────────────────────
-- 55 صفًّا لكل دالّة (> سقف 50)، متّجه الصفّ i هو (1، 0.1·i) فتشابهه مع
-- الاستعلام zz_vec(1) هو 1/√(1+0.01·i²): تناقص صارم، متمايز، يعرف الترتيب
-- الصحيح بلا غموض. مؤسسة ومستخدم منفصلان فلا يتأثر أي فحص أو مصفوفة أخرى.
create function public.zz_vec_dec(i int) returns extensions.vector
language plpgsql immutable as $$
declare a float8[] := array_fill(0::float8, array[768]);
begin
  a[1] := 1; a[2] := i * 0.1;
  return ('[' || array_to_string(a, ',') || ']')::extensions.vector(768);
end $$;

insert into public.organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000cccc', 'Org C', 'org-c');
insert into public.zz_ids (label, id) values
  ('orgC', '00000000-0000-0000-0000-00000000cccc'),
  ('uR', '66666666-6666-4666-8666-666666666666');
insert into public.org_members (org_id, user_id, role) values
  (public.zz_id('orgC'), public.zz_id('uR'), 'viewer');
select public.zz_doc('cap', 'orgC', 'uR', 'ready');
insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content, embedding)
  select public.zz_id('d_cap'), public.zz_id('orgC'), public.zz_id('uR'), g,
         'cap ' || lpad(g::text, 2, '0'), public.zz_vec_dec(g)
  from generate_series(0, 54) g;
insert into public.finn_knowledge (org_id, title, source, content, tags, embedding)
  select public.zz_id('orgC'), 'k cap ' || lpad(g::text, 2, '0'), 'src-cap',
         'cap ' || lpad(g::text, 2, '0'), '{}', public.zz_vec_dec(g)
  from generate_series(0, 54) g;
insert into public.finn_memory (org_id, user_id, scope, key, content, embedding)
  select public.zz_id('orgC'), public.zz_id('uR'), 'user', 'key cap ' || lpad(g::text, 2, '0'),
         'cap ' || lpad(g::text, 2, '0'), public.zz_vec_dec(g)
  from generate_series(0, 54) g;

-- ── بصمات «قبل»: aria_match_* لا تُمسّ، والفهارس القائمة ─────────────────────
-- نسخٌ بسيطة تمثّل الدوالّ القائمة (جسمها لا يهمّ: يُفحص أنه لا يتغيّر).
create function public.aria_match_documents(_user_id uuid, _query vector(768), _limit int default 8)
  returns table (chunk_id uuid, document_id uuid, title text, content text, similarity numeric)
  language sql stable set search_path = public, extensions as $$
  select c.id, c.document_id, d.title, c.content, (1 - (c.embedding <=> _query))::numeric
  from public.finn_document_chunks c join public.finn_documents d on d.id = c.document_id
  where c.user_id = _user_id and c.embedding is not null order by c.embedding <=> _query limit _limit $$;
create function public.aria_match_knowledge(_query vector(768), _tags text[] default null, _limit int default 6)
  returns table (id uuid, title text, source text, content text, tags text[], similarity numeric)
  language sql stable set search_path = public as $$
  select null::uuid, null::text, null::text, null::text, null::text[], null::numeric where false $$;
create function public.aria_match_memory(_user_id uuid, _query vector(768), _scope text default null, _limit int default 6)
  returns table (id uuid, scope text, key text, content text, importance numeric, similarity numeric)
  language sql stable set search_path = public as $$
  select null::uuid, null::text, null::text, null::text, null::numeric, null::numeric where false $$;

create table public.zz_before as
  select 'aria:' || p.proname as k, md5(pg_get_functiondef(p.oid)) as v
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'aria\_match\_%'
  union all
  select 'idx:' || indexname, indexdef from pg_indexes
  where schemaname = 'public' and tablename in ('finn_documents', 'finn_document_chunks', 'finn_knowledge', 'finn_memory');
grant select on public.zz_before to public;

commit;

begin;

-- ── A1. قبل الترحيل: upsert الاستيعاب يفشل (لا قيد فريد) — هذا سبب وجود الفهرس ──
do $$
declare st text;
begin
  begin
    insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content)
    values (public.zz_id('d_A1'), public.zz_id('orgA'), public.zz_id('uA1'), 0, 'upsert probe')
    on conflict (document_id, chunk_index) do nothing;
    st := 'no_error';
  exception when others then st := sqlstate;
  end;
  perform public.zz_check('A1. قبل الترحيل: upsert(document_id,chunk_index) يفشل 42P10 (لا فهرس فريد)', st = '42P10');
  perform public.zz_check('A1b. قبل الترحيل: لا دوالّ sadeed_match_*',
    (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'sadeed\_match\_%') = 0);
end $$;

-- ── تطبيق الترحيل الحقيقي ───────────────────────────────────────────────────
\i :migration_file

-- أدوات الاستدعاء (بعد وجود الدوالّ؛ INVOKER فتعمل بصلاحية المستدعي)
create function public.zz_docs(_org uuid, _limit int default 50) returns uuid[] language sql stable as $$
  select coalesce(array_agg(chunk_id order by chunk_id), '{}')
  from public.sadeed_match_documents(_org, public.zz_vec(1), _limit) $$;
create function public.zz_know_ids(_org uuid, _tags text[] default null) returns uuid[] language sql stable as $$
  select coalesce(array_agg(id order by id), '{}')
  from public.sadeed_match_knowledge(_org, public.zz_vec(1), _tags, 50) $$;
create function public.zz_mem_ids(_org uuid, _scope text default null) returns uuid[] language sql stable as $$
  select coalesce(array_agg(id order by id), '{}')
  from public.sadeed_match_memory(_org, public.zz_vec(1), _scope, 50) $$;
create function public.zz_docs_sims(_org uuid, _limit int default 50) returns numeric[] language sql stable as $$
  select coalesce(array_agg(similarity), '{}') from public.sadeed_match_documents(_org, public.zz_vec(1), _limit) $$;
create function public.zz_docs_first(_org uuid) returns uuid language sql stable as $$
  select chunk_id from public.sadeed_match_documents(_org, public.zz_vec(1), 1) $$;
-- أدوات القسم H: عدد الصفوف (‎-1‎ إن رمت الدالّة)، المحتوى بترتيب الإرجاع، والتشابه بترتيبه.
-- `with ordinality` يثبّت ترتيب الإرجاع نفسه (لا ترتيب array_agg غير المضمون).
create function public.zz_n(_fn text, _org uuid, _lim int) returns int language plpgsql stable as $$
declare n int;
begin
  if _fn = 'documents' then
    select count(*) into n from public.sadeed_match_documents(_org, public.zz_vec(1), _lim);
  elsif _fn = 'knowledge' then
    select count(*) into n from public.sadeed_match_knowledge(_org, public.zz_vec(1), null, _lim);
  else
    select count(*) into n from public.sadeed_match_memory(_org, public.zz_vec(1), null, _lim);
  end if;
  return n;
exception when others then
  return -1;
end $$;
create function public.zz_ord(_fn text, _org uuid, _lim int) returns text[] language plpgsql stable as $$
declare r text[];
begin
  if _fn = 'documents' then
    select coalesce(array_agg(t.content order by t.ord), '{}') into r
    from public.sadeed_match_documents(_org, public.zz_vec(1), _lim) with ordinality
         as t(chunk_id, document_id, title, content, similarity, ord);
  elsif _fn = 'knowledge' then
    select coalesce(array_agg(t.content order by t.ord), '{}') into r
    from public.sadeed_match_knowledge(_org, public.zz_vec(1), null, _lim) with ordinality
         as t(id, title, source, content, tags, similarity, ord);
  else
    select coalesce(array_agg(t.content order by t.ord), '{}') into r
    from public.sadeed_match_memory(_org, public.zz_vec(1), null, _lim) with ordinality
         as t(id, scope, key, content, importance, similarity, ord);
  end if;
  return r;
end $$;
create function public.zz_sim(_fn text, _org uuid, _lim int) returns numeric[] language plpgsql stable as $$
declare r numeric[];
begin
  if _fn = 'documents' then
    select coalesce(array_agg(round(t.similarity, 4) order by t.ord), '{}') into r
    from public.sadeed_match_documents(_org, public.zz_vec(1), _lim) with ordinality
         as t(chunk_id, document_id, title, content, similarity, ord);
  elsif _fn = 'knowledge' then
    select coalesce(array_agg(round(t.similarity, 4) order by t.ord), '{}') into r
    from public.sadeed_match_knowledge(_org, public.zz_vec(1), null, _lim) with ordinality
         as t(id, title, source, content, tags, similarity, ord);
  else
    select coalesce(array_agg(round(t.similarity, 4) order by t.ord), '{}') into r
    from public.sadeed_match_memory(_org, public.zz_vec(1), null, _lim) with ordinality
         as t(id, scope, key, content, importance, similarity, ord);
  end if;
  return r;
end $$;
create function public.zz_as(u uuid) returns void language sql as
  $$ select set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u)::text end, true) $$;
grant execute on function public.zz_docs(uuid, int), public.zz_know_ids(uuid, text[]),
  public.zz_mem_ids(uuid, text), public.zz_docs_sims(uuid, int), public.zz_docs_first(uuid),
  public.zz_n(text, uuid, int), public.zz_ord(text, uuid, int), public.zz_sim(text, uuid, int),
  public.zz_as(uuid) to public;

-- ── A2/A3. بعد الترحيل: الفهرس الفريد ───────────────────────────────────────
do $$
declare st text; n_before bigint; n_after bigint;
begin
  perform public.zz_check('A2. الفهرس الفريد finn_document_chunks_doc_chunk_uq قائم وفريد على (document_id, chunk_index)',
    exists (
      select 1 from pg_index i
      join pg_class c on c.oid = i.indexrelid
      where c.relname = 'finn_document_chunks_doc_chunk_uq' and i.indisunique
        and (select array_agg(a.attname::text order by k.ord)
             from unnest(i.indkey::int2[]) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum) = array['document_id', 'chunk_index']));

  begin
    insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content)
    values (public.zz_id('d_A1'), public.zz_id('orgA'), public.zz_id('uA1'), 0, 'dup probe');
    st := 'no_error';
  exception when unique_violation then st := 'unique_violation';
  end;
  perform public.zz_check('A3. زوج (document_id, chunk_index) مكرّر مرفوض unique_violation', st = 'unique_violation');

  insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content)
  values (public.zz_id('d_A1'), public.zz_id('orgA'), public.zz_id('uA1'), 9, 'distinct index'),
         (public.zz_id('d_A2'), public.zz_id('orgA'), public.zz_id('uA2'), 9, 'distinct doc same index');
  perform public.zz_check('A4. زوجان متمايزان (فهرس مختلف، أو مستند مختلف بالفهرس نفسه) مقبولان', true);

  select count(*) into n_before from public.finn_document_chunks;
  insert into public.finn_document_chunks (document_id, org_id, user_id, chunk_index, content)
  values (public.zz_id('d_A1'), public.zz_id('orgA'), public.zz_id('uA1'), 0, 'upserted')
  on conflict (document_id, chunk_index) do update set content = excluded.content;
  select count(*) into n_after from public.finn_document_chunks;
  perform public.zz_check('A5. upsert الاستيعاب يعمل بعد الترحيل: يحدّث ولا يكرّر',
    n_after = n_before
    and (select content from public.finn_document_chunks where document_id = public.zz_id('d_A1') and chunk_index = 0) = 'upserted');
  -- أعِد المحتوى كما كان كي لا يتأثر ما بعده
  update public.finn_document_chunks set content = 'chunk dA1_0'
   where document_id = public.zz_id('d_A1') and chunk_index = 0;
  delete from public.finn_document_chunks where chunk_index = 9;
end $$;

-- ── F. شكل الدوالّ ─────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select p.proname, p.prosecdef, p.provolatile, p.proconfig, p.proacl, p.proowner, p.oid
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sadeed\_match\_%'
  loop
    perform public.zz_check('F1. ' || r.proname || ' موجودة بتوقيعها وSECURITY INVOKER (prosecdef=false)', r.prosecdef = false);
    perform public.zz_check('F2. ' || r.proname || ' STABLE', r.provolatile = 's');
    perform public.zz_check('F3. ' || r.proname || ' بـsearch_path = public, extensions',
      exists (select 1 from unnest(r.proconfig) c where c = 'search_path=public, extensions'));
    perform public.zz_check('F4. ' || r.proname || ': لا منحَ PUBLIC (grantee 0) في ACL',
      not exists (select 1 from aclexplode(coalesce(r.proacl, acldefault('f', r.proowner))) a where a.grantee = 0));
    perform public.zz_check('F5. ' || r.proname || ': anon بلا EXECUTE', not has_function_privilege('anon', r.oid, 'execute'));
    perform public.zz_check('F6. ' || r.proname || ': authenticated وservice_role بـEXECUTE',
      has_function_privilege('authenticated', r.oid, 'execute') and has_function_privilege('service_role', r.oid, 'execute'));
  end loop;
  perform public.zz_check('F7. ثلاث دوالّ sadeed_match_* بالضبط',
    (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'sadeed\_match\_%') = 3);
  perform public.zz_check('F8. توقيعات الدوالّ الثلاث كما في العقد',
    to_regprocedure('public.sadeed_match_documents(uuid,vector,integer)') is not null
    and to_regprocedure('public.sadeed_match_knowledge(uuid,vector,text[],integer)') is not null
    and to_regprocedure('public.sadeed_match_memory(uuid,vector,text,integer)') is not null);
end $$;

-- ── G1/G2. إضافة فقط: aria_match_* لم تُمسّ، وفهرس واحد أُضيف ولا GIN ────────
do $$
begin
  perform public.zz_check('G1. بصمة جسم aria_match_* (الثلاث) لم تتغيّر بعد الترحيل',
    (select count(*) from public.zz_before b
       join (select 'aria:' || p.proname as k, md5(pg_get_functiondef(p.oid)) as v
             from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'aria\_match\_%') n
         on n.k = b.k and n.v = b.v
      where b.k like 'aria:%') = 3);
  perform public.zz_check('G2. أُضيف فهرس واحد فقط على جداول finn_* (الفريد) ولا فهرس قائم حُذف أو عُدّل',
    (select array_agg(i order by i) from (
       select indexname::text as i from pg_indexes
       where schemaname = 'public' and tablename in ('finn_documents', 'finn_document_chunks', 'finn_knowledge', 'finn_memory')
       except select substr(k, 5) from public.zz_before where k like 'idx:%') x) = array['finn_document_chunks_doc_chunk_uq']
    and (select count(*) from public.zz_before b where b.k like 'idx:%'
          and not exists (select 1 from pg_indexes i where 'idx:' || i.indexname = b.k and i.indexdef = b.v)) = 0);
  perform public.zz_check('G3. لا فهرس GIN/trigram على جداول finn_* (قرار موثّق في ترويسة الترحيل)',
    (select count(*) from pg_indexes
      where schemaname = 'public' and tablename in ('finn_documents', 'finn_document_chunks', 'finn_knowledge', 'finn_memory')
        and indexdef ~* 'using gin') = 0);
end $$;

-- ════ B. المستندات — تحت دور authenticated ═══════════════════════════════════
reset role; select public.zz_as(public.zz_id('uA1')); set local role authenticated;
select public.zz_eq('B1. uA1 على مؤسسة أ: مقطعاه الجاهزان ذوا المتّجه فقط (لا غير جاهز، لا بلا متّجه، لا لمستخدم آخر، لا لمؤسسة ب)',
  public.zz_docs(public.zz_id('orgA')), public.zz_ids_of(array['c_dA1_0', 'c_dA1_1']));
select public.zz_eq('B2. uA1 يسأل عن مؤسسة ب (ليس عضوًا): صفر',
  public.zz_docs(public.zz_id('orgB')), '{}');
select public.zz_eq('B3. مؤسسة NULL: صفر', (select coalesce(array_agg(chunk_id), '{}') from public.sadeed_match_documents(null, public.zz_vec(1), 50)), '{}');
select public.zz_check('B4. الترتيب بالتشابه تنازليًّا (1 ثم ≈0.8944) والتشابه = 1 − مسافة الكوساين',
  (select array_agg(round(s, 4)) from unnest(public.zz_docs_sims(public.zz_id('orgA'))) s) = array[1.0000, 0.8944]::numeric[]);
select public.zz_check('B5. _limit=1 يعيد الأقرب وحده (c_dA1_0)',
  public.zz_docs_first(public.zz_id('orgA')) = public.zz_id('c_dA1_0')
  and cardinality(public.zz_docs(public.zz_id('orgA'), 1)) = 1);
select public.zz_check('B6. _limit=0 صفر، و_limit NULL يعامل كالافتراضي (2)',
  cardinality(public.zz_docs(public.zz_id('orgA'), 0)) = 0
  and (select count(*) from public.sadeed_match_documents(public.zz_id('orgA'), public.zz_vec(1), null)) = 2);

reset role; select public.zz_as(public.zz_id('uA2')); set local role authenticated;
select public.zz_eq('B7. uA2 (المؤسسة نفسها) يقرأ مقطعيه وحدهما — لا مقاطع uA1 ولا المنحرفة',
  public.zz_docs(public.zz_id('orgA')), public.zz_ids_of(array['c_dA2_0', 'c_dA2_1']));

reset role; select public.zz_as(public.zz_id('uB1')); set local role authenticated;
select public.zz_eq('B8. uB1 على مؤسسة أ: صفر', public.zz_docs(public.zz_id('orgA')), '{}');
select public.zz_eq('B9. uB1 على مؤسسة ب: مقطعاه',
  public.zz_docs(public.zz_id('orgB')), public.zz_ids_of(array['c_dB1_0', 'c_dB1_1']));

reset role; select public.zz_as(public.zz_id('uAB')); set local role authenticated;
select public.zz_eq('B10. uAB (عضو في أ وب) على أ: مستند أ وحده — المؤسستان لا تُخلَطان',
  public.zz_docs(public.zz_id('orgA')), public.zz_ids_of(array['c_dABa_0', 'c_dABa_1']));
select public.zz_eq('B11. uAB على ب: مستند ب وحده',
  public.zz_docs(public.zz_id('orgB')), public.zz_ids_of(array['c_dABb_0', 'c_dABb_1']));

reset role; select public.zz_as(public.zz_id('uNone')); set local role authenticated;
select public.zz_eq('B12. مستخدم بلا عضوية: صفر على أ وب',
  public.zz_docs(public.zz_id('orgA')) || public.zz_docs(public.zz_id('orgB')), '{}');

-- ════ C. المعرفة ═════════════════════════════════════════════════════════════
reset role; select public.zz_as(public.zz_id('uA1')); set local role authenticated;
select public.zz_eq('C1. _tags NULL: كل معرفة مؤسسة أ ذات المتّجه (بلا Anull ولا B1)',
  public.zz_know_ids(public.zz_id('orgA')), public.zz_ids_of(array['k_A1', 'k_A2', 'k_A3']));
select public.zz_eq('C2. _tags فارغة {}: بلا تصفية كالـNULL (اختلاف عمدي عن aria_match_knowledge)',
  public.zz_know_ids(public.zz_id('orgA'), '{}'), public.zz_ids_of(array['k_A1', 'k_A2', 'k_A3']));
select public.zz_eq('C3. _tags {safety}: kA1 وحدها — وسم safety في مؤسسة ب لا يتسرّب',
  public.zz_know_ids(public.zz_id('orgA'), '{safety}'), public.zz_ids_of(array['k_A1']));
select public.zz_eq('C4. _tags {absent}: صفر', public.zz_know_ids(public.zz_id('orgA'), '{absent}'), '{}');
select public.zz_eq('C5. _tags {safety,ptw}: التقاطع (kA1 وkA2)',
  public.zz_know_ids(public.zz_id('orgA'), '{safety,ptw}'), public.zz_ids_of(array['k_A1', 'k_A2']));
select public.zz_eq('C6. uA1 يسأل عن مؤسسة ب (ليس عضوًا): صفر', public.zz_know_ids(public.zz_id('orgB')), '{}');
select public.zz_check('C7. الترتيب بالتشابه: الأقرب أولًا (kA1) و_limit=1 يعيده وحده',
  (select id from public.sadeed_match_knowledge(public.zz_id('orgA'), public.zz_vec(1), null, 1)) = public.zz_id('k_A1'));

reset role; select public.zz_as(public.zz_id('uA2')); set local role authenticated;
select public.zz_eq('C8. uA2 (المؤسسة نفسها) يرى معرفة المؤسسة — نطاق مؤسسة لا مستخدم',
  public.zz_know_ids(public.zz_id('orgA')), public.zz_ids_of(array['k_A1', 'k_A2', 'k_A3']));

reset role; select public.zz_as(public.zz_id('uB1')); set local role authenticated;
select public.zz_eq('C9. uB1: معرفة ب وحدها', public.zz_know_ids(public.zz_id('orgB')), public.zz_ids_of(array['k_B1']));
select public.zz_eq('C10. uB1 على أ: صفر', public.zz_know_ids(public.zz_id('orgA')), '{}');

reset role; select public.zz_as(public.zz_id('uAB')); set local role authenticated;
select public.zz_eq('C11. uAB على أ: معرفة أ وحدها', public.zz_know_ids(public.zz_id('orgA')), public.zz_ids_of(array['k_A1', 'k_A2', 'k_A3']));
select public.zz_eq('C12. uAB على ب: معرفة ب وحدها', public.zz_know_ids(public.zz_id('orgB')), public.zz_ids_of(array['k_B1']));
select public.zz_eq('C13. مؤسسة NULL: صفر لمستخدم عضو في مؤسستين (NULL لا تعني «كل مؤسساتي»)',
  (select coalesce(array_agg(id), '{}') from public.sadeed_match_knowledge(null, public.zz_vec(1), null, 50)), '{}');

-- ════ D. الذاكرة ═════════════════════════════════════════════════════════════
reset role; select public.zz_as(public.zz_id('uA1')); set local role authenticated;
select public.zz_eq('D1. uA1: ذاكرته ذات المتّجه فقط (لا A1n ولا ذاكرة uA2)',
  public.zz_mem_ids(public.zz_id('orgA')), public.zz_ids_of(array['m_A1a', 'm_A1b']));
select public.zz_eq('D2. _scope=preference: m_A1b وحدها', public.zz_mem_ids(public.zz_id('orgA'), 'preference'), public.zz_ids_of(array['m_A1b']));
select public.zz_eq('D3. uA1 على مؤسسة ب: صفر', public.zz_mem_ids(public.zz_id('orgB')), '{}');

reset role; select public.zz_as(public.zz_id('uA2')); set local role authenticated;
select public.zz_eq('D4. uA2 (المؤسسة نفسها): ذاكرته وحدها — لا ذاكرة uA1', public.zz_mem_ids(public.zz_id('orgA')), public.zz_ids_of(array['m_A2']));

reset role; select public.zz_as(public.zz_id('uB1')); set local role authenticated;
select public.zz_eq('D5. uB1: ذاكرته في ب، وصفر على أ',
  public.zz_mem_ids(public.zz_id('orgB')) || public.zz_mem_ids(public.zz_id('orgA')), public.zz_ids_of(array['m_B1']));

reset role; select public.zz_as(public.zz_id('uAB')); set local role authenticated;
select public.zz_eq('D6. uAB على أ: ذاكرة أ وحدها', public.zz_mem_ids(public.zz_id('orgA')), public.zz_ids_of(array['m_ABa']));
select public.zz_eq('D7. uAB على ب: ذاكرة ب وحدها', public.zz_mem_ids(public.zz_id('orgB')), public.zz_ids_of(array['m_ABb']));
select public.zz_eq('D8. مؤسسة NULL: صفر لمستخدم عضو في مؤسستين (NULL لا تعني «كل مؤسساتي»)',
  (select coalesce(array_agg(id), '{}') from public.sadeed_match_memory(null, public.zz_vec(1), null, 50)), '{}');

-- ════ E. الامتيازات ══════════════════════════════════════════════════════════
reset role; select public.zz_as(null); set local role anon;
do $$
declare m text; fn text;
begin
  foreach fn in array array['documents', 'knowledge', 'memory'] loop
    m := null;
    begin
      if fn = 'documents' then perform * from public.sadeed_match_documents(public.zz_id('orgA'), public.zz_vec(1), 5);
      elsif fn = 'knowledge' then perform * from public.sadeed_match_knowledge(public.zz_id('orgA'), public.zz_vec(1), null, 5);
      else perform * from public.sadeed_match_memory(public.zz_id('orgA'), public.zz_vec(1), null, 5);
      end if;
      m := 'executed';
    exception when insufficient_privilege then m := sqlerrm;
    end;
    perform public.zz_check('E1. anon يُرفض عند sadeed_match_' || fn || ' بسبب امتياز الدالّة نفسها لا المخطط (' || coalesce(m, '') || ')',
      m like '%permission denied for function sadeed_match_' || fn || '%');
  end loop;
end $$;

reset role; select public.zz_as(null); set local role authenticated;
select public.zz_eq('E2. authenticated بلا auth.uid(): مستندات صفر (فشل مغلق)', public.zz_docs(public.zz_id('orgA')), '{}');
select public.zz_eq('E3. authenticated بلا auth.uid(): ذاكرة صفر', public.zz_mem_ids(public.zz_id('orgA')), '{}');

reset role; select public.zz_as(null); set local role service_role;
select public.zz_eq('E4. service_role ينفّذ المعرفة لمؤسسة أ: صفوف أ وحدها (لا ب)',
  public.zz_know_ids(public.zz_id('orgA')), public.zz_ids_of(array['k_A1', 'k_A2', 'k_A3']));
select public.zz_eq('E5. service_role: معرفة ب وحدها لمؤسسة ب', public.zz_know_ids(public.zz_id('orgB')), public.zz_ids_of(array['k_B1']));
select public.zz_eq('E6. service_role: مستندات وذاكرة صفر (لا JWT ⇐ فشل مغلق)',
  public.zz_docs(public.zz_id('orgA')) || public.zz_mem_ids(public.zz_id('orgA')), '{}');
select public.zz_eq('E7. service_role (يتجاوز RLS) بمؤسسة NULL: معرفة صفر — المسند وحده يحمي، فلا «كل المؤسسات»',
  (select coalesce(array_agg(id), '{}') from public.sadeed_match_knowledge(null, public.zz_vec(1), null, 50)), '{}');
reset role;

-- ════ H. الترتيب وقيمة التشابه والسقف — الدوالّ الثلاث كلٌّ على حدة ══════════════
-- مؤسسة ج، مستخدم uR: 55 صفًّا لكل دالّة بتشابه متناقص (القيم المتوقّعة محسوبة هنا لا منقولة).
reset role; select public.zz_as(public.zz_id('uR')); set local role authenticated;
do $$
declare fn text; org uuid := public.zz_id('orgC');
begin
  foreach fn in array array['documents', 'knowledge', 'memory'] loop
    perform public.zz_check('H1. ' || fn || ': الأقرب أولًا — _limit=3 يعيد cap 00 ثم 01 ثم 02 بهذا الترتيب (لا الأبعد)',
      public.zz_ord(fn, org, 3) = array['cap 00', 'cap 01', 'cap 02']);
    perform public.zz_check('H2. ' || fn || ': التشابه = 1 − مسافة الكوساين (1.0000 ثم 0.9950 ثم 0.9806) لا المسافة نفسها',
      public.zz_sim(fn, org, 3) = (select array_agg(round((1 / sqrt(1 + 0.01 * g * g))::numeric, 4) order by g) from generate_series(0, 2) g));
    perform public.zz_check('H3. ' || fn || ': _limit=5000 تُقصّ عند 50 (المتاح 55)', public.zz_n(fn, org, 5000) = 50);
    perform public.zz_check('H4. ' || fn || ': _limit سالبة تعطي صفرًا لا خطأً', public.zz_n(fn, org, -5) = 0);
    -- المستندات: NULL مغطّاة بـB6 (الافتراضي ≥ المتاح هناك)؛ هنا للمعرفة والذاكرة (الافتراضي 6 من 55).
    if fn <> 'documents' then
      perform public.zz_check('H5. ' || fn || ': _limit NULL تعطي الافتراضي 6 (لا صفرًا ولا الكل)', public.zz_n(fn, org, null) = 6);
    end if;
  end loop;
end $$;
reset role;

-- ════ المصفوفة: (مستخدم × مؤسسة × دالّة) — العابر للمؤسسة والمستخدم يُعدّ ═════════
create table public.zz_matrix (caller text, org text, fn text, returned int, cross_org int, foreign_user int);
grant insert, select on public.zz_matrix to public;
do $$
declare
  c text; o text; fn text; ret int; xo int; xu int; u uuid; org uuid;
begin
  foreach c in array array['uA1', 'uA2', 'uB1', 'uAB', 'uNone'] loop
    foreach o in array array['orgA', 'orgB'] loop
      foreach fn in array array['documents', 'knowledge', 'memory'] loop
        u := public.zz_id(c); org := public.zz_id(o);
        perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
        execute 'set local role authenticated';
        if fn = 'documents' then
          select count(*), count(*) filter (where public.zz_org_of(chunk_id) <> org),
                 count(*) filter (where public.zz_user_of(chunk_id) <> u)
            into ret, xo, xu from public.sadeed_match_documents(org, public.zz_vec(1), 50);
        elsif fn = 'knowledge' then
          select count(*), count(*) filter (where public.zz_org_of(id) <> org), 0
            into ret, xo, xu from public.sadeed_match_knowledge(org, public.zz_vec(1), null, 50);
        else
          select count(*), count(*) filter (where public.zz_org_of(id) <> org),
                 count(*) filter (where public.zz_user_of(id) <> u)
            into ret, xo, xu from public.sadeed_match_memory(org, public.zz_vec(1), null, 50);
        end if;
        execute 'reset role';
        insert into public.zz_matrix values (c, o, fn, ret, xo, xu);
      end loop;
    end loop;
  end loop;
  perform public.zz_check('M1. المصفوفة: صفر صفّ عابر للمؤسسة عبر كل (مستخدم × مؤسسة × دالّة)',
    (select sum(cross_org) from public.zz_matrix) = 0);
  perform public.zz_check('M2. المصفوفة: صفر صفّ عابر للمستخدم في المستندات والذاكرة',
    (select sum(foreign_user) from public.zz_matrix) = 0);
  perform public.zz_check('M3. المصفوفة ليست فارغة: صفوف مُرجَعة موجبة (الصفر على متنٍ فارغ لا يُثبت عزلًا)',
    (select sum(returned) from public.zz_matrix) > 0 and (select count(*) from public.zz_matrix where returned > 0) >= 15);
  raise notice 'MATRIX calls=% returned_rows=% cross_org_rows=% foreign_user_rows=% calls_with_rows=%',
    (select count(*) from public.zz_matrix), (select sum(returned) from public.zz_matrix),
    (select sum(cross_org) from public.zz_matrix), (select sum(foreign_user) from public.zz_matrix),
    (select count(*) from public.zz_matrix where returned > 0);
end $$;

-- ════ G4/G5. التكرار والتراجع ════════════════════════════════════════════════
create table public.zz_after_first as
  select p.proname as k, md5(pg_get_functiondef(p.oid)) as v
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sadeed\_match\_%';
\i :migration_file
do $$
begin
  perform public.zz_check('G4. تشغيل الترحيل مرتين: لا خطأ ولا تغيير في أجسام الدوالّ (idempotent)',
    (select count(*) from public.zz_after_first a join (
        select p.proname as k, md5(pg_get_functiondef(p.oid)) as v
        from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'sadeed\_match\_%') n
      on n.k = a.k and n.v = a.v) = 3);
end $$;

create table public.zz_chunks_before as select count(*)::int as n from public.finn_document_chunks;
\i :rollback_file
\i :rollback_file
do $$
begin
  perform public.zz_check('G5. التراجع (مرتين) يُسقط الدوالّ الثلاث والفهرس الفريد',
    to_regprocedure('public.sadeed_match_documents(uuid,vector,integer)') is null
    and to_regprocedure('public.sadeed_match_knowledge(uuid,vector,text[],integer)') is null
    and to_regprocedure('public.sadeed_match_memory(uuid,vector,text,integer)') is null
    and to_regclass('public.finn_document_chunks_doc_chunk_uq') is null);
  perform public.zz_check('G6. التراجع لا يمسّ aria_match_* ولا الفهرس غير الفريد القديم ولا أي صف',
    (select count(*) from public.zz_before b
       join (select 'aria:' || p.proname as k, md5(pg_get_functiondef(p.oid)) as v
             from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'aria\_match\_%') n
         on n.k = b.k and n.v = b.v where b.k like 'aria:%') = 3
    and exists (select 1 from pg_indexes where indexname = 'aria_document_chunks_doc_idx')
    and (select count(*) from public.finn_document_chunks) = (select n from public.zz_chunks_before));
end $$;
\i :migration_file
do $$
begin
  perform public.zz_check('G7. إعادة تطبيق الترحيل بعد التراجع تنجح (الدوالّ والفهرس تعود)',
    to_regprocedure('public.sadeed_match_documents(uuid,vector,integer)') is not null
    and to_regprocedure('public.sadeed_match_knowledge(uuid,vector,text[],integer)') is not null
    and to_regprocedure('public.sadeed_match_memory(uuid,vector,text,integer)') is not null
    and to_regclass('public.finn_document_chunks_doc_chunk_uq') is not null);
end $$;

rollback;
\o

-- الملخّص: العدّ من zz_log لا يبقى بعد rollback، فيُعاد حسابه من الإشعارات في السكربت
-- المشغِّل. هنا سطرٌ ثابت يدلّ على أن الملف وصل نهايته بلا استثناء.
\echo SADEED_MATCH_CHECK: FULL_OK
\endif

\else
\echo SADEED_MATCH_CHECK: SKIPPED_NO_PGVECTOR — pgvector غير متاح على هذا العنقود؛ لم يُثبَت شيء ولا يُعدّ هذا نجاحًا.
\endif
