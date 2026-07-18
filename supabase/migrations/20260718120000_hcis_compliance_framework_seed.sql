-- ============================================================================
-- NEXIOS AI OS — HCIS Compliance Framework Seed (migration form)
-- المصدر: ملف المستخدم nexios_hcis_seed.sql — مُكيَّف ليُطبَّق كهجرة Supabase.
-- Idempotent: آمن لإعادة التشغيل (create if not exists + upsert / delete-then-insert).
-- Governance: بيانات مرجعية عامة؛ سجلات الامتثال موسومة is_simulation=true.
-- Source basis: معلومات منشورة علنًا (hcis.gov.sa, laws.boe.gov.sa, moi.gov.sa).
-- هذه الوثيقة مرجع داخلي وليست بديلًا عن النصوص الرسمية للهيئة.
--
-- تعديل جوهري عن ملف المصدر: قسم "قاعدة معرفة ARIA" أُعيد كتابته ليطابق المخطّط
-- الفعلي القائم لجدول public.aria_knowledge (title, source, content, tags, org_id,
-- embedding) — بدل مخطّط (slug/domain/*_ar/*_en) الذي لا يوجد في قاعدة النظام —
-- كي يلتقطه مسار RAG القائم فعلًا (المتجهات تُولَّد لاحقًا في مسار الفهرسة).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) الجداول المرجعية الجديدة | New reference tables
-- ----------------------------------------------------------------------------

create table if not exists public.hcis_directives (
  code          text primary key,
  category      text not null check (category in ('SEC','SAF')),
  name_ar       text not null,
  name_en       text not null,
  scope_ar      text not null,
  issue_note_ar text,
  sort_order    int  not null,
  updated_at    timestamptz not null default now()
);

create table if not exists public.hcis_sectors (
  id         int primary key,
  name_ar    text not null,
  name_en    text not null,
  is_primary boolean not null default false
);

create table if not exists public.hcis_approval_stages (
  stage_no       int primary key,
  name_ar        text not null,
  name_en        text not null,
  description_ar text not null
);

create table if not exists public.hcis_compliance_status (
  id             uuid primary key default gen_random_uuid(),
  directive_code text not null references public.hcis_directives(code) on delete cascade,
  region_code    text not null,
  status         text not null default 'not_assessed'
                 check (status in ('compliant','partial','non_compliant','not_applicable','not_assessed')),
  priority       text not null default 'medium'
                 check (priority in ('critical','high','medium','low')),
  notes_ar       text,
  is_simulation  boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (directive_code, region_code)
);

-- ----------------------------------------------------------------------------
-- 2) RLS — قراءة للمصادَق عليهم (بيانات مرجعية عامة)؛ لا كتابة من العميل
-- ----------------------------------------------------------------------------

alter table public.hcis_directives        enable row level security;
alter table public.hcis_sectors           enable row level security;
alter table public.hcis_approval_stages   enable row level security;
alter table public.hcis_compliance_status enable row level security;

grant select on public.hcis_directives        to authenticated;
grant select on public.hcis_sectors           to authenticated;
grant select on public.hcis_approval_stages   to authenticated;
grant select on public.hcis_compliance_status to authenticated;
grant all    on public.hcis_directives        to service_role;
grant all    on public.hcis_sectors           to service_role;
grant all    on public.hcis_approval_stages   to service_role;
grant all    on public.hcis_compliance_status to service_role;

do $$ begin
  create policy hcis_directives_read on public.hcis_directives
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_sectors_read on public.hcis_sectors
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_stages_read on public.hcis_approval_stages
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_compliance_read on public.hcis_compliance_status
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 3) التوجيهات الأمنية | SEC Directives (2017 issue, v2.0) + SAF overview
-- ----------------------------------------------------------------------------

insert into public.hcis_directives (code, category, name_ar, name_en, scope_ar, issue_note_ar, sort_order) values
('SEC-01','SEC','المتطلبات العامة للتوجيهات الأمنية','General Requirements for Security Directives','تصنيف المنشآت ومستويات الحماية، تقييم الثغرات الأمنية (SVA) بمنهجية API، صلاحية الهيئة المطلقة في التصنيف والتعديل، اشتراط استشاري أمني معتمد، اعتماد الهيئة قبل أي تصميم أو تنفيذ.',null,1),
('SEC-02','SEC','الأسوار الأمنية','Security Fencing','مواصفات الأسوار المحيطية والارتفاعات والمناطق العازلة والحواجز المضادة للاقتحام حسب تصنيف المنشأة.',null,2),
('SEC-03','SEC','البوابات الأمنية','Security Gates','بوابات الأفراد والمركبات، حواجز الصدم، مسارات التفتيش، غرف التحكم بالدخول.',null,3),
('SEC-04','SEC','الإنارة الأمنية','Security Lighting','مستويات الإضاءة للمحيط والبوابات والمناطق الحرجة، التغذية الاحتياطية، التكامل مع كاميرات المراقبة.',null,4),
('SEC-05','SEC','الأنظمة الأمنية المتكاملة','Integrated Security Systems','كاميرات المراقبة CCTV، كشف التسلل المحيطي PIDS، التحكم بالدخول ACS، غرف التحكم الأمنية، التكامل بين الأنظمة.',null,5),
('SEC-06','SEC','الأجهزة الأمنية','Security Devices','أجهزة الكشف والتفتيش: بوابات كشف المعادن، الأشعة السينية، كواشف المتفجرات، فحص أسفل المركبات.',null,6),
('SEC-07','SEC','التغذية الكهربائية','Power Supply','استمرارية تغذية الأنظمة الأمنية: مصادر احتياطية وUPS ومولدات وأزمنة الصمود المطلوبة.',null,7),
('SEC-08','SEC','الاتصالات الأمنية وشبكات البيانات','Security Communications & Data Networks','شبكات الاتصال الأمنية، التكرار Redundancy، فصل الشبكات، تشفير قنوات الأنظمة الأمنية.',null,8),
('SEC-09','SEC','المباني الحاضنة للمعدات الأمنية','Structures Housing Security Equipment','مواصفات غرف التحكم والمباني الأمنية: التحصين، التكييف، الحماية من الحريق، الدخول المقيّد.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',9),
('SEC-10','SEC','عمليات السكك الحديدية داخل المنشآت الصناعية','Railway Operations in Industrial Facilities','تأمين مداخل ومسارات السكك الحديدية العابرة للمنشآت الخاضعة وضوابط الدخول الخاصة بها.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',10),
('SEC-11','SEC','التحقق من الهوية الشخصية','Personal Verification','إجراءات التحقق من الأفراد قبل منح الدخول: الفحص الأمني، التصاريح، ضوابط المقاولين والزوار.',null,11),
('SEC-12','SEC','بطاقات التعريف','Identification Cards','مواصفات بطاقات الهوية، مستويات الصلاحية، دورة الإصدار والإلغاء، الضوابط التقنية.',null,12),
('SEC-13','SEC','الأمن السيبراني','Cyber Security','حماية أنظمة التحكم الصناعي ICS/OT والأنظمة الأمنية من التهديدات السيبرانية، فصل الشبكات، إدارة الثغرات — بالتكامل مع متطلبات الهيئة الوطنية للأمن السيبراني.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',13),
('SEC-14','SEC','المنشآت ذات الواجهة البحرية','Facilities with Marine Interface','التأمين البحري: الحواجز المائية، مراقبة الواجهة البحرية، التنسيق مع حرس الحدود.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',14),
('SEC-15','SEC','إدارة المشاريع الأمنية','Security Project Management','حوكمة مشاريع الأنظمة الأمنية: التأهيل المسبق للمتكاملين، مراحل الاعتماد، اختبارات FAT/SAT.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',15),
('SEC-16','SEC','العمليات الأمنية في المنشآت الصناعية','Security Operations at Industrial Facilities','التشغيل اليومي: القوى الأمنية، الإجراءات التشغيلية القياسية، الاستجابة للحوادث، التدريب والجاهزية.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',16),
('SEC-17','SEC','خطوط الأنابيب وممراتها','Pipelines & Pipeline Corridors','تأمين خطوط الأنابيب والممرات: المراقبة، الدوريات، محطات الضخ والعزل، كشف الاعتداءات.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',17),
('SEC-18','SEC','محطات التحويل الكهربائية','Electrical Power Substations','الحماية الأمنية لمحطات التحويل حسب الجهد والأهمية التشغيلية — التوجيه الأكثر صلة بقطاع المرافق الكهربائية.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',18),
('SEC-19','SEC','أمن المدن الصناعية','Security for Industrial Cities','الإطار الأمني للمدن الصناعية متعددة المشغّلين والمسؤوليات المشتركة بين إدارة المدينة والمنشآت.','إصدار أولي 2016 ثم أُدمج في إصدار 2017',19),
('SEC-RC','SEC','المجمعات السكنية التابعة للمنشآت الصناعية','Residential Compounds for Industrial Facilities','توجيه مكمّل ضمن حزمة 2016–2017 لتأمين المجمعات السكنية التابعة للمنشآت الخاضعة. يُتحقق من رقمه الرسمي في النسخة الصادرة عن الهيئة.','رمز داخلي مؤقت حتى التحقق من الترقيم الرسمي',20),
('SAF-GEN','SAF','توجيهات السلامة والحماية من الحريق — نظرة عامة','Safety & Fire Protection Directives — Overview','سلسلة تكميلية تغطي: المتطلبات العامة وتصنيف المخاطر، أنظمة مياه الإطفاء (شبكات ومضخات وخزانات)، الكشف والإنذار وأنظمة الإطفاء الثابتة، مسافات الأمان والفصل، تخزين ومناولة المواد الخطرة، خطط الطوارئ وفرق الإطفاء الصناعية، ومتطلبات المباني ومخارج الطوارئ. القائمة الرقمية الكاملة تُستمد من النسخة الرسمية.',null,21)
on conflict (code) do update set
  category = excluded.category, name_ar = excluded.name_ar, name_en = excluded.name_en,
  scope_ar = excluded.scope_ar, issue_note_ar = excluded.issue_note_ar,
  sort_order = excluded.sort_order, updated_at = now();

-- ----------------------------------------------------------------------------
-- 4) القطاعات الخاضعة للإشراف | Regulated sectors
-- ----------------------------------------------------------------------------

insert into public.hcis_sectors (id, name_ar, name_en, is_primary) values
(1,'الكهرباء — التوليد والنقل والتوزيع','Electricity — Generation, Transmission & Distribution', true),
(2,'البترول','Petroleum', false),
(3,'البتروكيماويات','Petrochemicals', false),
(4,'الغاز','Gas', false),
(5,'المياه والتحلية','Water & Desalination', false),
(6,'الاتصالات','Telecommunications', false),
(7,'التعدين','Mining', false),
(8,'الصناعات الكيميائية','Chemical Manufacturing', false),
(9,'المتفجرات المدنية','Civil Explosives', false),
(10,'الصناعات المعدنية','Metal Industries', false),
(11,'الموانئ والواجهات البحرية الصناعية','Industrial Ports & Marine Interfaces', false),
(12,'السكك الحديدية','Railways', false),
(13,'الخدمات الصناعية والمدن الصناعية','Industrial Services & Industrial Cities', false)
on conflict (id) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, is_primary = excluded.is_primary;

-- ----------------------------------------------------------------------------
-- 5) دورة الاعتماد المرحلية | Approval lifecycle
-- ----------------------------------------------------------------------------

insert into public.hcis_approval_stages (stage_no, name_ar, name_en, description_ar) values
(1,'تصنيف المنشأة وتقييم الثغرات الأمنية','Facility Classification & SVA','يُعِدّ استشاري أمني معتمد من الهيئة تقييم الثغرات الأمنية بمنهجية API، ويُرفع التصنيف والتقييم للهيئة للاعتماد قبل أي تصميم أو تنفيذ.'),
(2,'التصميم المفاهيمي 10%','Concept of Design (10%)','اعتماد الهيئة على المفهوم العام للحماية.'),
(3,'التصميم الهندسي الأولي 30%','FEED (30%)','اعتماد الهيئة على الحلول الهندسية الأساسية.'),
(4,'التصميم التفصيلي 60%','Detail Design (60%)','اعتماد أول على التفاصيل التنفيذية.'),
(5,'التصميم التفصيلي 90%','Detail Design (90%)','اعتماد ثانٍ قبيل الإصدار النهائي.'),
(6,'الإصدار للتنفيذ 100%','Issued for Construction (IFC)','الوثائق النهائية المعتمدة للتنفيذ.'),
(7,'اختبارات القبول','FAT / SAT','اختبار القبول المصنعي ثم الموقعي، مع التأهيل المسبق لمتكامل الأنظمة الأمنية عبر عملية اعتماد الهيئة.')
on conflict (stage_no) do update set
  name_ar = excluded.name_ar, name_en = excluded.name_en, description_ar = excluded.description_ar;

-- ----------------------------------------------------------------------------
-- 6) مصفوفة الامتثال الابتدائية | Compliance matrix bootstrap
--    (SEC-01→19 × المناطق الأربع) — حالة "لم يُقيَّم" وموسومة محاكاة
-- ----------------------------------------------------------------------------

insert into public.hcis_compliance_status (directive_code, region_code, status, priority, is_simulation)
select d.code, r.region_code, 'not_assessed',
       case when d.code in ('SEC-01','SEC-05','SEC-13','SEC-16','SEC-18') then 'critical' else 'medium' end,
       true
from public.hcis_directives d
cross join (values ('central'),('western'),('eastern'),('southern')) as r(region_code)
where d.category = 'SEC' and d.code <> 'SEC-RC'
on conflict (directive_code, region_code) do nothing;

-- ----------------------------------------------------------------------------
-- 7) قاعدة معرفة ARIA (RAG) — مُكيَّفة لمخطّط aria_knowledge القائم
--    (title, source, content, tags, org_id) — المتجهات تُولَّد لاحقًا.
--    idempotent: نحذف صفوف HCIS السابقة بحسب source ثم نُدرج من جديد.
-- ----------------------------------------------------------------------------

delete from public.aria_knowledge where source like 'hcis/%';

insert into public.aria_knowledge (title, source, content, tags, org_id)
select * from (values
  ('الهيئة العليا للأمن الصناعي — تعريف | HCIS Overview','hcis/overview',
   'الهيئة العليا للأمن الصناعي (HCIS) هي الجهة التنظيمية الوطنية بوزارة الداخلية المسؤولة عن متطلبات الأمن والسلامة والحماية من الحريق في المنشآت الصناعية والبنية التحتية الحيوية على مستوى المملكة. الامتثال لتوجيهاتها شرط قانوني، وموافقاتها شرط أساسي لتشغيل المنشأة، وعدم الامتثال قد يؤخّر التشغيل. تأسست بموجب الأمر السامي رقم 439/8 وتاريخ 27/2/1397هـ برئاسة وزير الداخلية، وصدر تنظيمها بقرار مجلس الوزراء رقم 707 وتاريخ 27/12/1443هـ (26 يوليو 2022م).',
   array['hcis','تعريف','أساس نظامي','وزارة الداخلية'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('القطاعات الخاضعة لإشراف الهيئة | Regulated Sectors','hcis/sectors',
   'تشرف الهيئة على القطاعات الاستراتيجية للمنشآت البترولية والصناعية والخدمية في متطلبات الأمن والسلامة والحماية من الحريق، وتشمل: الكهرباء (توليد ونقل وتوزيع)، البترول، البتروكيماويات، الغاز، المياه والتحلية، الاتصالات، التعدين، الصناعات الكيميائية، المتفجرات المدنية، الصناعات المعدنية، الموانئ والواجهات البحرية الصناعية، السكك الحديدية، والخدمات الصناعية والمدن الصناعية. قطاع التطبيق الأساسي في نكسيوس هو الكهرباء والمرافق عبر الإدارات الإقليمية الأربع.',
   array['قطاعات','كهرباء','مرافق'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('هيكل التوجيهات الأمنية SEC-01 إلى SEC-19 | SEC Structure','hcis/sec-structure',
   'التوجيهات الأمنية للمنشآت الصناعية (إصدار 2017، نسخة 2.0): SEC-01 المتطلبات العامة، SEC-02 الأسوار، SEC-03 البوابات، SEC-04 الإنارة، SEC-05 الأنظمة المتكاملة، SEC-06 الأجهزة الأمنية، SEC-07 التغذية الكهربائية، SEC-08 الاتصالات وشبكات البيانات، SEC-09 المباني الحاضنة، SEC-10 السكك الحديدية، SEC-11 التحقق من الهوية، SEC-12 بطاقات التعريف، SEC-13 الأمن السيبراني، SEC-14 الواجهة البحرية، SEC-15 إدارة المشاريع، SEC-16 العمليات الأمنية، SEC-17 خطوط الأنابيب، SEC-18 محطات التحويل، SEC-19 أمن المدن الصناعية، إضافة إلى توجيه المجمعات السكنية.',
   array['sec','توجيهات','هيكل'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('المبادئ الحاكمة في SEC-01 | SEC-01 Principles','hcis/sec-01',
   'أبرز مبادئ SEC-01: (1) للهيئة حق تعديل التوجيهات دون إشعار مسبق فيجب اعتماد أحدث نسخة رسمية. (2) تختلف حرجية المنشأة بحسب المنتج أو الخدمة. (3) للهيئة الصلاحية المطلقة في التصنيف ومستوى الحماية. (4) أعمال التصميم الأمني تُنفَّذ حصرًا عبر استشاريين معتمدين من الهيئة. (5) يُعدّ المشغّل تقييم ثغرات SVA بمنهجية API ويرفعه مع التصنيف للاعتماد قبل أي تصميم أو تنفيذ.',
   array['sec-01','تصنيف','sva','استشاري معتمد'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('SEC-18 محطات التحويل الكهربائية | SEC-18 Substations','hcis/sec-18',
   'SEC-18 هو الأكثر صلة بقطاع المرافق الكهربائية: يحدد متطلبات حماية محطات التحويل بحسب مستوى الجهد والأهمية التشغيلية، ويُقرأ بالتكامل مع SEC-02..SEC-08 (الأسوار، البوابات، الإنارة، الأنظمة المتكاملة، الأجهزة، التغذية، الاتصالات) وSEC-16 للعمليات اليومية.',
   array['sec-18','محطات تحويل','كهرباء','مرافق'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('SEC-13 الأمن السيبراني الصناعي | SEC-13 Cyber','hcis/sec-13',
   'يغطي SEC-13 حماية أنظمة التحكم الصناعي ICS/OT والأنظمة الأمنية من التهديدات السيبرانية، ويشمل فصل الشبكات وإدارة الثغرات. يُطبَّق بالتكامل مع متطلبات الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية PDPL.',
   array['sec-13','أمن سيبراني','ot','ics','pdpl'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('توجيهات السلامة والحماية من الحريق SAF | SAF Overview','hcis/saf',
   'سلسلة SAF تكمل التوجيهات الأمنية وتغطي: المتطلبات العامة وتصنيف المخاطر، أنظمة مياه الإطفاء (شبكات ومضخات وخزانات ومعدلات تدفق)، الكشف والإنذار والإطفاء الثابت (رغوة وغازات ورشاشات)، مسافات الأمان والفصل، تخزين ومناولة المواد الخطرة، خطط الطوارئ وفرق الإطفاء الصناعية، ومتطلبات المباني ومخارج الطوارئ. القائمة الكاملة تُستمد من النسخة الرسمية.',
   array['saf','سلامة','حريق','طوارئ'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('دورة اعتماد HCIS المرحلية | HCIS Approval Lifecycle','hcis/approval',
   'تمر مشاريع الأنظمة الأمنية بدورة اعتماد إلزامية: (1) تصنيف المنشأة وتقييم الثغرات SVA بمنهجية API عبر استشاري معتمد ثم اعتماد الهيئة، (2) التصميم المفاهيمي 10%، (3) FEED 30%، (4) التفصيلي 60%، (5) التفصيلي 90%، (6) الإصدار للتنفيذ IFC 100%، (7) اختبارات القبول FAT/SAT مع التأهيل المسبق للمتكامل. كل مرحلة تتطلب اعتماد الهيئة قبل الانتقال للتالية.',
   array['اعتماد','sva','feed','ifc','fat','sat'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('المصادر الرسمية للهيئة | Official Sources','hcis/sources',
   'القنوات الرسمية: بوابة الهيئة hcis.gov.sa (النسخ الرسمية تُصرف للمنشآت والاستشاريين المعتمدين)، مركز الوثائق laws.boe.gov.sa (نص تنظيم الهيئة)، وزارة الداخلية moi.gov.sa، منصة استطلاع istitlaa.ncc.gov.sa. قاعدة صارمة: لا تُعتمد النسخ المتداولة من مصادر غير رسمية في أي عرض أو تصميم أو مستند امتثال.',
   array['مصادر','رسمي','hcis.gov.sa'],'00000000-0000-0000-0000-000000000001'::uuid),
  ('سياسة ARIA في إجابات HCIS | ARIA HCIS Policy','hcis/aria-policy',
   'عند الإجابة عن أسئلة HCIS تلتزم ARIA بما يلي: (1) الإجابة المرجعية عن هيكل التوجيهات ونطاقها ودورة الاعتماد. (2) عدم اقتباس نصوص حرفية من التوجيهات الرسمية أو ادعاء امتلاك النسخ الكاملة؛ وتوجيه المستخدم للقنوات الرسمية أو الاستشاري المعتمد. (3) عرض بيانات الامتثال مع التصريح بأنها محاكاة عندما is_simulation=true. (4) أي بلاغ طوارئ أو إجراء إنتاجي يمر عبر تأكيد بشري إلزامي. (5) تنويه: هذه القاعدة مرجع داخلي وليست بديلًا عن النصوص الرسمية، والهيئة تعدّل توجيهاتها دون إشعار مسبق.',
   array['aria','سياسة','حوكمة','محاكاة'],'00000000-0000-0000-0000-000000000001'::uuid)
) as v(title, source, content, tags, org_id)
on conflict do nothing;

commit;
