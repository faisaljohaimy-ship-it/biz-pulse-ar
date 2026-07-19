-- ============================================================================
-- NEXIOS AI OS — HCIS Compliance Framework: tables + seed + read policies
--
-- ROOT-CAUSE CONTEXT (/hcis "تعذّر تحميل بيانات الامتثال"):
-- The four framework tables were seeded MANUALLY in one Supabase project
-- (khytdwgyrnztqabhfgbb) while the deployed bundle can be built against a
-- different connected project (supabase/config.toml → jhutlofapjfjjeajawie,
-- the same ref found baked into the stale .vercel build artifacts). A client
-- pointed at a project without these tables gets a PostgREST "relation does
-- not exist" error on every query → the page's permanent error card.
--
-- This migration makes the framework SELF-MATERIALIZING: whichever project
-- the deployment's migrations run against gets the exact approved schema,
-- the reference seed and the anon/authenticated read policies. It is fully
-- idempotent (create if not exists + upsert + guarded policies) and changes
-- nothing where the framework already exists with data.
--
-- Governance: reference data is public information (hcis.gov.sa et al.);
-- compliance rows are bootstrapped as not_assessed and is_simulation=true.
-- aria_knowledge is deliberately NOT touched here (protected, auth-only,
-- and its live schema is managed elsewhere).
-- ============================================================================

begin;

-- 1) Tables — the approved schema, verbatim ----------------------------------

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

-- 2) RLS + read policies (anon = public demo pages, authenticated = app) -----

alter table public.hcis_directives        enable row level security;
alter table public.hcis_sectors           enable row level security;
alter table public.hcis_approval_stages   enable row level security;
alter table public.hcis_compliance_status enable row level security;

grant select on public.hcis_directives,
                public.hcis_sectors,
                public.hcis_approval_stages,
                public.hcis_compliance_status
  to anon, authenticated;

do $$ begin
  create policy hcis_directives_read on public.hcis_directives
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_directives_read_anon on public.hcis_directives
    for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_sectors_read on public.hcis_sectors
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_sectors_read_anon on public.hcis_sectors
    for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_stages_read on public.hcis_approval_stages
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_stages_read_anon on public.hcis_approval_stages
    for select to anon using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_compliance_read on public.hcis_compliance_status
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy hcis_compliance_read_anon on public.hcis_compliance_status
    for select to anon using (true);
exception when duplicate_object then null; end $$;

-- 3) SEC directive series (2017 issue, v2.0) ---------------------------------

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

-- 4) Regulated sectors --------------------------------------------------------

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

-- 5) Approval lifecycle -------------------------------------------------------

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

-- 6) Compliance matrix bootstrap (SEC-01→19 × four regions, simulation) ------

insert into public.hcis_compliance_status (directive_code, region_code, status, priority, is_simulation)
select d.code, r.region_code, 'not_assessed',
       case when d.code in ('SEC-01','SEC-05','SEC-13','SEC-16','SEC-18') then 'critical' else 'medium' end,
       true
from public.hcis_directives d
cross join (values ('central'),('western'),('eastern'),('southern')) as r(region_code)
where d.category = 'SEC' and d.code <> 'SEC-RC'
on conflict (directive_code, region_code) do nothing;

commit;
