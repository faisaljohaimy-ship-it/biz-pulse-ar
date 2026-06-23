-- =================================================================
-- INDUSTRIAL SECURITY — WESTERN REGION — Schema & Seed
-- =================================================================

-- 1) SECTIONS
CREATE TABLE public.sec_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  head text,
  staff_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_sections TO authenticated;
GRANT ALL ON public.sec_sections TO service_role;
ALTER TABLE public.sec_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_sections_select_admin" ON public.sec_sections FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_sections_admin_write" ON public.sec_sections TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_sections_updated BEFORE UPDATE ON public.sec_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) CIRCLES
CREATE TABLE public.sec_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  manager text,
  lat double precision,
  lng double precision,
  staff_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_circles TO authenticated;
GRANT ALL ON public.sec_circles TO service_role;
ALTER TABLE public.sec_circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_circles_select_admin" ON public.sec_circles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_circles_admin_write" ON public.sec_circles TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_circles_updated BEFORE UPDATE ON public.sec_circles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Link existing sites to circles
ALTER TABLE public.sec_sites ADD COLUMN IF NOT EXISTS circle_id uuid REFERENCES public.sec_circles(id) ON DELETE SET NULL;

-- 4) BUILDINGS
CREATE TABLE public.sec_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  floors integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','offline','maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_buildings TO authenticated;
GRANT ALL ON public.sec_buildings TO service_role;
ALTER TABLE public.sec_buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_buildings_select_admin" ON public.sec_buildings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_buildings_admin_write" ON public.sec_buildings TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_buildings_updated BEFORE UPDATE ON public.sec_buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) CAMERAS
CREATE TABLE public.sec_cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.sec_buildings(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'fixed',
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','degraded','offline','maintenance')),
  health integer NOT NULL DEFAULT 95 CHECK (health BETWEEN 0 AND 100),
  resolution text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_cameras TO authenticated;
GRANT ALL ON public.sec_cameras TO service_role;
ALTER TABLE public.sec_cameras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_cameras_select_admin" ON public.sec_cameras FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_cameras_admin_write" ON public.sec_cameras TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_cameras_updated BEFORE UPDATE ON public.sec_cameras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_cameras;

-- 6) GATES
CREATE TABLE public.sec_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.sec_buildings(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'pedestrian',
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','degraded','offline','maintenance')),
  health integer NOT NULL DEFAULT 95 CHECK (health BETWEEN 0 AND 100),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  events_today integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_gates TO authenticated;
GRANT ALL ON public.sec_gates TO service_role;
ALTER TABLE public.sec_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_gates_select_admin" ON public.sec_gates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_gates_admin_write" ON public.sec_gates TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_gates_updated BEFORE UPDATE ON public.sec_gates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) SENSORS
CREATE TABLE public.sec_sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES public.sec_buildings(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  sensor_type text NOT NULL,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online','degraded','offline','maintenance','alarm')),
  reading numeric(10,2),
  threshold numeric(10,2),
  unit text,
  last_reading_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_sensors TO authenticated;
GRANT ALL ON public.sec_sensors TO service_role;
ALTER TABLE public.sec_sensors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_sensors_select_admin" ON public.sec_sensors FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_sensors_admin_write" ON public.sec_sensors TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_sensors_updated BEFORE UPDATE ON public.sec_sensors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) CONTROL ROOMS
CREATE TABLE public.sec_control_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES public.sec_circles(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  operators_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','offline')),
  shift_lead text,
  screens_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_control_rooms TO authenticated;
GRANT ALL ON public.sec_control_rooms TO service_role;
ALTER TABLE public.sec_control_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_control_rooms_select_admin" ON public.sec_control_rooms FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_control_rooms_admin_write" ON public.sec_control_rooms TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_control_rooms_updated BEFORE UPDATE ON public.sec_control_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) PATROL TEAMS
CREATE TABLE public.sec_patrol_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES public.sec_circles(id) ON DELETE SET NULL,
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  leader text,
  members_count integer NOT NULL DEFAULT 0,
  vehicle_plate text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','on-route','rest','off-duty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_patrol_teams TO authenticated;
