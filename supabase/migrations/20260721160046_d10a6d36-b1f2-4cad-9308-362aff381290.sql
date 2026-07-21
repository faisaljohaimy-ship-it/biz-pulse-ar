-- =========================================================
-- Fleet Expansion: 5 industrial agents + coordination network
-- =========================================================

-- 1) agent_connections ------------------------------------
create table if not exists public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  from_node text not null,
  from_kind text not null check (from_kind in ('source','agent','aria','gate')),
  to_node text not null,
  to_kind text not null check (to_kind in ('source','agent','aria','gate')),
  link_type text not null check (link_type in ('command','result','data','approval_suggestion')),
  status text not null default 'active' check (status in ('active','idle','error')),
  weight int not null default 1,
  is_simulation boolean not null default true,
  org_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_connections_unique unique (from_node, to_node, link_type, org_id)
);

create index if not exists idx_agent_connections_from on public.agent_connections(from_node);
create index if not exists idx_agent_connections_to on public.agent_connections(to_node);
create index if not exists idx_agent_connections_org on public.agent_connections(org_id);

grant select on public.agent_connections to anon;
grant select, insert, update, delete on public.agent_connections to authenticated;
grant all on public.agent_connections to service_role;

alter table public.agent_connections enable row level security;

drop policy if exists "agent_connections_public_read" on public.agent_connections;
create policy "agent_connections_public_read" on public.agent_connections
  for select using (true);

drop policy if exists "agent_connections_org_write" on public.agent_connections;
create policy "agent_connections_org_write" on public.agent_connections
  for all to authenticated
  using (is_org_member(org_id, 'operator'::org_role))
  with check (is_org_member(org_id, 'operator'::org_role));

drop trigger if exists agent_connections_updated on public.agent_connections;
create trigger agent_connections_updated before update on public.agent_connections
  for each row execute function public.update_updated_at_column();

