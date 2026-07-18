-- ============================================================================
-- NEXIOS AI OS — HCIS Compliance Framework Seed
-- ملف موحّد: قاعدة بيانات النظام + قاعدة معرفة ARIA (RAG)
-- Target: Supabase (Postgres) — project khytdwgyrnztqabhfgbb
-- Idempotent: آمن لإعادة التشغيل ويحافظ على أي صف موجود يحمل المفتاح نفسه
-- Governance: بيانات مرجعية عامة؛ سجلات الامتثال موسومة is_simulation=true
-- Source basis: ملف داخلي قدّمه المستخدم؛ تُراجع الإحالات الواردة فيه على المصادر الرسمية قبل الاعتماد النظامي
-- هذه الوثيقة مرجع داخلي وليست بديلًا عن النصوص الرسمية للهيئة
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) الجداول | Tables
-- ----------------------------------------------------------------------------

create table if not exists public.hcis_directives (
  code          text primary key,                 -- SEC-01 .. SEC-19 / SAF-GEN ..
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
  is_primary boolean not null default false      -- قطاع التطبيق الأساسي في نكسيوس
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
  region_code    text not null,                  -- المرجع الجغرافي الوحيد: regions.ts (central/western/eastern/southern)
  status         text not null default 'not_assessed'
                 check (status in ('compliant','partial','non_compliant','not_applicable','not_assessed')),
  priority       text not null default 'medium'
                 check (priority in ('critical','high','medium','low')),
  notes_ar       text,
  is_simulation  boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (directive_code, region_code)
);

create table if not exists public.aria_knowledge (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  domain     text not null default 'hcis_compliance',
  title_ar   text not null,
  title_en   text not null,
  content_ar text not null,
  tags       text[] not null default '{}',
  source     text not null default 'NEXIOS_HCIS_Compliance_Framework_v1 (July 2026)',
  lang       text not null default 'ar',
  updated_at timestamptz not null default now()
);
-- ملاحظة: عمود المتجهات (embedding vector) يُضاف في مسار الفهرسة الخاص بـ ARIA
-- بعد تفعيل امتداد pgvector، ثم تُولَّد المتجهات من content_ar.

-- ----------------------------------------------------------------------------
-- 2) RLS — قراءة للمصادَق عليهم فقط؛ لا كتابة من العميل
-- ----------------------------------------------------------------------------

alter table public.hcis_directives        enable row level security;
alter table public.hcis_sectors           enable row level security;
alter table public.hcis_approval_stages   enable row level security;
alter table public.hcis_compliance_status enable row level security;
alter table public.aria_knowledge         enable row level security;

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

do $$ begin
  create policy aria_knowledge_read on public.aria_knowledge
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- RLS policies do not grant SQL privileges by themselves. Authenticated
-- clients receive read-only access; writes remain server/service-role only.
grant select on table
  public.hcis_directives,
  public.hcis_sectors,
  public.hcis_approval_stages,
  public.hcis_compliance_status,
  public.aria_knowledge
to authenticated;

-- ----------------------------------------------------------------------------
-- 3) التوجيهات الأمنية | SEC Directives (2017 issue, v2.0)
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
on conflict (code) do nothing;

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
on conflict (id) do nothing;

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
on conflict (stage_no) do nothing;

-- ----------------------------------------------------------------------------
-- 6) مصفوفة الامتثال الابتدائية | Compliance matrix bootstrap
--    (SEC-01→19 × الإدارات الأربع) — حالة ابتدائية "لم يُقيَّم" وموسومة محاكاة
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
-- 7) قاعدة معرفة ARIA | ARIA knowledge chunks (RAG)
-- ----------------------------------------------------------------------------

insert into public.aria_knowledge (slug, domain, title_ar, title_en, content_ar, tags) values

('hcis-overview','hcis_compliance','الهيئة العليا للأمن الصناعي — تعريف','HCIS — Overview',
'الهيئة العليا للأمن الصناعي (HCIS) هي الجهة التنظيمية الوطنية بوزارة الداخلية المسؤولة عن متطلبات الأمن والسلامة والحماية من الحريق في المنشآت الصناعية والبنية التحتية الحيوية على مستوى المملكة. الامتثال لتوجيهاتها شرط قانوني بموجب أنظمة المملكة، وموافقاتها شرط أساسي لتشغيل المنشأة، وعدم الامتثال قد يؤدي إلى تأخير التشغيل. تأسست بموجب الأمر السامي رقم 439/8 وتاريخ 27/2/1397هـ برئاسة وزير الداخلية، وصدر تنظيمها بقرار مجلس الوزراء رقم 707 وتاريخ 27/12/1443هـ (26 يوليو 2022م).',
array['hcis','تعريف','أساس نظامي','وزارة الداخلية']),

