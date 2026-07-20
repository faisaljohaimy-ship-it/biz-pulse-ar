-- ============================================================================
-- NEXIOS showcase expansion seed — digital twin, knowledge repository,
-- report registry fuel, and open showcase read policies.
--
-- Doctrine (NEXIOS_CONSTITUTION.md art. 6): idempotent, additive only, every
-- seeded row is reference-simulation data. Fixed UUIDs + unique codes make
-- re-runs no-ops (ON CONFLICT DO NOTHING). Anon read is limited to showcase
-- tables; writes stay behind authenticated/admin policies untouched here.
-- ============================================================================

-- ── 1) Open showcase read policies (anon + authenticated) ───────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'sec_knowledge_categories','sec_knowledge_articles',
    'sec_sections','sec_circles','sec_buildings','sec_cameras','sec_gates',
    'sec_sensors','sec_control_rooms','sec_patrol_teams','sec_reports'
  ] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('drop policy if exists "%s_select_showcase" on public.%I', t, t);
    execute format(
      'create policy "%s_select_showcase" on public.%I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- ── 2) Knowledge repository — 5 categories + 18 bilingual articles ──────────
insert into public.sec_knowledge_categories (id, code, name_ar, name_en, sort_order, icon) values
  ('b0000000-0000-4000-8000-000000000001','POL','السياسات الأمنية','Security Policies',1,'shield-check'),
  ('b0000000-0000-4000-8000-000000000002','SOP','الإجراءات التشغيلية','Operating Procedures',2,'clipboard-list'),
  ('b0000000-0000-4000-8000-000000000003','FRM','النماذج المعتمدة','Approved Forms',3,'file-text'),
  ('b0000000-0000-4000-8000-000000000004','CHK','قوائم التحقق','Inspection Checklists',4,'check-square'),
  ('b0000000-0000-4000-8000-000000000005','ERP','استجابة الطوارئ','Emergency Response',5,'flame')
on conflict (code) do nothing;

insert into public.sec_knowledge_articles
  (category_id, doc_code, title_ar, title_en, description_ar, purpose_ar, scope_ar,
   responsibilities_ar, procedure_ar, requirements_ar, risk_level, priority,
   escalation_level, keywords_ar, keywords_en, body_ar, version, owner, status)
select c.id, a.doc_code, a.title_ar, a.title_en, a.summary_ar,
       'ضمان تنفيذ «' || a.title_ar || '» بصورة موحدة وقابلة للتدقيق عبر جميع مواقع المنطقة الغربية.',
       'جميع مواقع إدارة الأمن الصناعي بالمنطقة الغربية والعاملين والمقاولين المصرح لهم.',
       'مدير الدائرة: الاعتماد · قائد الوردية: التنفيذ · ضابط الامتثال: التدقيق الدوري.',
       E'١. التحقق من الاشتراطات المسبقة.\n٢. تنفيذ الخطوات وفق التسلسل المعتمد.\n٣. التوثيق في سجل التشغيل.\n٤. الإبلاغ عن أي انحراف فورًا لغرفة التحكم.',
       'معدات الوقاية الشخصية · تصريح ساري · تدريب معتمد خلال آخر 12 شهرًا.',
       a.risk_level,
       case a.risk_level when 'critical' then 'immediate' when 'high' then 'urgent' else 'elevated' end,
       case a.risk_level when 'critical' then 'مدير المنطقة' else 'مدير الدائرة' end,
       a.kw, a.kw,
       a.summary_ar || E'\n\nيُطبق هذا المستند ضمن منظومة الامتثال لتوجيهات الهيئة العليا للأمن الصناعي، ويُراجع سنويًا أو عند صدور تحديث تنظيمي. جميع البيانات المعروضة محاكاة مرجعية موسومة is_simulation = true.',
       '2.0', 'قسم الامتثال HCIS', 'published'
from (values
  ('POL-001','POL','سياسة الامتثال لتوجيهات HCIS','HCIS Compliance Policy','الإطار الحاكم لمطابقة المنشآت مع توجيهات الهيئة العليا للأمن الصناعي ودورة الاعتماد السبع.','high', array['hcis','امتثال','اعتماد']),
  ('POL-002','POL','سياسة التحكم بالوصول والهوية','Access & Identity Policy','قواعد إصدار البطاقات والتحقق من الهوية للزوار والمقاولين وفق SEC-11 وSEC-12.','high', array['وصول','هوية','بطاقات']),
  ('POL-003','POL','سياسة الاحتفاظ بتسجيلات المراقبة','CCTV Retention Policy','مدد الاحتفاظ بالتسجيلات وضوابط الاطلاع والتسليم للجهات المختصة.','medium', array['cctv','تسجيلات']),
  ('POL-004','POL','سياسة أمن المعلومات التشغيلية OT','OT Cybersecurity Policy','ضوابط عزل شبكات التحكم الصناعي ومتطلبات SEC-13.','critical', array['سيبراني','ot']),
  ('SOP-001','SOP','إجراء العزل والوسم LOTO','Lockout/Tagout Procedure','خطوات فصل مصادر الطاقة ووسمها قبل أعمال الصيانة على المعدات الحرجة.','critical', array['loto','عزل','وسم','صيانة']),
  ('SOP-002','SOP','إجراء تفويج المركبات الثقيلة','Heavy Vehicle Escort SOP','مسارات وتصاريح دخول الشاحنات والصهاريج عبر بوابة الشحن.','medium', array['مركبات','تفويج']),
  ('SOP-003','SOP','إجراء الاستجابة لإنذار كشف التسلل','PIDS Alarm Response SOP','تصنيف الإنذار، التحقق البصري، وإرسال الدورية خلال 4 دقائق.','high', array['pids','إنذار','تسلل']),
  ('SOP-004','SOP','إجراء تسليم واستلام الوردية','Shift Handover SOP','قائمة التسليم الإلزامية بين قادة الورديات في غرفة التحكم.','medium', array['وردية','تسليم']),
  ('SOP-005','SOP','إجراء إدارة المفاتيح الحرجة','Critical Keys Management','سجل المفاتيح، الصرف المزدوج، والجرد اليومي.','high', array['مفاتيح']),
  ('FRM-001','FRM','نموذج تصريح عمل ساخن','Hot Work Permit Form','النموذج المعتمد لأعمال اللحام والقطع داخل المناطق المصنفة.','critical', array['تصريح','عمل ساخن','لحام']),
  ('FRM-002','FRM','نموذج تسجيل زائر مسبق','Visitor Pre-registration Form','بيانات الزائر والمضيف والغرض ومدة الزيارة.','low', array['زائر','تسجيل']),
  ('FRM-003','FRM','نموذج بلاغ حادث أمني','Security Incident Report Form','الحقول الإلزامية لتوثيق البلاغ خلال الساعة الأولى.','high', array['بلاغ','حادث']),
  ('CHK-132','CHK','قائمة تفتيش محطة تحويل 132 ك.ف','132kV Substation Checklist','48 بند تحقق دوري وفق SEC-18: الأسوار، الإنارة، الكاميرات، أجهزة الاستشعار.','critical', array['sec-18','محطة','تفتيش','132']),
  ('CHK-002','CHK','قائمة فحص جاهزية البوابات','Gates Readiness Checklist','فحص أسبوعي للحواجز والقارئات وأنظمة التعرف على اللوحات.','medium', array['بوابات','فحص']),
  ('CHK-003','CHK','قائمة تدقيق غرفة التحكم','Control Room Audit Checklist','جاهزية الشاشات والاتصالات وسجلات التشغيل.','medium', array['غرفة التحكم','تدقيق']),
  ('ERP-001','ERP','خطة الاستجابة لتسرب غاز','Gas Leak Response Plan','الإخلاء، العزل، الإبلاغ، ونقاط التجمع — تمرين نصف سنوي إلزامي.','critical', array['تسرب','غاز','إخلاء']),
  ('ERP-002','ERP','خطة مواجهة الاقتحام المسلح','Armed Intrusion Response','بروتوكول الإغلاق والتحصين والتنسيق مع الجهات الأمنية.','critical', array['اقتحام','طوارئ']),
  ('ERP-003','ERP','خطة إخلاء المجمع السكني','Compound Evacuation Plan','مسارات الإخلاء وتعداد القاطنين وفق SEC-RC.','high', array['إخلاء','سكني','sec-rc'])
) as a(doc_code, cat, title_ar, title_en, summary_ar, risk_level, kw)
join public.sec_knowledge_categories c on c.code = a.cat
on conflict (doc_code) do nothing;

-- ── 3) Digital twin hierarchy — 5 circles → sites → buildings → devices ─────
insert into public.sec_circles (id, code, name_ar, name_en, manager, lat, lng, staff_count) values
  ('c0000000-0000-4000-8000-000000000001','CIR-01','دائرة محطات التحويل','Substations Circle','م. سلطان العتيبي',21.50,39.20,30),
  ('c0000000-0000-4000-8000-000000000002','CIR-02','دائرة المحيط والبوابات','Perimeter & Gates Circle','أ. عبدالله السبيعي',21.55,39.15,36),
  ('c0000000-0000-4000-8000-000000000003','CIR-03','دائرة المراقبة البصرية','CCTV Operations Circle','م. فهد القحطاني',21.48,39.22,42),
  ('c0000000-0000-4000-8000-000000000004','CIR-04','دائرة الاستشعار والإنذار','Sensors & Alarms Circle','م. ريان الزهراني',21.52,39.18,24),
  ('c0000000-0000-4000-8000-000000000005','CIR-05','دائرة الإسناد اللوجستي','Logistics Support Circle','أ. لمى الشهراني',21.46,39.25,18)
