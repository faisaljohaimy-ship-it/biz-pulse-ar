-- ========= HAJJ OPERATIONS MODULE =========
-- Sites (Mina, Arafat, Muzdalifah, Jamarat)
CREATE TABLE public.hajj_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'safe' CHECK (status IN ('safe','alert','danger')),
  staff_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hajj_sites TO authenticated;
GRANT ALL ON public.hajj_sites TO service_role;
ALTER TABLE public.hajj_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hajj_sites read members" ON public.hajj_sites FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "hajj_sites write operator" ON public.hajj_sites FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_hajj_sites_updated BEFORE UPDATE ON public.hajj_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stations
CREATE TABLE public.hajj_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  site_id uuid NOT NULL REFERENCES public.hajj_sites(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL DEFAULT 'control_room',
  network text NOT NULL DEFAULT 'online' CHECK (network IN ('online','degraded','offline')),
  staff_count int NOT NULL DEFAULT 0,
  reports_count int NOT NULL DEFAULT 0,
  incidents_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hajj_stations TO authenticated;
GRANT ALL ON public.hajj_stations TO service_role;
ALTER TABLE public.hajj_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hajj_stations read members" ON public.hajj_stations FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "hajj_stations write operator" ON public.hajj_stations FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_hajj_stations_updated BEFORE UPDATE ON public.hajj_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tasks (field operations)
CREATE TABLE public.hajj_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  station_id uuid REFERENCES public.hajj_stations(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('medical','water','transport','security','logistics','other')),
  title_ar text NOT NULL,
  title_en text,
  priority text NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1','P2','P3','P4','P5')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  assignee text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hajj_tasks TO authenticated;
GRANT ALL ON public.hajj_tasks TO service_role;
ALTER TABLE public.hajj_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hajj_tasks read members" ON public.hajj_tasks FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "hajj_tasks write operator" ON public.hajj_tasks FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_hajj_tasks_updated BEFORE UPDATE ON public.hajj_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- KPI snapshots
CREATE TABLE public.hajj_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  open_incidents int NOT NULL DEFAULT 0,
  active_alerts int NOT NULL DEFAULT 0,
  tasks_done int NOT NULL DEFAULT 0,
  field_staff int NOT NULL DEFAULT 0,
  stations_online int NOT NULL DEFAULT 0,
  stations_total int NOT NULL DEFAULT 0,
  compliance_pct numeric(5,2) NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hajj_kpi_snapshots TO authenticated;
GRANT ALL ON public.hajj_kpi_snapshots TO service_role;
ALTER TABLE public.hajj_kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hajj_kpi read members" ON public.hajj_kpi_snapshots FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "hajj_kpi write operator" ON public.hajj_kpi_snapshots FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hajj_sites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hajj_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hajj_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hajj_kpi_snapshots;

-- ========= SEED DATA [SAMPLE] =========
INSERT INTO public.hajj_sites (code, name_ar, name_en, lat, lng, status, staff_count, notes) VALUES
  ('MINA',     'منى [SAMPLE]',     'Mina [SAMPLE]',       21.4136, 39.8933, 'alert',  120, '[SAMPLE] محطة رئيسية + مستودعات'),
  ('ARAFAT',   'عرفات [SAMPLE]',   'Arafat [SAMPLE]',     21.3547, 39.9844, 'safe',    64, '[SAMPLE] منطقة الخدمات الصناعية'),
  ('MUZDALIFAH','مزدلفة [SAMPLE]', 'Muzdalifah [SAMPLE]', 21.3833, 39.9333, 'safe',    42, '[SAMPLE] محطة تبريد'),
  ('JAMARAT',  'الجمرات [SAMPLE]', 'Jamarat [SAMPLE]',    21.4225, 39.8736, 'danger',  30, '[SAMPLE] غرفة مراقبة الجمرات');

INSERT INTO public.hajj_stations (site_id, code, name_ar, name_en, kind, network, staff_count, reports_count, incidents_count)
SELECT s.id, 'MINA-CMD', 'منى 1 — المحطة الرئيسية [SAMPLE]', 'Mina 1 — Main Station [SAMPLE]', 'control_room','online', 80, 12, 2 FROM public.hajj_sites s WHERE s.code='MINA';
INSERT INTO public.hajj_stations (site_id, code, name_ar, name_en, kind, network, staff_count, reports_count, incidents_count)
SELECT s.id, 'MINA-WH',  'منى 2 — المستودعات [SAMPLE]',     'Mina 2 — Warehouse [SAMPLE]',    'logistics','degraded', 40, 5, 0 FROM public.hajj_sites s WHERE s.code='MINA';
INSERT INTO public.hajj_stations (site_id, code, name_ar, name_en, kind, network, staff_count, reports_count, incidents_count)
SELECT s.id, 'ARF-SVC',  'عرفات — منطقة الخدمات [SAMPLE]',   'Arafat — Services [SAMPLE]',     'service','online',     64, 7, 1 FROM public.hajj_sites s WHERE s.code='ARAFAT';
INSERT INTO public.hajj_stations (site_id, code, name_ar, name_en, kind, network, staff_count, reports_count, incidents_count)
SELECT s.id, 'MUZ-COOL', 'مزدلفة — محطة التبريد [SAMPLE]',   'Muzdalifah — Cooling [SAMPLE]',  'service','online',     42, 3, 0 FROM public.hajj_sites s WHERE s.code='MUZDALIFAH';
INSERT INTO public.hajj_stations (site_id, code, name_ar, name_en, kind, network, staff_count, reports_count, incidents_count)
SELECT s.id, 'JAM-CTRL', 'غرفة مراقبة الجمرات [SAMPLE]',     'Jamarat Control Room [SAMPLE]',  'control_room','online',30, 9, 3 FROM public.hajj_sites s WHERE s.code='JAMARAT';

INSERT INTO public.hajj_tasks (station_id, category, title_ar, title_en, priority, status, reported_at)
SELECT id, 'medical', 'تنبيه طبي [SAMPLE]',  'Medical alert [SAMPLE]',   'P5', 'pending',     now() - interval '2 minutes' FROM public.hajj_stations WHERE code='JAM-CTRL';
INSERT INTO public.hajj_tasks (station_id, category, title_ar, title_en, priority, status, reported_at)
SELECT id, 'water',   'طلب مياه [SAMPLE]',    'Water request [SAMPLE]',   'P4', 'pending',     now() - interval '5 minutes' FROM public.hajj_stations WHERE code='ARF-SVC';
INSERT INTO public.hajj_tasks (station_id, category, title_ar, title_en, priority, status, reported_at, started_at)
SELECT id, 'transport','نقل ميداني [SAMPLE]',  'Transport [SAMPLE]',       'P3', 'in_progress', now() - interval '14 minutes', now() - interval '8 minutes' FROM public.hajj_stations WHERE code='MINA-CMD';

INSERT INTO public.hajj_kpi_snapshots (open_incidents, active_alerts, tasks_done, field_staff, stations_online, stations_total, compliance_pct, risk_level, notes)
VALUES (2, 0, 0, 256, 2, 4, 97.00, 'medium', '[SAMPLE] لقطة افتتاحية لوحدة الحج');