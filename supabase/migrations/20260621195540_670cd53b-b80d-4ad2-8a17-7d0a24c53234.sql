
-- ============================================================
-- INDUSTRIAL SECURITY OPERATIONS — Core Tables
-- ============================================================

CREATE TABLE public.sec_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  lat double precision,
  lng double precision,
  sensitivity text NOT NULL DEFAULT 'medium' CHECK (sensitivity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','offline','maintenance')),
  guards_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_sites TO authenticated;
GRANT ALL ON public.sec_sites TO service_role;
ALTER TABLE public.sec_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_sites_select_auth" ON public.sec_sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_sites_admin_write" ON public.sec_sites FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  category text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','contained','resolved','closed')),
  owner text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  response_minutes int,
  root_cause text,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_incidents TO authenticated;
GRANT ALL ON public.sec_incidents TO service_role;
ALTER TABLE public.sec_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_incidents_select_auth" ON public.sec_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_incidents_admin_write" ON public.sec_incidents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_patrols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  team text NOT NULL,
  route text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','missed')),
  checkpoints_total int NOT NULL DEFAULT 0,
  checkpoints_done int NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_patrols TO authenticated;
GRANT ALL ON public.sec_patrols TO service_role;
ALTER TABLE public.sec_patrols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_patrols_select_auth" ON public.sec_patrols FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_patrols_admin_write" ON public.sec_patrols FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  work_type text NOT NULL,
  contractor text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','expired','revoked','closed')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  approver text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_permits TO authenticated;
GRANT ALL ON public.sec_permits TO service_role;
ALTER TABLE public.sec_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_permits_select_auth" ON public.sec_permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_permits_admin_write" ON public.sec_permits FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  organization text,
  host text NOT NULL,
  purpose text,
  badge_no text,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  status text NOT NULL DEFAULT 'inside' CHECK (status IN ('expected','inside','left','overdue')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_visitors TO authenticated;
GRANT ALL ON public.sec_visitors TO service_role;
ALTER TABLE public.sec_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_visitors_select_auth" ON public.sec_visitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_visitors_admin_write" ON public.sec_visitors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  name text NOT NULL,
  contract_no text NOT NULL,
  workers_count int NOT NULL DEFAULT 0,
  compliance_score int NOT NULL DEFAULT 100 CHECK (compliance_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','blacklisted','expired')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_contractors TO authenticated;
GRANT ALL ON public.sec_contractors TO service_role;
ALTER TABLE public.sec_contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_contractors_select_auth" ON public.sec_contractors FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_contractors_admin_write" ON public.sec_contractors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_cctv_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  camera_code text NOT NULL,
  alert_type text NOT NULL,
  confidence numeric(4,2) NOT NULL DEFAULT 0.8,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','dispatched','resolved','false_positive')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_cctv_alerts TO authenticated;
GRANT ALL ON public.sec_cctv_alerts TO service_role;
ALTER TABLE public.sec_cctv_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_cctv_select_auth" ON public.sec_cctv_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_cctv_admin_write" ON public.sec_cctv_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.sec_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  health int NOT NULL DEFAULT 95 CHECK (health BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','degraded','offline','maintenance')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sec_assets TO authenticated;
GRANT ALL ON public.sec_assets TO service_role;
ALTER TABLE public.sec_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_assets_select_auth" ON public.sec_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "sec_assets_admin_write" ON public.sec_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Triggers: updated_at
CREATE TRIGGER trg_sec_sites_updated BEFORE UPDATE ON public.sec_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_incidents_updated BEFORE UPDATE ON public.sec_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_patrols_updated BEFORE UPDATE ON public.sec_patrols FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_permits_updated BEFORE UPDATE ON public.sec_permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_contractors_updated BEFORE UPDATE ON public.sec_contractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sec_assets_updated BEFORE UPDATE ON public.sec_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_cctv_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_patrols;

-- ============================================================
-- SEED DATA — realistic Saudi industrial security operations
-- ============================================================

INSERT INTO public.sec_sites (code, name_ar, name_en, lat, lng, sensitivity, status, guards_count) VALUES
  ('SITE-RUH-01','المقر الرئيسي - الرياض','HQ - Riyadh',24.7136,46.6753,'critical','operational',48),
  ('SITE-JED-02','ميناء جدة الصناعي','Jeddah Industrial Port',21.4858,39.1925,'critical','operational',62),
  ('SITE-DAM-03','مجمع الدمام للطاقة','Dammam Energy Complex',26.4207,50.0888,'high','operational',54),
  ('SITE-YAN-04','محطة ينبع للتكرير','Yanbu Refinery Station',24.0900,38.0618,'critical','degraded',71),
  ('SITE-JUB-05','مدينة الجبيل الصناعية','Jubail Industrial City',27.0046,49.6471,'high','operational',58),
  ('SITE-NEO-06','مشروع نيوم - القطاع الأمني','NEOM - Security Sector',28.0000,35.0000,'critical','operational',39),
  ('SITE-MEC-07','المنطقة الحرفية - مكة','Makkah Logistics Zone',21.3891,39.8579,'medium','operational',26),
  ('SITE-RAB-08','محطة رابغ للكهرباء','Rabigh Power Station',22.7986,39.0349,'high','maintenance',33);

INSERT INTO public.sec_incidents (ref, site_id, category, title_ar, title_en, severity, status, owner, reported_at, resolved_at, response_minutes, ai_summary)
SELECT 'INC-2026-0142', id, 'Perimeter Breach','محاولة اختراق محيط أمني عند البوابة الشمالية','Perimeter breach attempt at north gate','critical','contained','أحمد القحطاني', now() - interval '42 minutes', now() - interval '11 minutes', 31, 'استجابة الفريق ضمن SLA — كاميرا CAM-N04 رصدت تحركاً غير مصرّح. تم تأمين المحيط واستدعاء الدورية 03.' FROM public.sec_sites WHERE code='SITE-YAN-04';

INSERT INTO public.sec_incidents (ref, site_id, category, title_ar, title_en, severity, status, owner, reported_at, response_minutes, ai_summary)
SELECT 'INC-2026-0141', id, 'Access Violation','تجاوز صلاحيات دخول - منطقة محظورة','Access violation in restricted zone','high','investigating','نورة الزهراني', now() - interval '2 hours', 18, 'بطاقة الموظف EMP-3318 استخدمت في منطقة غير مصرحة. الذكاء الاصطناعي يربط النمط بحادثة سابقة.' FROM public.sec_sites WHERE code='SITE-DAM-03';

INSERT INTO public.sec_incidents (ref, site_id, category, title_ar, title_en, severity, status, owner, reported_at, response_minutes, ai_summary)
SELECT 'INC-2026-0140', id, 'Fire Alarm','إنذار حريق - مستودع المواد الكيميائية','Fire alarm — chemical storage','critical','resolved','فريق الطوارئ A', now() - interval '6 hours', 9, 'إنذار كاذب من المستشعر SNS-K12 بسبب ارتفاع الحرارة الموسمية. توصية: معايرة المستشعرات.' FROM public.sec_sites WHERE code='SITE-JUB-05';

INSERT INTO public.sec_incidents (ref, site_id, category, title_ar, title_en, severity, status, owner, reported_at, ai_summary)
SELECT 'INC-2026-0139', id, 'Suspicious Activity','نشاط مشبوه قرب خط الأنابيب','Suspicious activity near pipeline','medium','open','محمد العتيبي', now() - interval '25 minutes', 'تحليل ARIA: نمط مشي غير معتاد لشخصين، الثقة 87%. تم تنبيه الدورية 07.' FROM public.sec_sites WHERE code='SITE-YAN-04';

INSERT INTO public.sec_incidents (ref, site_id, category, title_ar, title_en, severity, status, owner, reported_at, response_minutes, ai_summary)
SELECT 'INC-2026-0138', id, 'Equipment Tamper','محاولة عبث بكاميرا CAM-E11','Camera tampering attempt','high','resolved','سعد الحربي', now() - interval '1 day', 14, 'فقد البث لمدة 4 دقائق. تم استبدال الكاميرا وفتح تحقيق داخلي.' FROM public.sec_sites WHERE code='SITE-JED-02';

INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at, ended_at) 
SELECT 'PAT-0301', id, 'Team Alpha', 'Route A — Perimeter East', 'active', 12, 8, now() - interval '38 minutes', NULL FROM public.sec_sites WHERE code='SITE-RUH-01';
INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at, ended_at)
SELECT 'PAT-0302', id, 'Team Bravo', 'Route B — Internal Corridors', 'active', 15, 13, now() - interval '52 minutes', NULL FROM public.sec_sites WHERE code='SITE-JED-02';
INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at, ended_at)
SELECT 'PAT-0303', id, 'Team Charlie', 'Route C — Tank Farm', 'completed', 10, 10, now() - interval '3 hours', now() - interval '1 hour' FROM public.sec_sites WHERE code='SITE-YAN-04';
INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at)
SELECT 'PAT-0304', id, 'Team Delta', 'Route D — Substation Loop', 'active', 8, 3, now() - interval '15 minutes' FROM public.sec_sites WHERE code='SITE-DAM-03';
INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at, ended_at)
SELECT 'PAT-0305', id, 'Team Echo', 'Route E — Outer Fence', 'missed', 14, 2, now() - interval '2 hours', NULL FROM public.sec_sites WHERE code='SITE-RAB-08';
INSERT INTO public.sec_patrols (ref, site_id, team, route, status, checkpoints_total, checkpoints_done, started_at)
SELECT 'PAT-0306', id, 'Team Foxtrot', 'Route F — Loading Bays', 'active', 9, 6, now() - interval '28 minutes' FROM public.sec_sites WHERE code='SITE-JUB-05';