on conflict (code) do nothing;

insert into public.sec_sites (id, code, name_ar, name_en, lat, lng, sensitivity, status, guards_count, notes, circle_id) values
  ('d0000000-0000-4000-8000-000000000001','SUB-380-W','محطة التحويل الغربية 380 ك.ف','West 380kV Substation',21.41,39.21,'critical','operational',14,'خاضعة للتوجيه SEC-18 — دورة اعتماد مكتملة حتى IFC','c0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002','SUB-132-JN','محطة تحويل جدة الشمالية 132 ك.ف','North Jeddah 132kV',21.62,39.14,'critical','operational',11,'خاضعة للتوجيه SEC-18 — مرحلة 90%','c0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000003','PRM-WST','المحيط الأمني الغربي','Western Perimeter',21.49,39.19,'high','operational',18,'أسوار SEC-02 وبوابات SEC-03','c0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000004','CCTV-HUB','مركز المراقبة البصرية الموحد','Unified CCTV Hub',21.50,39.20,'high','operational',9,'أنظمة متكاملة SEC-05','c0000000-0000-4000-8000-000000000003'),
  ('d0000000-0000-4000-8000-000000000005','SNS-FLD','حقل الاستشعار المحيطي','Perimeter Sensing Field',21.47,39.17,'high','operational',6,'كشف تسلل PIDS — SEC-06','c0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000006','LOG-STH','مستودع الإسناد الجنوبي','South Logistics Depot',21.44,39.24,'medium','operational',7,null,'c0000000-0000-4000-8000-000000000005')
