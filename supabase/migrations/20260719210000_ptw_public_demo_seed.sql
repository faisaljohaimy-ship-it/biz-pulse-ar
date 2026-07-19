-- ============================================================================
-- NEXIOS AI OS — Digital PTW public demo seed
--
-- /ptw is an open showcase page (anon RLS already grants SELECT on
-- permit_types/permits). Guests previously hit a sign-in wall because no
-- anon-visible rows existed. This seeds a small, clearly-simulated permit
-- board (is_simulation=true, refs PTW-SIM-*) under a reserved demo org id
-- so the guest view renders real database content — no hardcoded UI data.
-- Idempotent: ON CONFLICT DO NOTHING on the natural unique keys.
-- ============================================================================

begin;

-- Reserved demo org (permits.org_id is a plain uuid — no FK).
-- 'd360' suffix = demo showcase namespace; never used by real orgs.

insert into public.permit_types (org_id, key, name_ar, name_en, icon, color, is_simulation) values
('00000000-0000-0000-0000-00000000d360','hot_work','أعمال ساخنة','Hot Work','Flame','#F97316', true),
('00000000-0000-0000-0000-00000000d360','confined_space','دخول أماكن مغلقة','Confined Space Entry','DoorClosed','#8B5CF6', true),
('00000000-0000-0000-0000-00000000d360','electrical','أعمال كهربائية','Electrical Work','Zap','#FACC15', true),
('00000000-0000-0000-0000-00000000d360','work_at_height','العمل على ارتفاع','Work at Height','TowerControl','#22D3EE', true)
on conflict (org_id, key) do nothing;

insert into public.permits
  (org_id, ref, type_key, region, location, contractor, worker_count,
   starts_at, ends_at, precautions, status, is_simulation)
values
('00000000-0000-0000-0000-00000000d360','PTW-SIM-001','hot_work','western',
 'محطة التحويل الغربية — خزان الوقود 3','شركة الإنشاءات المتقدمة',4,
 now() - interval '2 hours', now() + interval '30 days',
 '["عزل مصدر الوقود","مراقب حريق متفرغ","طفايات CO2 في الموقع"]'::jsonb,
 'active', true),
('00000000-0000-0000-0000-00000000d360','PTW-SIM-002','electrical','central',
 'لوحة التوزيع الرئيسية — مبنى القيادة','المقاول الوطني للطاقة',2,
 now() - interval '1 hour', now() + interval '30 days',
 '["فصل الجهد والتأريض","قفل وبطاقة LOTO","قفازات عازلة معتمدة"]'::jsonb,
 'active', true),
('00000000-0000-0000-0000-00000000d360','PTW-SIM-003','work_at_height','eastern',
 'برج الاتصالات الشرقي — منصة 40م','أعمال الارتفاعات المحدودة',3,
 now() - interval '3 hours', now() + interval '30 days',
 '["أحزمة أمان مزدوجة","إغلاق المنطقة السفلية","مراقب أرضي"]'::jsonb,
 'active', true),
('00000000-0000-0000-0000-00000000d360','PTW-SIM-004','confined_space','southern',
 'خزان المياه الجنوبي — غرفة الضخ','شركة الصيانة الصناعية',5,
 now() - interval '30 minutes', now() + interval '90 minutes',
 '["قياس الغازات قبل الدخول","تهوية قسرية مستمرة","حبل إنقاذ ومراقب خارجي"]'::jsonb,
 'active', true),
('00000000-0000-0000-0000-00000000d360','PTW-SIM-005','hot_work','central',
 'ورشة اللحام المركزية — خط الأنابيب B','مصنع المعدات الثقيلة',6,
 now() + interval '4 hours', now() + interval '12 hours',
 '["تصريح مراقب الحريق","إزالة المواد القابلة للاشتعال"]'::jsonb,
 'pending_approval', true),
('00000000-0000-0000-0000-00000000d360','PTW-SIM-006','electrical','western',
 'إنارة السور المحيطي — القطاع الغربي','المقاول الوطني للطاقة',2,
 now() - interval '9 hours', now() - interval '2 hours',
 '["فصل التغذية","إشعار غرفة التحكم"]'::jsonb,
 'expired', true)
on conflict (org_id, ref) do nothing;

commit;
