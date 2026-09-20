-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: بُعد المنطقة على `sec_circles` — مرافق لـ`20260920100000`
--
-- ⚠ **تشغيله يُعيد العطل الذي أُغلق:** تسقط السلسلة
-- `sec_incidents → sec_sites → sec_circles.region`، فتعود كل شاشةٍ تحت
-- عنوان منطقةٍ تعرض أرقامًا عالمية. لا يُشغَّل إلا لعطلٍ مثبت.
--
-- ## الترتيب معكوسٌ بدقّة، والحذف مشروط
--
-- يُحذف ما أضافه الترحيل **وحده** — الدوائر الستّ عشرة بأكوادها المعروفة —
-- ولا تُمسّ الخمس المبذورة أصلًا (makkah · jeddah · madinah · taif · tabuk)؛
-- هي أقدم من الترحيل ولم يُنشئها.
--
-- **والحذف مشروطٌ بألّا يتعلّق بالدائرة موقع.** فلو رُبط بها موقعٌ بعد
-- التطبيق — وهو الغرض منها — صار حذفها إمّا فشلًا بمفتاح أجنبي وإمّا
-- تيتيمًا لصفوف `sec_sites`. فتُترك الدائرة المستعمَلة قائمةً بإشعار،
-- ويُكتفى بإسقاط العمود. تراجعٌ ناقصٌ معلَن خيرٌ من تراجعٍ يُتلف بيانات.
--
-- idempotent: يعمل ولو شُغِّل مرّتين، أو على قاعدةٍ لم يُطبَّق عليها الأصل.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_codes text[] := array[
    'riyadh','kharj','sudair','washm',
    'yanbu','rabigh',
    'jubail','dammam','dhahran','khobar','ras-tanura','ahsa',
    'jazan','abha','najran','bisha'
  ];
  v_kept int;
  v_removed int;
begin
  if to_regclass('public.sec_circles') is null then
    raise notice 'skip: public.sec_circles غير موجود';
    return;
  end if;

  -- ما يتعلّق به موقع يبقى — ويُسمّى في الإشعار كي لا يكون البقاء صامتًا.
  select count(*) into v_kept
    from public.sec_circles c
   where c.code = any(v_codes)
     and exists (select 1 from public.sec_sites s where s.circle_id = c.id);

  delete from public.sec_circles c
   where c.code = any(v_codes)
     and not exists (select 1 from public.sec_sites s where s.circle_id = c.id);
  get diagnostics v_removed = row_count;

  raise notice 'حُذفت % دائرة؛ بقيت % دائرة لتعلّق مواقع بها', v_removed, v_kept;
end $$;

-- ثمّ الفهرس فالقيد فالعمود — عكس ترتيب الإنشاء.
drop index if exists public.sec_circles_region_idx;

do $$ begin
  alter table public.sec_circles drop constraint sec_circles_region_chk;
exception when undefined_object then null; end $$;

alter table public.sec_circles drop column if exists region;