-- 2) agent_approval_proposals ------------------------------
create table if not exists public.agent_approval_proposals (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.agent_definitions(id) on delete cascade,
  title_ar text not null,
  title_en text,
  kind text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed')),
  payload jsonb not null default '{}'::jsonb,
  is_simulation boolean not null default true,
  org_id uuid not null default '00000000-0000-0000-0000-000000000001'::uuid references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_approval_agent on public.agent_approval_proposals(agent_id);
create index if not exists idx_agent_approval_status on public.agent_approval_proposals(status);
create index if not exists idx_agent_approval_org on public.agent_approval_proposals(org_id);

grant select on public.agent_approval_proposals to anon;
grant select, insert, update, delete on public.agent_approval_proposals to authenticated;
grant all on public.agent_approval_proposals to service_role;

alter table public.agent_approval_proposals enable row level security;

drop policy if exists "agent_approval_public_read" on public.agent_approval_proposals;
create policy "agent_approval_public_read" on public.agent_approval_proposals
  for select using (true);

drop policy if exists "agent_approval_org_write" on public.agent_approval_proposals;
create policy "agent_approval_org_write" on public.agent_approval_proposals
  for all to authenticated
  using (is_org_member(org_id, 'operator'::org_role))
  with check (is_org_member(org_id, 'operator'::org_role));

drop trigger if exists agent_approval_proposals_updated on public.agent_approval_proposals;
create trigger agent_approval_proposals_updated before update on public.agent_approval_proposals
  for each row execute function public.update_updated_at_column();

-- 3) Seed 5 new agents ------------------------------------
insert into public.agent_definitions (id, name, goal, system_prompt, permissions, tool_allowlist, memory_scope, model, enabled, metadata, org_id)
values
  ('predictor','مُنبئ — الصيانة التنبؤية',
   'توقع أعطال الأصول الحرجة قبل وقوعها.',
   'أنت وكيل الصيانة التنبؤية. حلّل التاريخ والقراءات لتوقّع الأعطال، واقترح أوامر عمل وقائية بانتظار اعتماد بشري.',
   '{}','{}', 'shared','openai/gpt-5', true,
   jsonb_build_object('name_ar','مُنبئ','name_en','Predictor','icon','Activity','specialty','predictive','severity','high','current_mission','فحص محولات SEC-18','trigger','دوري كل 6 ساعات + تجاوز قراءة','inputs',jsonb_build_array('twin_assets','sec_work_orders','sensor_readings'),'outputs',jsonb_build_array('ranked_assets','preventive_wo_proposal'),'is_simulation',true),
   '00000000-0000-0000-0000-000000000001'::uuid),
  ('investigator','مُحقِّق — الجذر السببي',
   'تحليل البلاغات وربط المتكرر بجذر واحد.',
   'أنت وكيل التحقيق. اربط البلاغات المتكررة بجذر سببي واحد.',
   '{}','{}', 'shared','openai/gpt-5', true,
   jsonb_build_object('name_ar','مُحقِّق','name_en','Investigator','icon','Search','specialty','operations','severity','high','current_mission','تحليل تكرار بلاغات الشرقية','trigger','بلاغ عالي الحدّة أو تكرار نمط','inputs',jsonb_build_array('sec_incidents','enterprise_events','sec_permits'),'outputs',jsonb_build_array('root_cause_report','corrective_action_plan'),'is_simulation',true),
   '00000000-0000-0000-0000-000000000001'::uuid),
  ('readiness','مُدقِّق — جاهزية التفتيش',
   'قياس جاهزية كل إدارة لتفتيش الهيئة قبل حدوثه.',
   'أنت وكيل جاهزية التفتيش.',
   '{}','{}', 'shared','openai/gpt-5', true,
   jsonb_build_object('name_ar','مُدقِّق','name_en','Readiness Auditor','icon','ClipboardCheck','specialty','compliance','severity','medium','current_mission','قياس جاهزية الجنوبية','trigger','أسبوعي + تغيّر حالة امتثال','inputs',jsonb_build_array('hcis_compliance_status','hcis_approval_stages','sec_knowledge_articles'),'outputs',jsonb_build_array('readiness_score','gap_closure_plan'),'is_simulation',true),
   '00000000-0000-0000-0000-000000000001'::uuid),
  ('identity_guard','حارس الهوية — الدخول والمقاولين',
   'حوكمة دخول الأفراد والمقاولين والزوار.',
   'أنت حارس الهوية.',
   '{}','{}', 'shared','openai/gpt-5', true,
   jsonb_build_object('name_ar','حارس الهوية','name_en','Identity Guard','icon','UserCheck','specialty','access','severity','high','current_mission','مراقبة بطاقات المقاولين','trigger','طلب دخول / تصريح مقاول / قرب انتهاء بطاقة','inputs',jsonb_build_array('sec_visitors','sec_contractors','sec_permits'),'outputs',jsonb_build_array('access_alerts','suspend_badge_proposal'),'is_simulation',true),
   '00000000-0000-0000-0000-000000000001'::uuid),
  ('ot_eye','عين OT — الأمن السيبراني التشغيلي',
   'مراقبة سلامة أنظمة التحكم الصناعي والأنظمة الأمنية.',
   'أنت عين OT.',
   '{}','{}', 'shared','openai/gpt-5', true,
   jsonb_build_object('name_ar','عين OT','name_en','OT Sentinel','icon','ShieldHalf','specialty','cyber','severity','critical','current_mission','فحص فصل الشبكات','trigger','فحص دوري مستمر','inputs',jsonb_build_array('integration_microsoft_sync_log','enterprise_events','sec_sensors'),'outputs',jsonb_build_array('cyber_health_score','anomaly_list','hardening_recommendation'),'is_simulation',true),
   '00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do update set metadata = excluded.metadata, goal = excluded.goal, updated_at = now();

-- 4) Seed agent_runs (12 per new agent) --------------------
insert into public.agent_runs (agent_id, status, summary, steps, started_at, finished_at, org_id, context_json)
select
  x.agent_id,
  case when random() < 0.85 then 'succeeded' else 'failed' end,
  x.mission,
  (3 + floor(random()*7))::int,
  now() - (x.day_offset || ' days')::interval - (floor(random()*24) || ' hours')::interval,
  now() - (x.day_offset || ' days')::interval - (floor(random()*24) || ' hours')::interval + interval '4 minutes',
  '00000000-0000-0000-0000-000000000001'::uuid,
  jsonb_build_object('is_simulation', true, 'source', 'fleet_expansion_seed')