on conflict (code) do nothing;

insert into public.sec_buildings (id, site_id, code, name_ar, name_en, floors, status)
select ('e0000000-0000-4000-8000-0000000000' || lpad((row_number() over ())::text, 2, '0'))::uuid,
       s.id, s.code || '-B' || b.n,
       case b.n when 1 then 'مبنى التحكم — ' || s.name_ar else 'مبنى المعدات — ' || s.name_ar end,
       s.name_en || case b.n when 1 then ' Control Building' else ' Equipment Building' end,
       1 + (b.n % 3), 'operational'
from public.sec_sites s
cross join (values (1),(2)) as b(n)
where s.code in ('SUB-380-W','SUB-132-JN','PRM-WST','CCTV-HUB','SNS-FLD','LOG-STH')
on conflict (code) do nothing;

insert into public.sec_cameras (building_id, site_id, code, kind, status, health, resolution)
select b.id, b.site_id, 'CAM-' || b.code || '-' || c.n,
       case when c.n = 1 then 'fixed' else 'ptz' end,
       case when b.code like 'CCTV%B2' and c.n = 1 then 'degraded' else 'online' end,
       case when b.code like 'CCTV%B2' and c.n = 1 then 64 else 90 + c.n end, '4K'
from public.sec_buildings b
cross join (values (1),(2)) as c(n)
where b.code like any (array['SUB-%','PRM-%','CCTV-%','SNS-%','LOG-%'])
on conflict (code) do nothing;

insert into public.sec_gates (building_id, site_id, code, kind, status, health, events_today)
select b.id, b.site_id, 'GT-' || b.code,
       case when b.code like '%B1' then 'pedestrian' else 'vehicle' end,
       case when b.code like 'PRM%B2' then 'maintenance' else 'online' end,
       case when b.code like 'PRM%B2' then 55 else 96 end,
       40 + (length(b.code) * 7) % 160
from public.sec_buildings b
where b.code like any (array['SUB-%','PRM-%','CCTV-%','SNS-%','LOG-%'])
on conflict (code) do nothing;