GRANT ALL ON public.sec_patrol_teams TO service_role;
ALTER TABLE public.sec_patrol_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_patrol_teams_select_admin" ON public.sec_patrol_teams FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_patrol_teams_admin_write" ON public.sec_patrol_teams TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_patrol_teams_updated BEFORE UPDATE ON public.sec_patrol_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) WORK ORDERS
CREATE TABLE public.sec_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  site_id uuid REFERENCES public.sec_sites(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.sec_buildings(id) ON DELETE SET NULL,
  asset_kind text NOT NULL,
  asset_code text,
  kind text NOT NULL CHECK (kind IN ('preventive','corrective')),
  title_ar text NOT NULL,
  title_en text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in-progress','on-hold','closed','cancelled')),
  assigned_to text,
  contractor text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_work_orders TO authenticated;
GRANT ALL ON public.sec_work_orders TO service_role;
ALTER TABLE public.sec_work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_work_orders_select_admin" ON public.sec_work_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_work_orders_admin_write" ON public.sec_work_orders TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_work_orders_updated BEFORE UPDATE ON public.sec_work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.sec_work_orders;

-- 11) PROJECTS
CREATE TABLE public.sec_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  circle_id uuid REFERENCES public.sec_circles(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in-progress','on-hold','completed','cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget_sar numeric(14,2) NOT NULL DEFAULT 0,
  spent_sar numeric(14,2) NOT NULL DEFAULT 0,
  starts_at date,
  ends_at date,
  manager text,
  contractor text,
  health text NOT NULL DEFAULT 'green' CHECK (health IN ('green','amber','red')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sec_projects TO authenticated;
GRANT ALL ON public.sec_projects TO service_role;
ALTER TABLE public.sec_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sec_projects_select_admin" ON public.sec_projects FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "sec_projects_admin_write" ON public.sec_projects TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_sec_projects_updated BEFORE UPDATE ON public.sec_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =================================================================
-- SEED DATA
-- =================================================================

-- Sections
INSERT INTO public.sec_sections (code, name_ar, name_en, head, staff_count) VALUES
 ('support',     'قسم المساندة',                  'Support Section',                       'م. عبدالله الزهراني', 28),
 ('maintenance', 'قسم صيانة الأنظمة الأمنية',     'Security Systems Maintenance Section',  'م. فهد العتيبي',     42),
 ('projects',    'قسم مشاريع الأنظمة الأمنية',    'Security Systems Projects Section',     'م. ماجد القرشي',    24);

-- Circles
INSERT INTO public.sec_circles (code, name_ar, name_en, manager, lat, lng, staff_count) VALUES
 ('makkah',  'دائرة مكة المكرمة',     'Makkah Circle',  'م. سعد الحربي',          21.4225, 39.8262, 64),
 ('jeddah',  'دائرة جدة',             'Jeddah Circle',  'م. عبدالرحمن الغامدي',   21.4858, 39.1925, 88),
 ('madinah', 'دائرة المدينة المنورة', 'Madinah Circle', 'م. خالد الأحمدي',        24.5247, 39.5692, 56),
 ('taif',    'دائرة الطائف',          'Taif Circle',    'م. ناصر العمري',         21.2854, 40.4183, 36),
 ('tabuk',   'دائرة تبوك',            'Tabuk Circle',   'م. تركي الشهري',         28.3998, 36.5700, 30);

-- Map existing sites to circles via name heuristics
UPDATE public.sec_sites SET circle_id = (SELECT id FROM public.sec_circles WHERE code='makkah')  WHERE name_ar ILIKE '%مكة%';
UPDATE public.sec_sites SET circle_id = (SELECT id FROM public.sec_circles WHERE code='madinah') WHERE name_ar ILIKE '%مدينة%' OR name_ar ILIKE '%المدينة%';
UPDATE public.sec_sites SET circle_id = (SELECT id FROM public.sec_circles WHERE code='taif')    WHERE name_ar ILIKE '%طائف%' OR name_ar ILIKE '%الطائف%';
UPDATE public.sec_sites SET circle_id = (SELECT id FROM public.sec_circles WHERE code='tabuk')   WHERE name_ar ILIKE '%تبوك%';
UPDATE public.sec_sites SET circle_id = (SELECT id FROM public.sec_circles WHERE code='jeddah')  WHERE circle_id IS NULL;

-- Additional realistic sites to ensure each circle has coverage
INSERT INTO public.sec_sites (code, name_ar, name_en, sensitivity, status, guards_count, circle_id, lat, lng) VALUES
 ('SITE-MK-01', 'محطة مكة المركزية',            'Makkah Central Station',   'critical', 'operational', 24, (SELECT id FROM public.sec_circles WHERE code='makkah'),  21.4225, 39.8262),
 ('SITE-MK-02', 'مستودع مكة الفرعي',            'Makkah Sub Warehouse',     'high',     'operational', 12, (SELECT id FROM public.sec_circles WHERE code='makkah'),  21.4500, 39.8500),
 ('SITE-MD-01', 'محطة المدينة المركزية',        'Madinah Central Station',  'critical', 'operational', 22, (SELECT id FROM public.sec_circles WHERE code='madinah'), 24.5247, 39.5692),
 ('SITE-MD-02', 'مستودع المدينة',               'Madinah Warehouse',        'medium',   'operational', 10, (SELECT id FROM public.sec_circles WHERE code='madinah'), 24.5000, 39.6000),
 ('SITE-TF-01', 'محطة الطائف الرئيسية',          'Taif Main Station',        'high',     'operational', 18, (SELECT id FROM public.sec_circles WHERE code='taif'),    21.2854, 40.4183),
 ('SITE-TB-01', 'محطة تبوك الشمالية',           'Tabuk Northern Station',   'high',     'operational', 16, (SELECT id FROM public.sec_circles WHERE code='tabuk'),   28.3998, 36.5700),
 ('SITE-TB-02', 'موقع تبوك الحدودي',            'Tabuk Border Site',        'critical', 'degraded',    28, (SELECT id FROM public.sec_circles WHERE code='tabuk'),   28.5000, 36.4500)
ON CONFLICT (code) DO NOTHING;

-- Buildings: 1 main per site + 1 service building for high/critical sites
INSERT INTO public.sec_buildings (site_id, code, name_ar, name_en, floors, status)
SELECT s.id, s.code || '-B1', 'المبنى الرئيسي - ' || s.name_ar, 'Main Building - ' || s.name_en, 3, 'operational'
FROM public.sec_sites s
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.sec_buildings (site_id, code, name_ar, name_en, floors, status)
SELECT s.id, s.code || '-B2', 'مبنى الخدمات - ' || s.name_ar, 'Service Building - ' || s.name_en, 2, 'operational'
FROM public.sec_sites s WHERE s.sensitivity IN ('high','critical')
ON CONFLICT (code) DO NOTHING;

-- Control Rooms (one per circle)
INSERT INTO public.sec_control_rooms (circle_id, code, name_ar, name_en, operators_count, screens_count, shift_lead, status)
SELECT c.id,
       'CR-' || UPPER(c.code),
       'غرفة تحكم ' || c.name_ar,
       c.name_en || ' Control Room',
       CASE c.code WHEN 'jeddah' THEN 12 WHEN 'makkah' THEN 10 WHEN 'madinah' THEN 8 WHEN 'taif' THEN 6 ELSE 6 END,
       CASE c.code WHEN 'jeddah' THEN 24 WHEN 'makkah' THEN 20 WHEN 'madinah' THEN 16 ELSE 12 END,
       CASE c.code WHEN 'jeddah' THEN 'م. عبدالعزيز السهلي' WHEN 'makkah' THEN 'م. حمد البلوي' WHEN 'madinah' THEN 'م. يوسف الحربي' WHEN 'taif' THEN 'م. سلطان القحطاني' ELSE 'م. بدر الفهيد' END,
       'operational'
FROM public.sec_circles c;

-- Patrol Teams (2 per circle)
INSERT INTO public.sec_patrol_teams (circle_id, code, name_ar, leader, members_count, vehicle_plate, status)
SELECT c.id, 'PT-' || UPPER(c.code) || '-A', 'فرقة ' || c.name_ar || ' أ', 'م. عبدالله ' || c.name_en, 5, 'سعح-' || (1000 + (random()*8000)::int)::text, 'available' FROM public.sec_circles c
UNION ALL
SELECT c.id, 'PT-' || UPPER(c.code) || '-B', 'فرقة ' || c.name_ar || ' ب', 'م. خالد ' || c.name_en,   4, 'بجد-' || (1000 + (random()*8000)::int)::text, 'on-route'  FROM public.sec_circles c;

-- Cameras: 4 per building
INSERT INTO public.sec_cameras (building_id, site_id, code, kind, status, health, resolution, last_seen_at)
SELECT b.id, b.site_id,
       b.code || '-CAM-' || g,
       (ARRAY['fixed','ptz','thermal','anpr'])[1 + ((g - 1) % 4)],
       CASE WHEN random() < 0.85 THEN 'online' WHEN random() < 0.95 THEN 'degraded' ELSE 'offline' END,
       70 + (random()*30)::int,
       (ARRAY['1080p','4K','720p'])[1 + ((g - 1) % 3)],
       now() - (random()*interval '4 hours')
FROM public.sec_buildings b, generate_series(1,4) g;

-- Gates: 2 per building
INSERT INTO public.sec_gates (building_id, site_id, code, kind, status, health, events_today, last_event_at)
SELECT b.id, b.site_id,
       b.code || '-GATE-' || g,
       (ARRAY['pedestrian','vehicle','turnstile'])[1 + ((g - 1) % 3)],
       CASE WHEN random() < 0.92 THEN 'online' ELSE 'degraded' END,
       80 + (random()*20)::int,
       50 + (random()*400)::int,
       now() - (random()*interval '30 minutes')
FROM public.sec_buildings b, generate_series(1,2) g;

-- Sensors: 3 per building
INSERT INTO public.sec_sensors (building_id, site_id, code, sensor_type, status, reading, threshold, unit, last_reading_at)
SELECT b.id, b.site_id,
       b.code || '-SEN-' || g,
       (ARRAY['smoke','gas','motion','glass-break','temperature','water'])[1 + ((g - 1) % 6)],
       CASE WHEN random() < 0.95 THEN 'online' WHEN random() < 0.98 THEN 'alarm' ELSE 'offline' END,
       (random()*100)::numeric(10,2),
       80::numeric(10,2),
       (ARRAY['ppm','°C','%','mV'])[1 + ((g - 1) % 4)],
       now() - (random()*interval '15 minutes')
FROM public.sec_buildings b, generate_series(1,3) g;

-- Work Orders
INSERT INTO public.sec_work_orders (ref, site_id, asset_kind, asset_code, kind, title_ar, title_en, priority, status, assigned_to, contractor, opened_at, due_at, closed_at) VALUES
 ('WO-2026-0001', (SELECT id FROM public.sec_sites WHERE circle_id = (SELECT id FROM public.sec_circles WHERE code='jeddah')  LIMIT 1), 'camera', 'JD-CAM-04', 'corrective', 'إصلاح كاميرا حرارية معطلة - جدة',                'Repair faulty thermal camera - Jeddah',                'high',     'in-progress', 'م. عبدالله الزهراني',    'الشركة العربية للأمن',    now() - interval '2 days',  now() + interval '1 day',  NULL),
 ('WO-2026-0002', (SELECT id FROM public.sec_sites WHERE code='SITE-MK-01' LIMIT 1),                                                     'gate',   'MK-GATE-01','preventive', 'صيانة دورية للبوابة الرئيسية - مكة',             'Routine maintenance main gate - Makkah',               'medium',   'assigned',    'م. فهد العتيبي',         'شركة الحماية المتقدمة',   now() - interval '1 day',   now() + interval '5 days', NULL),
 ('WO-2026-0003', (SELECT id FROM public.sec_sites WHERE code='SITE-MD-01' LIMIT 1),                                                     'sensor', 'MD-SEN-12', 'corrective', 'استبدال حساس دخان معطل - المدينة',                'Replace faulty smoke sensor - Madinah',                'critical', 'open',        NULL,                       NULL,                        now() - interval '4 hours', now() + interval '6 hours', NULL),
 ('WO-2026-0004', (SELECT id FROM public.sec_sites WHERE code='SITE-TF-01' LIMIT 1),                                                     'camera', 'TF-CAM-02', 'preventive', 'تنظيف وفحص دوري لكاميرات الطائف',                 'CCTV cleaning and inspection - Taif',                  'low',      'closed',      'م. ماجد القرشي',         'شركة الصيانة الذكية',     now() - interval '5 days',  now() - interval '2 days', now() - interval '2 days'),
 ('WO-2026-0005', (SELECT id FROM public.sec_sites WHERE code='SITE-TB-02' LIMIT 1),                                                     'sensor', 'TB-SEN-08', 'corrective', 'معايرة حساس الغاز في الحدود',                     'Gas sensor calibration at border',                     'high',     'in-progress', 'م. سعد الحربي',          'الشركة العربية للأمن',    now() - interval '3 days',  now() + interval '2 days', NULL),
 ('WO-2026-0006', (SELECT id FROM public.sec_sites WHERE circle_id = (SELECT id FROM public.sec_circles WHERE code='jeddah')  LIMIT 1), 'asset',  'AST-JD-03', 'preventive', 'فحص دوري لخوادم غرفة التحكم - جدة',                'Routine inspection of control room servers - Jeddah',  'medium',   'assigned',    'م. عبدالعزيز السهلي',    NULL,                        now() - interval '6 hours', now() + interval '3 days', NULL),
 ('WO-2026-0007', (SELECT id FROM public.sec_sites WHERE code='SITE-MK-01' LIMIT 1),                                                     'camera', 'MK-CAM-09', 'corrective', 'تركيب كاميرا بديلة في المدخل الشمالي',            'Install replacement camera at north entrance',         'medium',   'closed',      'م. حمد البلوي',           'الشركة العربية للأمن',    now() - interval '7 days',  now() - interval '4 days', now() - interval '4 days'),
 ('WO-2026-0008', (SELECT id FROM public.sec_sites WHERE code='SITE-MD-01' LIMIT 1),                                                     'gate',   'MD-GATE-02','preventive', 'تحديث برمجي لبوابات الدخول',                      'Firmware upgrade for access gates',                    'low',      'open',        NULL,                       NULL,                        now() - interval '1 day',   now() + interval '7 days', NULL),
 ('WO-2026-0009', (SELECT id FROM public.sec_sites WHERE code='SITE-TF-01' LIMIT 1),                                                     'sensor', 'TF-SEN-05', 'corrective', 'إصلاح حساس حركة - الطائف',                        'Repair motion sensor - Taif',                          'medium',   'in-progress', 'م. سلطان القحطاني',       NULL,                        now() - interval '12 hours',now() + interval '1 day',  NULL),
 ('WO-2026-0010', (SELECT id FROM public.sec_sites WHERE code='SITE-TB-01' LIMIT 1),                                                     'camera', 'TB-CAM-03', 'corrective', 'استبدال عدسة كاميرا متضررة',                       'Replace damaged camera lens',                          'high',     'on-hold',     'م. تركي الشهري',          'شركة الحماية المتقدمة',   now() - interval '4 days',  now() + interval '1 day',  NULL);

-- Projects
INSERT INTO public.sec_projects (ref, circle_id, name_ar, name_en, kind, status, progress, budget_sar, spent_sar, starts_at, ends_at, manager, contractor, health) VALUES
 ('PRJ-2026-001', (SELECT id FROM public.sec_circles WHERE code='jeddah'),  'تحديث نظام CCTV - ميناء جدة',         'CCTV Upgrade - Jeddah Port',              'cctv',           'in-progress', 65,  3200000, 1980000, '2026-01-15', '2026-09-30', 'م. عبدالرحمن الغامدي', 'الشركة العربية للأمن',    'green'),
 ('PRJ-2026-002', (SELECT id FROM public.sec_circles WHERE code='makkah'),  'مشروع التحكم بالدخول - مكة المركزية', 'Access Control Project - Makkah Central', 'access-control', 'in-progress', 40,  1800000,  720000, '2026-03-01', '2026-12-15', 'م. سعد الحربي',         'شركة الحماية المتقدمة',   'amber'),
 ('PRJ-2026-003', (SELECT id FROM public.sec_circles WHERE code='madinah'), 'تأمين المحيط الخارجي - المدينة',       'Perimeter Security - Madinah',            'perimeter',      'planned',     5,   4500000,  150000, '2026-07-01', '2027-03-30', 'م. خالد الأحمدي',       NULL,                       'green'),
 ('PRJ-2025-014', (SELECT id FROM public.sec_circles WHERE code='taif'),    'تكامل أنظمة الإنذار - الطائف',         'Alarm Systems Integration - Taif',        'integration',    'completed',   100,  950000,  920000, '2025-06-01', '2026-02-28', 'م. ناصر العمري',        'شركة الصيانة الذكية',     'green'),
 ('PRJ-2026-004', (SELECT id FROM public.sec_circles WHERE code='tabuk'),   'كاميرات حرارية على الحدود الشمالية',   'Thermal Cameras - Northern Border',       'cctv',           'in-progress', 25,  6800000, 1700000, '2026-02-15', '2026-12-30', 'م. تركي الشهري',         'الشركة العربية للأمن',    'red'),
 ('PRJ-2026-005', (SELECT id FROM public.sec_circles WHERE code='jeddah'),  'بنية تحتية شبكية لغرف التحكم',         'Control Room Network Infrastructure',     'infra',          'in-progress', 80,  1200000,  960000, '2026-01-01', '2026-08-30', 'م. عبدالعزيز السهلي',    'شركة الاتصالات السعودية', 'green'),
 ('PRJ-2026-006', (SELECT id FROM public.sec_circles WHERE code='makkah'),  'تحديث نظام كشف الحرائق',               'Fire Detection System Upgrade',           'integration',    'planned',     0,   2400000,       0, '2026-08-01', '2027-04-30', 'م. حمد البلوي',          NULL,                       'green'),
 ('PRJ-2026-007', (SELECT id FROM public.sec_circles WHERE code='madinah'), 'مشروع كاميرات ANPR للمداخل',          'ANPR Cameras Project',                    'cctv',           'on-hold',     30,  1600000,  480000, '2026-04-01', '2026-11-30', 'م. يوسف الحربي',         'شركة الحماية المتقدمة',   'amber'),
 ('PRJ-2025-019', (SELECT id FROM public.sec_circles WHERE code='tabuk'),   'استبدال أبواب المدخل الرئيسي',         'Main Entrance Doors Replacement',         'access-control', 'completed',   100,  480000,  478000, '2025-09-01', '2026-01-31', 'م. بدر الفهيد',          'شركة الإنشاءات الأمنية',   'green'),
 ('PRJ-2026-008', (SELECT id FROM public.sec_circles WHERE code='taif'),    'تطوير غرفة التحكم - الطائف',           'Taif Control Room Upgrade',               'infra',          'in-progress', 55,  2100000, 1155000, '2026-02-01', '2026-10-30', 'م. سلطان القحطاني',       'الشركة العربية للأمن',    'green');