from (values
  ('predictor', 'فحص محولات المنطقة الغربية · SEC-18', 1),
  ('predictor', 'رصد ارتفاع درجة حرارة محول غرب-٠٤', 1),
  ('predictor', 'تقييم عمر مضخات محطة رقم ٧', 2),
  ('predictor', 'مسح احتمالية عطل مولد شمال-٠٢', 3),
  ('predictor', 'تحليل اهتزاز موتور رئيسي', 4),
  ('predictor', 'توقّع سعة تحميل محول جنوب-٠٩', 5),
  ('predictor', 'مسح موحد لأصول الشرقية', 6),
  ('predictor', 'قراءة اتجاهات أمر عمل رقم ١٠٢٢', 7),
  ('predictor', 'تنبؤ سعة تبريد غرفة تحكم ٣', 8),
  ('predictor', 'تحليل تسرّب زيت متوقّع', 9),
  ('predictor', 'مسح حالة كابل رئيسي', 11),
  ('predictor', 'تقرير أسبوعي لأصول SEC-18', 13),
  ('investigator', 'ربط بلاغات دخول متكررة · الجنوبية', 1),
  ('investigator', 'تحليل تكرار عطل بوابة رقم ٥', 2),
  ('investigator', 'تقرير جذر لبلاغ حريق خفيف', 2),
  ('investigator', 'ربط ثلاث حوادث كاميرا معطلة', 3),
  ('investigator', 'مراجعة تسلسل حادث الشرقية-١٧', 4),
  ('investigator', 'تحقيق في اختراق تصريح مقاول', 5),
  ('investigator', 'تحليل سبب تأخر استجابة دورية', 6),
  ('investigator', 'ربط بلاغات فقد بطاقات', 7),
  ('investigator', 'تحقيق تسرب معلومات في سجل', 8),
  ('investigator', 'ربط بلاغ ضجيج غير مبرر', 10),
  ('investigator', 'تحليل جذر لتعطل نظام دخول', 12),
  ('investigator', 'تقرير حادث السلامة رقم ٤٣٢', 13),
  ('readiness', 'قياس جاهزية الجنوبية للتفتيش', 1),
  ('readiness', 'رصد فجوة SEC-05 في الشرقية', 1),
  ('readiness', 'تحديث خطة إغلاق فجوات الغربية', 2),
  ('readiness', 'مراجعة وثائق SEC-11', 3),
  ('readiness', 'تقييم استعداد إدارة الأمن السيبراني', 4),
  ('readiness', 'مسح جاهزية إدارة السلامة', 5),
  ('readiness', 'تقرير جاهزية الشمالية 78%', 6),
  ('readiness', 'مراجعة سجل التدريبات الإلزامية', 7),
  ('readiness', 'إغلاق فجوة SEC-13 الحرجة', 8),
  ('readiness', 'تحديث مصفوفة المسؤوليات', 10),
  ('readiness', 'مراجعة مؤشرات الأداء الرقابية', 12),
  ('readiness', 'تقرير جاهزية شامل — أسبوعي', 13),
  ('identity_guard', 'تنبيه: بطاقتا مقاول تنتهيان خلال 48 ساعة', 1),
  ('identity_guard', 'دخول خارج نطاق التصريح · بوابة ٣', 1),
  ('identity_guard', 'مقاول بلا فحص طبي ساري', 2),
  ('identity_guard', 'اقتراح تعليق بطاقة رقم ١٠٤٥', 3),
  ('identity_guard', 'مراجعة زوار غير مسجلين', 4),
  ('identity_guard', 'رصد محاولة دخول مكرر', 5),
  ('identity_guard', 'تنبيه: تصريح مقاول قارب الانتهاء', 6),
  ('identity_guard', 'مسح حالة بطاقات الطاقم الميداني', 7),
  ('identity_guard', 'مراجعة سجل الدخول للجنوبية', 9),
  ('identity_guard', 'اقتراح تعليق بطاقة زائر مؤقتة', 10),
  ('identity_guard', 'تنبيه: مقاول دخل بلا مرافق', 11),
  ('identity_guard', 'تقرير أسبوعي — الدخول والمقاولون', 13),
  ('ot_eye', 'فحص فصل الشبكات — سليم', 1),
  ('ot_eye', 'رصد شذوذ في موصل SCADA-٢', 1),
  ('ot_eye', 'مسح صحة نظام التحكم الصناعي', 2),
  ('ot_eye', 'تحليل سجل أحداث NCA اليومي', 3),
  ('ot_eye', 'رصد محاولة اتصال خارجي مشبوهة', 4),
  ('ot_eye', 'فحص تصلّب أنظمة CCTV', 5),
  ('ot_eye', 'تقرير سلامة الشبكة OT', 6),
  ('ot_eye', 'رصد تحديث بلا اعتماد', 7),
  ('ot_eye', 'مسح موصلات Microsoft 365', 8),
  ('ot_eye', 'تحليل نمط دخول غير معتاد', 10),
  ('ot_eye', 'توصية تصلّب — تعطيل منفذ ٤٤٥', 12),
  ('ot_eye', 'تقرير أسبوعي — سيبراني OT', 13)
) as x(agent_id, mission, day_offset)
where not exists (
  select 1 from public.agent_runs r
  where r.agent_id = x.agent_id and r.summary = x.mission
);

