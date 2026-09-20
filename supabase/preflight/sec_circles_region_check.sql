-- ═══════════════════════════════════════════════════════════════════════════
-- التحقّق من بُعد المنطقة على الدوائر — يُقرأ ولا يكتب.
--
-- يُشغَّل **بعد** `20260920100000_sec_circles_region.sql` في Supabase →
-- SQL Editor. وهو يقيس **الواقع** على القاعدة الحيّة، بخلاف الحرّاس التي
-- تقرأ الترحيلات — والاثنان قد يفترقان (درس ٢٠٢٦/٠٩/٢٠).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ① توزيع الدوائر على المناطق ───────────────────────────────────────────
-- المتوقَّع: أربع مناطق، **ولا صفّ «غير مُسنَدة»**.
select
  coalesce(region, '‹غير مُسنَدة›') as "المنطقة",
  count(*)                          as "عدد الدوائر",
  string_agg(code, ' · ' order by code) as "الأكواد"
from public.sec_circles
group by 1
order by 1;

-- ── ② دوائر بلا منطقة — يجب أن تكون صفرًا ─────────────────────────────────
-- كلّ دائرة هنا تسقط بلاغاتها ومواقعها من **كل** عرضٍ منطقيّ بلا تنبيه.
select
  '② دائرة بلا منطقة' as "الفحص",
  code                 as "الكود",
  name_ar              as "الاسم",
  (select count(*) from public.sec_sites s where s.circle_id = c.id) as "مواقع متأثّرة"
from public.sec_circles c
where c.region is null
order by code;

-- ── ③ السلسلة كاملةً: بلاغات كل منطقة ─────────────────────────────────────
-- هذا هو الغرض من الترحيل. المتوقَّع بعد ربط المواقع: أربعة صفوف.
-- و`left join` عمدًا: بلاغٌ بلا موقع أو موقعٌ بلا دائرة يظهر «غير منسوب»
-- بدل أن يختفي من التقرير — وهو بالضبط ما يجب أن يُرى.
select
  coalesce(c.region, '‹غير منسوب›') as "المنطقة",
  count(i.id)                        as "بلاغات"
from public.sec_incidents i
left join public.sec_sites  s on s.id = i.site_id
left join public.sec_circles c on c.id = s.circle_id
group by 1
order by 1;

-- ── ④ مواقع معلّقة بلا دائرة — تُيتَّم بلاغاتها منطقيًّا ───────────────────
select
  '④ موقع بلا دائرة' as "الفحص",
  code                as "الكود",
  name_ar             as "الاسم"
from public.sec_sites
where circle_id is null
order by code;

-- ── ⑤ القيد والفهرس قائمان ────────────────────────────────────────────────
select
  (select count(*) from pg_constraint
    where conrelid = 'public.sec_circles'::regclass
      and conname  = 'sec_circles_region_chk')              as "القيد",
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'sec_circles_region_idx') as "الفهرس";