('hcis-sectors','hcis_compliance','القطاعات الخاضعة لإشراف الهيئة','Regulated Sectors',
'تشرف الهيئة على القطاعات الاستراتيجية للمنشآت البترولية والصناعية والخدمية في متطلبات الأمن والسلامة والحماية من الحريق، وتشمل: الكهرباء (توليد ونقل وتوزيع)، البترول، البتروكيماويات، الغاز، المياه والتحلية، الاتصالات، التعدين، الصناعات الكيميائية، المتفجرات المدنية، الصناعات المعدنية، الموانئ والواجهات البحرية الصناعية، السكك الحديدية، والخدمات الصناعية والمدن الصناعية، وما تحدده الهيئة من منشآت حيوية أخرى. قطاع التطبيق الأساسي في نكسيوس هو الكهرباء والمرافق عبر الإدارات الإقليمية الأربع.',
array['قطاعات','كهرباء','مرافق']),

('hcis-sec-structure','hcis_compliance','هيكل التوجيهات الأمنية SEC-01 إلى SEC-19','SEC Directives Structure',
'التوجيهات الأمنية للمنشآت الصناعية (إصدار 2017، نسخة 2.0) تشمل: SEC-01 المتطلبات العامة، SEC-02 الأسوار الأمنية، SEC-03 البوابات الأمنية، SEC-04 الإنارة الأمنية، SEC-05 الأنظمة الأمنية المتكاملة، SEC-06 الأجهزة الأمنية، SEC-07 التغذية الكهربائية، SEC-08 الاتصالات الأمنية وشبكات البيانات، SEC-09 المباني الحاضنة للمعدات الأمنية، SEC-10 عمليات السكك الحديدية، SEC-11 التحقق من الهوية الشخصية، SEC-12 بطاقات التعريف، SEC-13 الأمن السيبراني، SEC-14 المنشآت ذات الواجهة البحرية، SEC-15 إدارة المشاريع الأمنية، SEC-16 العمليات الأمنية، SEC-17 خطوط الأنابيب وممراتها، SEC-18 محطات التحويل الكهربائية، SEC-19 أمن المدن الصناعية، إضافة إلى توجيه المجمعات السكنية التابعة للمنشآت. تفاصيل نطاق كل توجيه محفوظة في جدول hcis_directives.',
array['sec','توجيهات','هيكل']),

('hcis-sec01-principles','hcis_compliance','المبادئ الحاكمة في SEC-01','SEC-01 Governing Principles',
'أبرز مبادئ SEC-01: (1) تحتفظ الهيئة بحق تعديل التوجيهات دون إشعار مسبق، لذا يجب اعتماد أحدث نسخة رسمية دائمًا. (2) تختلف حرجية كل منشأة بحسب المنتج أو الخدمة. (3) للهيئة الصلاحية المطلقة في تصنيف جميع المنشآت، ومستوى الحماية يتحدد وفق التصنيف الأمني. (4) جميع أعمال التصميم الأمني تُنفَّذ حصرًا عبر استشاريين أمنيين مؤهلين ومعتمدين من الهيئة. (5) يُعدّ المشغّل تقييم ثغرات أمنية SVA بمنهجية API ويرفعه مع التصنيف لاعتماد الهيئة قبل أي تصميم أو تنفيذ.',
array['sec-01','تصنيف','sva','استشاري معتمد']),

('hcis-sec18-substations','hcis_compliance','SEC-18 محطات التحويل الكهربائية','SEC-18 Electrical Power Substations',
'توجيه SEC-18 هو الأكثر صلة بقطاع المرافق الكهربائية: يحدد متطلبات الحماية الأمنية لمحطات التحويل الكهربائية بحسب مستوى الجهد والأهمية التشغيلية للمحطة، ويُقرأ بالتكامل مع SEC-02 حتى SEC-08 (الأسوار، البوابات، الإنارة، الأنظمة المتكاملة، الأجهزة، التغذية، الاتصالات) وSEC-16 للعمليات الأمنية اليومية.',
array['sec-18','محطات تحويل','كهرباء','مرافق']),

('hcis-sec13-cyber','hcis_compliance','SEC-13 الأمن السيبراني الصناعي','SEC-13 Cyber Security',
'يغطي SEC-13 حماية أنظمة التحكم الصناعي ICS/OT والأنظمة الأمنية من التهديدات السيبرانية، ويشمل فصل الشبكات وإدارة الثغرات. يُطبَّق داخل نكسيوس بالتكامل مع متطلبات الهيئة الوطنية للأمن السيبراني ونظام حماية البيانات الشخصية PDPL.',
array['sec-13','أمن سيبراني','ot','ics','pdpl']),