-- 5) Approval proposals ------------------------------------
insert into public.agent_approval_proposals (agent_id, title_ar, kind, severity, payload, org_id)
select v.agent_id, v.title_ar, v.kind, v.severity, v.payload::jsonb, '00000000-0000-0000-0000-000000000001'::uuid
from (values
  ('predictor', 'أمر عمل وقائي — محول غرب-٠٤', 'preventive_work_order', 'high',
   '{"asset":"WEST-TRF-04","action":"صيانة وقائية خلال 14 يومًا","confidence":0.83}'),
  ('predictor', 'أمر عمل وقائي — مولد شمال-٠٢', 'preventive_work_order', 'medium',
   '{"asset":"NORTH-GEN-02","action":"استبدال محمل","confidence":0.71}'),
  ('identity_guard', 'تعليق بطاقة مقاول منتهية', 'suspend_badge', 'high',
   '{"badge_id":"CT-1045","reason":"انتهت الصلاحية منذ 12 ساعة"}'),
  ('identity_guard', 'تعليق تصريح دخول متكرر التجاوز', 'suspend_permit', 'medium',
   '{"permit_id":"PMT-2201","reason":"دخول خارج نطاق ثلاث مرات"}'),
  ('readiness', 'خطة إغلاق فجوة SEC-05 — الشرقية', 'gap_closure_plan', 'high',
   '{"dept":"eastern","gap":"SEC-05","due_days":10}'),
  ('ot_eye', 'تصلّب سيبراني — تعطيل منفذ 445', 'cyber_hardening', 'critical',
   '{"port":445,"scope":"OT-network-B"}')
) as v(agent_id, title_ar, kind, severity, payload)
where not exists (
  select 1 from public.agent_approval_proposals p
  where p.agent_id = v.agent_id and p.title_ar = v.title_ar
);

