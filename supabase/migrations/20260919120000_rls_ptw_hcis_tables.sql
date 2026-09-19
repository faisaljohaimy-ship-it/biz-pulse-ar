-- ═══════════════════════════════════════════════════════════════════════════
-- إغلاق أخطر ثغرة في التدقيق: سبعة جداول حيّة بلا RLS — ٢٠٢٦/٠٩/١٩
--
-- ## لماذا هذه أخطر مما بدت
--
-- الجداول السبعة لا `enable row level security` عليها في أي ترحيل. وRLS
-- المُطفأ في Postgres يعني **لا قيد إطلاقًا**: من يملك امتياز `select`
-- يقرأ كل صف. وSupabase تمنح `anon` و`authenticated` افتراضيًّا على مستوى
-- المخطط (`ALTER DEFAULT PRIVILEGES`)، فالامتياز قائمٌ ولو لم يُكتب
-- `GRANT` في أي ملفّ هنا.
--
-- والأخطر أن `getPtwOverview` تقرؤها عبر `optionalSupabaseAuth` — أي
-- **بعميل الزائر** لا بمفتاح الخدمة. وكلّها تحمل `org_id`. فالكشف ليس
-- «زائرٌ يرى بيانات العرض» بل **عابرٌ للمؤسسات**: عضو مؤسسةٍ يقرأ تصاريح
-- مؤسسةٍ أخرى وتقييماتها ومخالفاتها. وهذا أثقل صنفٍ في التدقيق كلّه.
--
-- ## قراءة فقط — وأضيق أثرٍ ممكن
--
-- كل كتابةٍ على هذه الجداول تمرّ اليوم بـ`supabaseAdmin` (مفتاح الخدمة
-- يتجاوز RLS): الإنشاء والاعتماد والبذر. فسياسات الكتابة لدور المستخدم
-- **لا تُضاف** — سطحٌ جديد بلا حاجة قائمة. والسلوك بعد هذا الترحيل مطابقٌ
-- لما قبله في كل مسار كتابة.
--
-- ## والزائر لا تبيضّ شاشته
--
-- بعد التفعيل يقرأ الزائر صفرًا، و`getPtwOverview` تنصّ صراحةً:
-- `if (p.length === 0)` ⇒ المحاكاة المرجعية المدمجة. فهذا هو **السلوك
-- المقصود** في عقيدة «بيانات لا تفرغ»، لا ارتدادٌ عارض.
--
-- ## النمط من المشروع لا من خارجه
--
-- `public.is_org_member(org_id, 'viewer')` — الدالّة نفسها التي تحرس
-- `sec_*` وبقيّة الجداول المؤسسية، بـ`security definer` و`search_path`
-- مثبَّت. و`(select auth.uid())` داخلها لا `auth.uid()` المباشرة.
--
-- idempotent كاملًا. التراجع: `20260919120001_rls_ptw_hcis_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tables text[] := array[
    'permits', 'permit_approvals', 'permit_types',
    'hcis_assessments', 'hcis_findings', 'hcis_inspections', 'hcis_requirements'
  ];
begin
  foreach t in array tables loop
    -- جدولٌ غير موجود يُتخطّى بصمت: الملفّ يبقى صالحًا على أي نسخة.
    if to_regclass('public.' || t) is null then
      raise notice 'skip: public.% غير موجود', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- سحب امتياز الزائر: RLS وحده يكفي، لكن نزع الامتياز يجعل الخطأ
    -- مستحيلًا لا محروسًا — سياسةٌ تُحذف يومًا لا تُعيد فتح الباب.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_org', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_org_member(org_id, ''viewer''))',
      t || '_select_org', t
    );

    -- فهرس على العمود الذي تستعمله السياسة: بغيره يصير كل استعلامٍ مسحًا
    -- كاملًا بعد التفعيل، فتُدفع كلفة الأمان أداءً بلا داعٍ.
    execute format(
      'create index if not exists %I on public.%I (org_id)', t || '_org_idx', t
    );
  end loop;
end $$;