INSERT INTO public.sec_permits (ref, site_id, work_type, contractor, risk_level, status, starts_at, ends_at, approver)
SELECT 'PMT-2026-0451', id, 'Hot Work - Welding', 'Arabian Industrial Services', 'high', 'active', now() - interval '2 hours', now() + interval '6 hours', 'م. خالد الشمري' FROM public.sec_sites WHERE code='SITE-YAN-04';
INSERT INTO public.sec_permits (ref, site_id, work_type, contractor, risk_level, status, starts_at, ends_at, approver)
SELECT 'PMT-2026-0452', id, 'Confined Space Entry', 'Tamimi Global', 'critical', 'active', now() - interval '1 hour', now() + interval '4 hours', 'م. فهد المطيري' FROM public.sec_sites WHERE code='SITE-JUB-05';
INSERT INTO public.sec_permits (ref, site_id, work_type, contractor, risk_level, status, starts_at, ends_at, approver)
SELECT 'PMT-2026-0453', id, 'Electrical Maintenance', 'SEC Operations', 'medium', 'approved', now() + interval '4 hours', now() + interval '12 hours', 'م. عبدالله القرني' FROM public.sec_sites WHERE code='SITE-DAM-03';
INSERT INTO public.sec_permits (ref, site_id, work_type, contractor, risk_level, status, starts_at, ends_at, approver)
SELECT 'PMT-2026-0454', id, 'Excavation', 'Al-Rashid Trading', 'high', 'pending', now() + interval '1 day', now() + interval '3 days', NULL FROM public.sec_sites WHERE code='SITE-RUH-01';
INSERT INTO public.sec_permits (ref, site_id, work_type, contractor, risk_level, status, starts_at, ends_at, approver)
SELECT 'PMT-2026-0450', id, 'Lifting Operation', 'Saudi Cranes Co.', 'high', 'expired', now() - interval '2 days', now() - interval '12 hours', 'م. سلطان الدوسري' FROM public.sec_sites WHERE code='SITE-JED-02';