-- 6) Coordination network ----------------------------------
insert into public.agent_connections (from_node, from_kind, to_node, to_kind, link_type, weight, org_id)
select v.from_node, v.from_kind, v.to_node, v.to_kind, v.link_type, v.weight, '00000000-0000-0000-0000-000000000001'::uuid
from (values
  ('sap','source','predictor','agent','data',5),
  ('sensors','source','predictor','agent','data',9),
  ('incidents','source','investigator','agent','data',7),
  ('permits','source','investigator','agent','data',4),
  ('m365','source','readiness','agent','data',3),
  ('nafath','source','identity_guard','agent','data',6),
  ('permits','source','identity_guard','agent','data',5),
  ('m365','source','ot_eye','agent','data',4),
  ('sensors','source','ot_eye','agent','data',6),
  ('powerbi','source','readiness','agent','data',3),
  ('incidents','source','incident_commander','agent','data',6),
  ('incidents','source','incident_triager','agent','data',5),
  ('permits','source','permit_officer','agent','data',5),
  ('sap','source','maintenance_planner','agent','data',4),
  ('sensors','source','asset_health_monitor','agent','data',7),
  ('powerbi','source','kpi_intelligence','agent','data',5),
  ('m365','source','compliance_auditor','agent','data',4),
  ('sensors','source','operations_monitor','agent','data',6),
  ('predictor','agent','aria','aria','result',9),
  ('investigator','agent','aria','aria','result',7),
  ('readiness','agent','aria','aria','result',6),
  ('identity_guard','agent','aria','aria','result',6),
  ('ot_eye','agent','aria','aria','result',5),
  ('incident_commander','agent','aria','aria','result',7),
  ('incident_triager','agent','aria','aria','result',5),
  ('permit_officer','agent','aria','aria','result',4),
  ('maintenance_planner','agent','aria','aria','result',4),
  ('asset_health_monitor','agent','aria','aria','result',6),
  ('kpi_intelligence','agent','aria','aria','result',5),
  ('compliance_auditor','agent','aria','aria','result',4),
  ('operations_monitor','agent','aria','aria','result',5),
  ('aria','aria','approval_gate','gate','approval_suggestion',12),
  ('predictor','agent','aria','aria','approval_suggestion',3),
  ('identity_guard','agent','aria','aria','approval_suggestion',4),
  ('readiness','agent','aria','aria','approval_suggestion',2),
  ('ot_eye','agent','aria','aria','approval_suggestion',3),
  ('permit_officer','agent','aria','aria','approval_suggestion',2)
) as v(from_node, from_kind, to_node, to_kind, link_type, weight)
on conflict (from_node, to_node, link_type, org_id) do nothing;

-- 7) ARIA knowledge ----------------------------------------
insert into public.aria_knowledge (title, source, content, tags, org_id)
select v.title, 'fleet_expansion', v.content, v.tags, '00000000-0000-0000-0000-000000000001'::uuid
from (values
  ('وكيل: مُنبئ (predictor)',
   'وكيل الصيانة التنبؤية. يتوقّع أعطال الأصول الحرجة من التاريخ والمستشعرات، ويقترح أوامر عمل وقائية بانتظار اعتماد بشري. مثال: 3 أصول تحتاج تدخلًا خلال 14 يومًا، أعلاها محول غرب-٠٤.',
   array['agent','predictor','maintenance','ksa']),
  ('وكيل: مُحقِّق (investigator)',
   'وكيل التحقيق والجذر السببي. يربط البلاغات المتكررة بجذر واحد ويُنتج تقريرًا مختصرًا. مثال: تكرار ثالث لنفس السبب في الشرقية.',
   array['agent','investigator','rca','ksa']),
  ('وكيل: مُدقِّق الجاهزية (readiness)',
   'يقيس جاهزية كل إدارة لتفتيش الهيئة قبل حدوثه. مثال: الجنوبية 68% — أكبر فجوة SEC-05.',
   array['agent','readiness','hcis','compliance']),
  ('وكيل: حارس الهوية (identity_guard)',
   'يحوكم دخول الأفراد والمقاولين والزوار ويقترح تعليق بطاقات دون تنفيذ فعلي. مثال: مقاولان ببطاقات تنتهي خلال 48 ساعة.',
   array['agent','identity_guard','access','contractors']),
  ('وكيل: عين OT (ot_eye)',
   'يراقب سلامة أنظمة التحكم الصناعي والأنظمة الأمنية بمنطق NCA. مثال: فصل الشبكات سليم · شذوذ واحد قيد المراجعة.',
   array['agent','ot_eye','cyber','nca'])
) as v(title, content, tags)
where not exists (
  select 1 from public.aria_knowledge k where k.title = v.title and k.source = 'fleet_expansion'
);
