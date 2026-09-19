-- ═══════════════════════════════════════════════════════════════════════════
-- فحص تغطية RLS على قاعدةٍ حيّة — سَدِيد، ٢٠٢٦/٠٩/١٩
--
-- **يقرأ ولا يكتب.** الصقه في Supabase → SQL Editor وشغّله.
--
-- ولماذا هذا الملفّ مع وجود حارسٍ في الاختبارات: الحارس يقرأ **الترحيلات**
-- فيمنع إدخال الثغرة في الشيفرة. وهذا يقرأ **الواقع** — وقد يفترقان:
-- ترحيلٌ لم يُطبَّق، أو تغييرٌ يدويّ من اللوحة، أو امتيازٌ منحته Supabase
-- افتراضيًّا ولم يُكتب في أي ملفّ. أحدهما لا يغني عن الآخر.
--
-- ثلاثة أقسام، والمطلوب في كلٍّ منها **صفر صفوف**.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ① جداول public بلا RLS مفعّل ──────────────────────────────────────────
-- ‏RLS المطفأ يعني لا قيد إطلاقًا لمن يملك امتياز `select`.
select
  '① بلا RLS'                       as "الفحص",
  c.relname                          as "الجدول",
  'RLS مطفأ — لا قيد على الصفوف'     as "الخطر"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- ── ② جداول عليها RLS وبلا سياسةٍ واحدة ───────────────────────────────────
-- ليست ثغرة كشف — بل حجبٌ تامّ: الجدول يُقرأ صفرًا لمن وُجد لأجله.
-- (يُستثنى ما تُكتب إليه الخدمة وحدها؛ راجع كل صفٍّ بعينه.)
select
  '② RLS بلا سياسة'                 as "الفحص",
  c.relname                          as "الجدول",
  'يُقرأ صفرًا لكل دور مستخدم'       as "الأثر"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (select 1 from pg_policies p
                  where p.schemaname = 'public' and p.tablename = c.relname)
order by c.relname;

-- ── ③ امتياز مباشر لـ`anon` على جدولٍ تشغيلي ──────────────────────────────
-- ‏RLS يحرس الصفوف، ونزعُ الامتياز يجعل الخطأ مستحيلًا لا محروسًا: سياسةٌ
-- تُحذف يومًا تُعيد فتح الباب إن بقي الامتياز.
select
  '③ امتياز anon'                   as "الفحص",
  table_name                         as "الجدول",
  string_agg(distinct privilege_type, ', ') as "الامتيازات"
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name not in ('rate_limit_buckets')  -- دلاء الحدّ: خدمةٌ فقط أصلًا
group by table_name
order by table_name;

-- ── ④ تأكيد الإصلاح: السبعة التي كُشفت ٢٠٢٦/٠٩/١٩ ────────────────────────
-- المتوقَّع بعد تطبيق `20260919120000_rls_ptw_hcis_tables.sql`:
-- سبعة صفوف، كلٌّ منها `rls = true` و`policies >= 1` و`anon_grants = 0`.
select
  c.relname                                   as "الجدول",
  c.relrowsecurity                            as "rls",
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as "policies",
  (select count(*) from information_schema.role_table_grants g
    where g.table_schema = 'public' and g.table_name = c.relname
      and g.grantee = 'anon')                 as "anon_grants"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('permits','permit_approvals','permit_types',
                    'hcis_assessments','hcis_findings','hcis_inspections',
                    'hcis_requirements')
order by c.relname;
