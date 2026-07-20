-- ============================================================================
-- Smart command center fuel — agents council, approval pipeline, urgent/SLA
-- board. Seeds the REAL tables the center reads (intelligence_agents,
-- evolution_proposals, aria_improvement_proposals, urgent_tasks,
-- support_requests) so a live database feeds every zone from actual rows.
-- Idempotent (NOT EXISTS guards on stable Arabic titles); board/log data
-- only — no configuration tables are opened (constitution art. 6).
-- ============================================================================

-- Open showcase read on the five BOARD tables (anon + authenticated).
do $$
declare t text;
begin
  foreach t in array array[
    'intelligence_agents','evolution_proposals','aria_improvement_proposals',
    'urgent_tasks','support_requests'
  ] loop
    begin
      execute format('grant select on public.%I to anon, authenticated', t);
      execute format('drop policy if exists "%s_select_showcase" on public.%I', t, t);
      execute format(
        'create policy "%s_select_showcase" on public.%I for select to anon, authenticated using (true)',
        t, t
      );
    exception when undefined_table then null;
    end;
  end loop;
end $$;

-- Widen the status vocabularies FIRST so the seeds below satisfy the
-- CHECK constraints from 20260706092116 (which allowed only
-- active/standby and proposed/approved/rejected/applied). Idempotent:
-- drop-if-exists then re-add with the full lifecycle. Board tables only.
alter table public.intelligence_agents
  drop constraint if exists intelligence_agents_status_check;
alter table public.intelligence_agents
  add constraint intelligence_agents_status_check
  check (status in ('active','standby','processing','idle'));

alter table public.evolution_proposals
  drop constraint if exists evolution_proposals_status_check;
alter table public.evolution_proposals
  add constraint evolution_proposals_status_check
  check (status in ('proposed','prepared','approved','rejected','applied'));

-- 1) Agents council — eight executive agents.
insert into public.intelligence_agents (name_ar, name_en, role, focus_area, status)
select a.name_ar, a.name_en, a.role, a.focus, a.status
from (values
  ('آريا التنفيذية','ARIA Executive','التنسيق العام','توليد موجز القيادة الصباحي','active'),
  ('وكيل الامتثال HCIS','HCIS Compliance Agent','الامتثال','تدقيق SEC-18 لمحطات التحويل','processing'),
  ('وكيل الصيانة','Maintenance Agent','الصيانة','جدولة أوامر العمل الوقائية','active'),
  ('وكيل التقارير','Reporting Agent','التقارير','إعداد تقرير العمليات اليومي','processing'),
  ('وكيل الرصد','Monitoring Agent','المراقبة','تتبع 142 كاميرا عبر الإدارات','active'),
  ('وكيل التصاريح','PTW Agent','PTW','مطابقة تصاريح العمل السارية','active'),
  ('وكيل الطوارئ','Emergency Agent','الاستجابة','جاهزية الاستجابة الفورية','idle'),
  ('وكيل المخاطر','Risk Agent','التنبؤ','تحليل نمط إنذارات المحيط','processing')
) as a(name_ar, name_en, role, focus, status)
where not exists (
  select 1 from public.intelligence_agents x where x.name_ar = a.name_ar
);

-- 2) Approval pipeline — evolution proposals across the three stages.
insert into public.evolution_proposals (title_ar, title_en, description_ar, priority, status)
select p.title_ar, p.title_en, p.desc_ar, p.priority, p.status
from (values
  ('جدولة صيانة وقائية لمحطة 132 ك.ف','Schedule 132kV preventive maintenance','مقترح من وكيل الصيانة وفق منحنى الأعطال — صف محاكاة مرجعية is_simulation=true','medium','proposed'),
  ('تعليق تصريح عمل ساخن — رياح نشطة','Suspend hot-work permit — high wind','مقترح من وكيل التصاريح بناءً على قراءات الطقس — صف محاكاة مرجعية is_simulation=true','high','prepared'),
  ('إصدار التقرير الأسبوعي للقيادة','Issue weekly leadership report','جاهز للتوليد والاعتماد — صف محاكاة مرجعية is_simulation=true','medium','prepared'),
  ('رفع تصنيف إنذار المحيط الشرقي','Raise eastern perimeter alert level','نمط إنذارات متكرر خلال 48 ساعة — صف محاكاة مرجعية is_simulation=true','critical','proposed')
) as p(title_ar, title_en, desc_ar, priority, status)
where not exists (
  select 1 from public.evolution_proposals x where x.title_ar = p.title_ar
);