insert into public.sec_sensors (building_id, site_id, code, sensor_type, status, reading, threshold, unit)
select b.id, b.site_id, 'SNS-' || b.code || '-' || s.n,
       (array['pids','thermal','smoke','vibration'])[1 + (s.n % 4)],
       case when b.code like 'SNS%B1' and s.n = 2 then 'alarm' else 'online' end,
       case when b.code like 'SNS%B1' and s.n = 2 then 78 else 21 + s.n * 4 end, 60, '°C'
from public.sec_buildings b
cross join (values (1),(2)) as s(n)
where b.code like any (array['SUB-%','PRM-%','CCTV-%','SNS-%','LOG-%'])
on conflict (code) do nothing;

insert into public.sec_control_rooms (circle_id, code, name_ar, name_en, operators_count, status, shift_lead, screens_count)
select c.id, 'CR-' || c.code, 'غرفة تحكم ' || c.name_ar, c.name_en || ' Control Room',
       4 + (row_number() over ())::int % 3, 'operational', 'قائد الوردية أ', 8 + 2 * (row_number() over ())::int
from public.sec_circles c
where c.code like 'CIR-%'
on conflict (code) do nothing;

insert into public.sec_patrol_teams (circle_id, code, name_ar, leader, members_count, vehicle_plate, status)
select c.id, 'PT-' || c.code,
       (array['فريق الصقر','فريق النمر','فريق العقاب','فريق السهم','فريق الدرع'])[(row_number() over ())::int],
       'رقيب أول', 4, (7100 + 37 * (row_number() over ())::int)::text || ' هـ ن ب',
       case when c.code = 'CIR-05' then 'available' else 'on-route' end
from public.sec_circles c
where c.code like 'CIR-%'
on conflict (code) do nothing;

-- ── 4) Report-engine fuel — 14 days of operations events ────────────────────
insert into public.sec_incidents (ref, category, title_ar, title_en, severity, status, owner, reported_at, ai_summary)
select 'INC-SIM-' || to_char(d, 'YYMMDD') || '-' || i,
       (array['perimeter','cctv','access','sensors'])[1 + (i % 4)],
       (array['دخول غير مصرح عند السور الشمالي','تعطل كاميرا البوابة الرئيسية','محاولة دخول ببطاقة منتهية','انقطاع اتصال مستشعر اهتزاز'])[1 + (i % 4)],
       (array['Unauthorized perimeter entry','Main-gate camera fault','Expired-badge attempt','Vibration sensor offline'])[1 + (i % 4)],
       (array['high','medium','low','medium'])[1 + (i % 4)],
       case when i % 3 = 0 then 'open' else 'resolved' end,
       'غرفة التحكم', d + (i * interval '3 hours') + interval '5 hours',
       'صف محاكاة مرجعية — is_simulation = true'
from generate_series(current_date - 13, current_date, interval '1 day') as d
cross join generate_series(1, 3) as i
on conflict (ref) do nothing;

insert into public.sec_permits (ref, work_type, contractor, risk_level, status, starts_at, ends_at, approver, notes)
select 'PTW-SIM-' || to_char(d, 'YYMMDD') || '-' || i,
       (array['hot_work','confined_space','excavation'])[1 + (i % 3)],
       (array['الإنشاءات الصناعية المتقدمة','صيانة الشبكات الموحدة','الحلول الكهروميكانيكية'])[1 + (i % 3)],
       (array['high','critical','medium'])[1 + (i % 3)],
       case when d = current_date then 'active' else 'closed' end,
       d + interval '6 hours', d + interval '16 hours',
       'مدير المنطقة', 'صف محاكاة مرجعية — is_simulation = true'
from generate_series(current_date - 13, current_date, interval '1 day') as d
cross join generate_series(1, 2) as i
on conflict (ref) do nothing;

insert into public.sec_activity_events (entity_type, entity_id, entity_ref, event, actor_name, payload, occurred_at)
select 'showcase', gen_random_uuid(), 'EVT-SIM-' || to_char(d, 'YYMMDD') || '-' || i,
       (array['visitor_checked_in','patrol_completed','gate_status_changed','permit_verified','cctv_alert_ack','hcis_audit_step'])[1 + (i % 6)],
       (array['نظام البوابات الآلي','غرفة التحكم','قائد الوردية','دورية الصقر'])[1 + (i % 4)],
       jsonb_build_object('is_simulation', true),
       d + (i * interval '90 minutes') + interval '4 hours'
from generate_series(current_date - 13, current_date, interval '1 day') as d
cross join generate_series(1, 6) as i
where not exists (
  select 1 from public.sec_activity_events e
  where e.entity_ref = 'EVT-SIM-' || to_char(d, 'YYMMDD') || '-' || i
);