INSERT INTO public.sec_visitors (ref, site_id, full_name, organization, host, purpose, badge_no, check_in_at, status)
SELECT 'VST-9821', id, 'Dr. Lars Henriksen', 'Siemens Energy', 'م. خالد الشمري', 'Inspection Audit', 'B-1142', now() - interval '1 hour', 'inside' FROM public.sec_sites WHERE code='SITE-YAN-04';
INSERT INTO public.sec_visitors (ref, site_id, full_name, organization, host, purpose, badge_no, check_in_at, check_out_at, status)
SELECT 'VST-9820', id, 'سارة العنزي', 'هيئة المحتوى المحلي', 'فهد المطيري', 'اجتماع رسمي', 'B-1141', now() - interval '4 hours', now() - interval '1 hour', 'left' FROM public.sec_sites WHERE code='SITE-RUH-01';
INSERT INTO public.sec_visitors (ref, site_id, full_name, organization, host, purpose, badge_no, check_in_at, status)
SELECT 'VST-9822', id, 'James O''Connor', 'Halliburton', 'سعد الحربي', 'Technical Briefing', 'B-1143', now() - interval '35 minutes', 'inside' FROM public.sec_sites WHERE code='SITE-DAM-03';
INSERT INTO public.sec_visitors (ref, site_id, full_name, organization, host, purpose, badge_no, check_in_at, status)
SELECT 'VST-9823', id, 'محمد الغامدي', 'هيئة الاتصالات والفضاء', 'نورة الزهراني', 'تفتيش امتثال', 'B-1144', now() - interval '6 hours', 'overdue' FROM public.sec_sites WHERE code='SITE-JED-02';

