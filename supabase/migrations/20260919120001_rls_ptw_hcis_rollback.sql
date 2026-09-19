-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع تفعيل RLS على جداول التصاريح وHCIS — مرافق إلزاميّ (برمت المالك §2.5)
--
-- **لا يُشغَّل مع الدفعة، ولا يُشغَّل إلا باضطرار.**
--
-- ⚠ تشغيله **يُعيد فتح كشفٍ عابرٍ للمؤسسات**: عضو مؤسسةٍ يقرأ تصاريح
-- مؤسسةٍ أخرى، وزائرٌ مجهول يقرأ الكلّ. فإن ظهر عطلٌ بعد التفعيل فالأرجح
-- أن مؤسسة المستخدم غير مسجّلة في `org_members` — وعلاجه إضافة العضوية لا
-- إطفاء الحاجز.
--
-- والعلاج الأوسط إن لزم: إبقاء RLS وتوسيع السياسة مؤقتًا لكل مصادَق:
--     alter policy permits_select_org on public.permits
--       to authenticated using (true);
-- فيبقى الزائر المجهول ممنوعًا، ويُحصر الفقد في العزل بين المؤسسات.
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
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists %I on public.%I', t || '_select_org', t);
    execute format('alter table public.%I disable row level security', t);
  end loop;
end $$;