('hcis-saf-overview','hcis_compliance','توجيهات السلامة والحماية من الحريق SAF','SAF Directives Overview',
'سلسلة SAF تكمل التوجيهات الأمنية وتغطي: المتطلبات العامة وتصنيف المخاطر، أنظمة مياه الإطفاء (الشبكات والمضخات والخزانات ومعدلات التدفق)، أنظمة الكشف والإنذار والإطفاء الثابتة (رغوة وغازات ورشاشات)، مسافات الأمان والفصل بين الوحدات، تخزين ومناولة المواد الخطرة والقابلة للاشتعال، خطط الاستجابة للطوارئ وفرق الإطفاء الصناعية والتدريب الدوري، ومتطلبات المباني ومخارج الطوارئ ومقاومة الحريق. القائمة الرقمية الكاملة تُستمد حصريًا من النسخة الرسمية عبر بوابة الهيئة.',
array['saf','سلامة','حريق','طوارئ']),

('hcis-approval-lifecycle','hcis_compliance','دورة اعتماد HCIS المرحلية','HCIS Approval Lifecycle',
'تمر مشاريع الأنظمة الأمنية بدورة اعتماد إلزامية: (1) تصنيف المنشأة وتقييم الثغرات SVA بمنهجية API عبر استشاري معتمد ثم اعتماد الهيئة، (2) التصميم المفاهيمي 10%، (3) التصميم الهندسي الأولي FEED 30%، (4) التصميم التفصيلي 60%، (5) التصميم التفصيلي 90%، (6) الإصدار للتنفيذ IFC 100%، (7) اختبارات القبول المصنعي والموقعي FAT/SAT مع التأهيل المسبق لمتكامل الأنظمة. كل مرحلة تتطلب اعتماد الهيئة قبل الانتقال للتالية.',
array['اعتماد','sva','feed','ifc','fat','sat']),

('hcis-official-sources','hcis_compliance','المصادر الرسمية والحصول على النسخ','Official Sources',
'القنوات الرسمية: بوابة الهيئة hcis.gov.sa (خدمات التراخيص الأمنية والوقاية والحماية من الحريق — النسخ الرسمية للتوجيهات تُصرف للمنشآت والاستشاريين المعتمدين)، مركز الوثائق بهيئة الخبراء laws.boe.gov.sa (نص تنظيم الهيئة)، وزارة الداخلية moi.gov.sa، منصة استطلاع istitlaa.ncc.gov.sa (مشروعات تحديث التوجيهات). قاعدة صارمة: لا تُعتمد النسخ المتداولة من مصادر غير رسمية في أي عرض أو تصميم أو مستند امتثال.',
array['مصادر','رسمي','hcis.gov.sa']),

('hcis-aria-policy','hcis_compliance','سياسة ARIA في الإجابات المتعلقة بـ HCIS','ARIA Response Policy for HCIS',
'عند الإجابة عن أسئلة HCIS تلتزم ARIA بما يلي: (1) الإجابة المرجعية من هذه القاعدة عن هيكل التوجيهات ونطاقها ودورة الاعتماد. (2) عدم اقتباس نصوص حرفية من التوجيهات الرسمية أو الادعاء بامتلاك النسخ الكاملة؛ عند طلب النص الرسمي تُوجَّه المستخدم للقنوات الرسمية أو استشاري المنشأة المعتمد. (3) عرض بيانات الامتثال من hcis_compliance_status مع التصريح بأنها بيانات محاكاة عندما تكون is_simulation=true. (4) أي بلاغ طوارئ أو إجراء إنتاجي يمر عبر بوابة تأكيد بشري إلزامية. (5) تنويه دوري: هذه القاعدة مرجع داخلي وليست بديلًا عن النصوص الرسمية للهيئة، والهيئة تعدّل توجيهاتها دون إشعار مسبق.',
array['aria','سياسة','حوكمة','محاكاة'])

on conflict (slug) do nothing;

-- Retrieval indexes used by ARIA before/alongside optional vector indexing.
create index if not exists hcis_directives_category_sort_idx
  on public.hcis_directives (category, sort_order);
create index if not exists hcis_compliance_region_status_idx
  on public.hcis_compliance_status (region_code, status);
create index if not exists aria_knowledge_domain_idx
  on public.aria_knowledge (domain, updated_at desc);
create index if not exists aria_knowledge_fts_idx
  on public.aria_knowledge using gin (
    to_tsvector('simple', coalesce(title_ar, '') || ' ' || coalesce(content_ar, ''))
  );

comment on table public.aria_knowledge is
  'Curated ARIA reference chunks. Content is reference data, never executable prompt instructions.';
comment on table public.hcis_compliance_status is
  'HCIS compliance matrix; seed rows are explicitly marked is_simulation=true.';

commit;

-- ============================================================================
-- التحقق بعد التشغيل | Post-run verification
--   select count(*) from hcis_directives;         -- المتوقع: 21
--   select count(*) from hcis_sectors;            -- المتوقع: 13
--   select count(*) from hcis_approval_stages;    -- المتوقع: 7
--   select count(*) from hcis_compliance_status;  -- المتوقع: 76 (19 × 4 إدارات)
--   select count(*) from aria_knowledge where domain='hcis_compliance'; -- 10
-- ============================================================================