INSERT INTO public.sec_contractors (ref, name, contract_no, workers_count, compliance_score, status, expires_at) VALUES
  ('CON-001','Arabian Industrial Services','CT-2025-1142', 184, 96, 'active', now() + interval '8 months'),
  ('CON-002','Tamimi Global','CT-2025-1198', 312, 91, 'active', now() + interval '14 months'),
  ('CON-003','SEC Operations','CT-2024-0871', 76, 88, 'active', now() + interval '3 months'),
  ('CON-004','Saudi Cranes Co.','CT-2025-1311', 42, 78, 'suspended', now() + interval '4 months'),
  ('CON-005','Al-Rashid Trading','CT-2025-1422', 98, 84, 'active', now() + interval '11 months'),
  ('CON-006','Nesma & Partners','CT-2024-0922', 256, 93, 'active', now() + interval '6 months'),
  ('CON-007','Zamil Steel','CT-2023-0701', 134, 62, 'blacklisted', now() - interval '2 months');

INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at)
SELECT 'CAM-A-7741', id, 'CAM-N04','Unauthorized Movement', 0.94, 'dispatched', now() - interval '3 minutes' FROM public.sec_sites WHERE code='SITE-YAN-04';
INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at, acknowledged_by)
SELECT 'CAM-A-7740', id, 'CAM-W02','Loitering Detection', 0.81, 'triaged', now() - interval '12 minutes', 'مركز التحكم' FROM public.sec_sites WHERE code='SITE-JED-02';
INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at)
SELECT 'CAM-A-7739', id, 'CAM-E11','PPE Violation', 0.89, 'new', now() - interval '1 minute' FROM public.sec_sites WHERE code='SITE-JUB-05';
INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at, acknowledged_by)
SELECT 'CAM-A-7738', id, 'CAM-S08','Vehicle Tailgating', 0.92, 'resolved', now() - interval '45 minutes', 'فهد المطيري' FROM public.sec_sites WHERE code='SITE-RUH-01';
INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at, acknowledged_by, notes)
SELECT 'CAM-A-7737', id, 'CAM-N12','Object Left Behind', 0.73, 'false_positive', now() - interval '2 hours', 'ARIA', 'حقيبة موظف عاد لاستلامها بعد 8 دقائق' FROM public.sec_sites WHERE code='SITE-DAM-03';
INSERT INTO public.sec_cctv_alerts (ref, site_id, camera_code, alert_type, confidence, status, detected_at)
SELECT 'CAM-A-7742', id, 'CAM-G01','Crowd Anomaly', 0.86, 'new', now() - interval '30 seconds' FROM public.sec_sites WHERE code='SITE-MEC-07';

INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-CAM-001','شبكة كاميرات الرياض','Riyadh CCTV Mesh','cctv', id, 98, 'online' FROM public.sec_sites WHERE code='SITE-RUH-01';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-ACS-002','نظام التحكم بالدخول','Access Control System','access', id, 94, 'online' FROM public.sec_sites WHERE code='SITE-JED-02';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-FIR-003','شبكة إنذار الحريق','Fire Alarm Network','safety', id, 76, 'degraded' FROM public.sec_sites WHERE code='SITE-YAN-04';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-PER-004','أسوار المحيط الذكية','Smart Perimeter Fence','perimeter', id, 89, 'online' FROM public.sec_sites WHERE code='SITE-DAM-03';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-DRO-005','أسطول الطائرات بدون طيار','Drone Fleet','aerial', id, 91, 'online' FROM public.sec_sites WHERE code='SITE-JUB-05';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-BIO-006','بوابات البصمة الحيوية','Biometric Gates','access', id, 99, 'online' FROM public.sec_sites WHERE code='SITE-NEO-06';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-RAD-007','رادار محيطي','Perimeter Radar','sensor', id, 62, 'maintenance' FROM public.sec_sites WHERE code='SITE-RAB-08';
INSERT INTO public.sec_assets (code, name_ar, name_en, kind, site_id, health, status)
SELECT 'AST-CMD-008','مركز القيادة الموحد','Unified Command Center','command', id, 100, 'online' FROM public.sec_sites WHERE code='SITE-RUH-01';