-- 3) ARIA proposals feeding the same line.
insert into public.aria_improvement_proposals (area, proposal_ar, impact, status)
select p.area, p.proposal_ar, p.impact, p.status
from (values
  ('الرصد','تعزيز دورية القطاع الجنوبي بعد ارتفاع أحداث البوابات مساءً.','عالٍ','مقترح'),
  ('الأرشفة','أرشفة بلاغات الأسبوع المغلقة وتوليد خلاصة درسها.','متوسط','معتمد'),
  ('الامتثال','تحديث قائمة تفتيش SEC-18 وفق آخر جولة تدقيق.','متوسط','معتمد')
) as p(area, proposal_ar, impact, status)
where not exists (
  select 1 from public.aria_improvement_proposals x where x.proposal_ar = p.proposal_ar
);

-- 4) Urgent/SLA board — nine items: one overdue (critical), two nearing.
insert into public.urgent_tasks (title_ar, department, priority, status, owner_name, due_at, sla_hours, is_simulation)
select t.title_ar, t.department, t.priority, t.status, t.owner_name,
       now() + (t.due_h || ' hours')::interval, t.sla, true
from (values
  ('استعادة كاميرات القطاع الشرقي','غرفة التحكم','عاجل جدًا','قيد المعالجة','فريق الصيانة التقنية','-2.4',24),
  ('تجديد تصريح عمل حرج ينتهي اليوم','الأمن الصناعي','عاجل جدًا','قيد المعالجة','أ. عبدالله السبيعي','2.5',24),
  ('اعتماد خطة وردية الغد','العمليات','عاجل','جديد','قائد الوردية','3.4',12),
  ('فحص مستشعر اهتزاز متقطع','الصيانة','عاجل','قيد المعالجة','الوحدة التقنية','9',48),
  ('تحديث بيانات مقاول العزل','العقود','متابعة','جديد','إدارة العقود','16',72),
  ('مراجعة تقرير مناورة الإخلاء','السلامة','متابعة','جديد','وحدة التقارير','30',96),
  ('تدقيق سجل زوار الأسبوع','أمن البوابات','متابعة','جديد','ضابط الامتثال','41',96),
  ('معايرة بوابة الشحن الذكية','الصيانة','متابعة','جديد','فريق الأنظمة','55',120),
  ('تحضير عرض الجاهزية الشهري','مكتب القيادة','متابعة','جديد','أ. لمى الشهراني','88',168)
) as t(title_ar, department, priority, status, owner_name, due_h, sla)
where not exists (
  select 1 from public.urgent_tasks x where x.title_ar = t.title_ar
);

-- 5) Support queue depth for the counter.
insert into public.support_requests (requester, topic_ar, channel, status, assigned_to, is_simulation)
select r.requester, r.topic_ar, r.channel, r.status, r.assigned_to, true
from (values
  ('قائد وردية البوابة الشرقية','دعم فني — قارئ البطاقات متوقف','ميداني','مفتوح',null),
  ('غرفة العمليات','تخصيص مراقب إضافي لشاشات CCTV','داخلي','مفتوح','مركز خدمة تقنية المعلومات'),
  ('مكتب المدير التنفيذي','تجهيز عرض الجاهزية لزيارة الغد','تنفيذي','قيد المعالجة','أ. لمى الشهراني'),
  ('فريق الصيانة','صلاحية وصول مؤقتة للمحطة الشرقية','ميداني','مفتوح',null)
) as r(requester, topic_ar, channel, status, assigned_to)
where not exists (
  select 1 from public.support_requests x where x.topic_ar = r.topic_ar
);
