-- ═══════════════════════════════════════════════════════════════════════════
-- بُعد المنطقة على دوائر الأمن الصناعي — أمر المالك ٢٠٢٦/٠٩/٢٠
--
-- ## العطل البنيويّ الذي يُغلقه هذا الترحيل
--
-- `sec_incidents` و`sec_work_orders` وبقيّة `sec_*` **لا تحمل منطقة**، ولا
-- تصل إليها عبر `site_id → sec_sites` لأن `sec_circles` نفسه بلا عمود
-- منطقة. فكانت كل شاشةٍ تحت عنوان منطقةٍ تعرض أرقامًا **عالمية** — وعنوانٌ
-- يقول «الوسطى» فوق رقمٍ عالميّ يُقرأ إثباتًا عنها.
--
-- وبعد هذا الترحيل تكتمل السلسلة:
--   `sec_incidents.site_id → sec_sites.circle_id → sec_circles.region`
--
-- ## ولماذا لا يكفي إضافة العمود وحده
--
-- الدوائر المبذورة الخمس (makkah · jeddah · madinah · taif · tabuk) **كلّها
-- في النطاق الغربي**. فإضافة العمود وملؤه تجعل الغربية وحدها ذات بيانات،
-- وتبقى الوسطى والشرقية والجنوبية **صفرًا** — أي ثلاث شاشاتٍ فارغة بدل
-- ثلاث شاشاتٍ مضلِّلة. وذلك تبديلُ عطلٍ بعطل.
--
-- فالترحيل يفعل أمرين معًا: يضيف البُعد، **ويستكمل الدوائر الناقصة** من
-- نفس المرجع الذي تعرضه الواجهة اليوم (`CIRCLE_TEMPLATES` في
-- `src/lib/sec/region-sim-data.ts`) — أسماءً ومديرين وإحداثيات وأعداد
-- موظفين مطابقة حرفًا، فلا تفترق القاعدة عن الشاشة.
--
-- ## إضافةٌ محضة — لا حذف ولا تغيير لصفٍّ قائم إلا بملء العمود الجديد
--
-- لا صفّ يُحذف، ولا عمود يُسقط، ولا اسم يُغيَّر. والدوائر الخمس القائمة
-- تبقى بمعرّفاتها ومراجعها كما هي، ويُضاف إليها `region = 'western'` فقط.
--
-- ## ولا `NOT NULL` عمدًا
--
-- الجدول له مسارات إدراج قائمة (البذور والأدوات) لا تعرف العمود الجديد.
-- و`NOT NULL` يكسرها فورًا عند أوّل إدراج. فالقيد `CHECK` يقبل `NULL`
-- بمعنى **«غير مُسنَدة»**، والتطبيق يعاملها صراحةً لا بالصمت. وتشديدُه
-- لاحقًا قرارٌ مستقلّ بعد أن تُسنَد كل دائرة.
--
-- idempotent كاملًا. التراجع: `20260920100001_sec_circles_region_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ① العمود والقيد ───────────────────────────────────────────────────────
alter table public.sec_circles add column if not exists region text;

do $$ begin
  alter table public.sec_circles add constraint sec_circles_region_chk
    check (region is null or region in ('central','western','eastern','southern'));
exception when duplicate_object then null; end $$;

-- الفهرس على العمود الذي سيُرشَّح عليه كل استعلامٍ منطقيّ بعد اليوم.
create index if not exists sec_circles_region_idx on public.sec_circles (region);

-- ── ② إسناد الدوائر القائمة ───────────────────────────────────────────────
-- الخمس المبذورة كلّها في النطاق الغربي لشركة الكهرباء: مكة وجدة والمدينة
-- والطائف، وتبوك ضمن النطاق الغربي/الشمالي الغربي تاريخيًّا. ولا منطقة
-- خامسة في `regions.ts` تُسنَد إليها.
update public.sec_circles
   set region = 'western'
 where region is null
   and code in ('makkah','jeddah','madinah','taif','tabuk');

-- ── ③ استكمال الدوائر الناقصة للمناطق الثلاث الأخرى ───────────────────────
--
-- **والإسناد يسبق الإدراج، ومن القائمة نفسها.** كُشف ذلك بدورةٍ كاملة
-- (تطبيق ← تراجع ← إعادة تطبيق) على Postgres حقيقي: التراجع **يُبقي**
-- الدائرة التي تعلّقت بها مواقع — وهو المقصود كي لا تُيتَّم — ويُسقط
-- العمود. فعند إعادة التطبيق يعود العمود `NULL`، والقسم ② لا يشمل
-- `riyadh`، والإدراج يتخطّاها لأنها **موجودة**. فتبقى دائرةٌ حيّة لها
-- مواقع و`region = NULL` إلى الأبد: الوسطى تعرض ٣ من ٤، وبلاغات تلك
-- الدائرة تسقط من **كل** عرضٍ منطقيّ بلا أن يُنبّه شيء.
--
-- فصارت البذرة جدولًا مؤقّتًا **واحدًا** يُقرأ مرّتين: مرّةً لإسناد
-- الموجود ومرّةً لإدراج الناقص. وقائمتان لنفس البذرة تفترقان يومًا.
-- المصدر: `CIRCLE_TEMPLATES` — نفس ما تعرضه `/sec` اليوم، فلا تفترق
-- القاعدة عن الشاشة. و`staff_count` محسوبٌ بنفس قاعدة المرجع
-- (‏`STAFF_PER_CIRCLE[region] + الترتيب × 3`).
--
-- الإدراج **مشروطٌ بوجود مؤسسة مرجعية**: `org_id` إلزاميّ في هذا الجدول،
-- واختلاقُ مؤسسةٍ أسوأ من تخطّي الإدراج. فإن لم توجد دائرةٌ قائمة تُؤخذ
-- منها المؤسسة، يُتخطّى القسم بإشعارٍ ظاهر لا بصمت.
create temp table if not exists _sec_circle_seed (
  code text primary key, name_ar text, name_en text, manager text,
  lat double precision, lng double precision, staff_count int, region text
);
delete from _sec_circle_seed;
insert into _sec_circle_seed values
  -- الوسطى
  ('riyadh',     'دائرة الرياض الصناعية', 'Riyadh Industrial Circle', 'م. فهد العتيبي',       24.7136, 46.6753, 46, 'central'),
  ('kharj',      'دائرة الخرج',           'Al-Kharj Circle',          'م. سعد القحطاني',      24.1554, 47.3346, 49, 'central'),
  ('sudair',     'دائرة سدير',            'Sudair Circle',            'م. ناصر الحربي',       25.6667, 46.1000, 52, 'central'),
  ('washm',      'دائرة الوشم',           'Al-Washm Circle',          'م. عبدالله الشمري',    25.5000, 45.5000, 55, 'central'),
  -- الغربية: ما ينقص فوق الخمس القائمة
  ('yanbu',      'دائرة ينبع الصناعية',   'Yanbu Industrial Circle',  'م. خالد الزهراني',     24.0895, 38.0618, 52, 'western'),
  ('rabigh',     'دائرة رابغ',            'Rabigh Circle',            'م. ماجد المالكي',      22.7987, 39.0349, 55, 'western'),
  -- الشرقية
  ('jubail',     'دائرة الجبيل الصناعية', 'Jubail Industrial Circle', 'م. عبدالعزيز الدوسري', 27.0046, 49.6461, 61, 'eastern'),
  ('dammam',     'دائرة الدمام',          'Dammam Circle',            'م. بندر العجمي',       26.4207, 50.0888, 64, 'eastern'),
  ('dhahran',    'دائرة الظهران',         'Dhahran Circle',           'م. مشعل السبيعي',      26.2361, 50.0393, 67, 'eastern'),
  ('khobar',     'دائرة الخبر',           'Khobar Circle',            'م. راشد المطيري',      26.2794, 50.2083, 70, 'eastern'),
  ('ras-tanura', 'دائرة رأس تنورة',       'Ras Tanura Circle',        'م. عبدالرحمن الشهري',  26.6438, 50.1580, 73, 'eastern'),
  ('ahsa',       'دائرة الأحساء',         'Al-Ahsa Circle',           'م. حمد القرني',        25.3833, 49.5833, 76, 'eastern'),
  -- الجنوبية
  ('jazan',      'دائرة جازان الصناعية',  'Jazan Industrial Circle',  'م. علي الشهراني',      16.8892, 42.5511, 38, 'southern'),
  ('abha',       'دائرة أبها',            'Abha Circle',              'م. يحيى عسيري',        18.2164, 42.5053, 41, 'southern'),
  ('najran',     'دائرة نجران',           'Najran Circle',            'م. مبارك اليامي',      17.4924, 44.1277, 44, 'southern'),
  ('bisha',      'دائرة بيشة',            'Bisha Circle',             'م. سالم البقمي',       20.0000, 42.6000, 47, 'southern');

-- ③-أ: إسناد ما هو موجودٌ أصلًا بالكود — **قبل** الإدراج.
update public.sec_circles c
   set region = s.region
  from _sec_circle_seed s
 where c.code = s.code
   and c.region is null;

-- ③-ب: إدراج الناقص فقط.
do $$
declare
  v_org uuid;
  v_added int := 0;
begin
  select org_id into v_org
    from public.sec_circles
   where org_id is not null
   order by created_at
   limit 1;

  if v_org is null then
    raise notice 'skip: لا مؤسسة مرجعية في sec_circles — لم تُضف دوائر';
    return;
  end if;

  insert into public.sec_circles
        (code, name_ar, name_en, manager, lat, lng, staff_count, region, org_id)
  select s.code, s.name_ar, s.name_en, s.manager, s.lat, s.lng, s.staff_count, s.region, v_org
    from _sec_circle_seed s
   -- الشرط يجعل الترحيل idempotent بلا الاعتماد على فهرسٍ فريد على `code`.
   where not exists (select 1 from public.sec_circles c where c.code = s.code);

  get diagnostics v_added = row_count;
  raise notice 'أُضيفت % دائرة', v_added;
end $$;

drop table if exists _sec_circle_seed;

-- ── ④ تقرير الحصيلة — يُقرأ في مخرجات التشغيل ─────────────────────────────
do $$
declare r record;
begin
  for r in
    select coalesce(region, '‹غير مُسنَدة›') as region, count(*) as n
      from public.sec_circles group by 1 order by 1
  loop
    raise notice 'المنطقة %: % دائرة', r.region, r.n;
  end loop;
end $$;
