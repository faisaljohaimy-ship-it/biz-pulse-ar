
-- ============ SIMULATION FOUNDATION TABLES ============
-- All org-scoped, RLS by org membership, GRANTs to authenticated + service_role.

-- Reusable updated_at trigger already exists: public.update_updated_at_column()

-- 1) sim_departments
CREATE TABLE public.sim_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  parent_id uuid REFERENCES public.sim_departments(id) ON DELETE SET NULL,
  head_employee_id uuid,
  budget numeric,
  headcount_target int,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_departments TO authenticated;
GRANT ALL ON public.sim_departments TO service_role;
ALTER TABLE public.sim_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read departments" ON public.sim_departments FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org managers write departments" ON public.sim_departments FOR ALL TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'));
CREATE TRIGGER trg_sim_departments_updated BEFORE UPDATE ON public.sim_departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) sim_employees
CREATE TABLE public.sim_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  employee_no text NOT NULL,
  full_name_ar text NOT NULL,
  full_name_en text NOT NULL,
  dept_id uuid REFERENCES public.sim_departments(id) ON DELETE SET NULL,
  role text NOT NULL,
  grade text,
  site_id uuid,
  manager_id uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  hire_date date,
  status text NOT NULL DEFAULT 'active',
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, employee_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_employees TO authenticated;
GRANT ALL ON public.sim_employees TO service_role;
ALTER TABLE public.sim_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read employees" ON public.sim_employees FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org managers write employees" ON public.sim_employees FOR ALL TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'));
CREATE TRIGGER trg_sim_employees_updated BEFORE UPDATE ON public.sim_employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Back-fill FK for department head now that employees exist
ALTER TABLE public.sim_departments ADD CONSTRAINT sim_departments_head_fk FOREIGN KEY (head_employee_id) REFERENCES public.sim_employees(id) ON DELETE SET NULL;

-- 3) sim_buses
CREATE TABLE public.sim_buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  plate text NOT NULL,
  capacity int NOT NULL DEFAULT 40,
  route_code text,
  driver_employee_id uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  site_id uuid,
  status text NOT NULL DEFAULT 'active',
  next_service_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, plate)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_buses TO authenticated;
GRANT ALL ON public.sim_buses TO service_role;
ALTER TABLE public.sim_buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read buses" ON public.sim_buses FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org managers write buses" ON public.sim_buses FOR ALL TO authenticated USING (public.is_org_member(org_id, 'manager')) WITH CHECK (public.is_org_member(org_id, 'manager'));
CREATE TRIGGER trg_sim_buses_updated BEFORE UPDATE ON public.sim_buses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) sim_near_misses
CREATE TABLE public.sim_near_misses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ref text NOT NULL,
  title text NOT NULL,
  site_id uuid,
  reported_by_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  severity_potential text NOT NULL DEFAULT 'medium',
  root_cause text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  reported_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_near_misses TO authenticated;
GRANT ALL ON public.sim_near_misses TO service_role;
ALTER TABLE public.sim_near_misses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read near_misses" ON public.sim_near_misses FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write near_misses" ON public.sim_near_misses FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_near_misses_updated BEFORE UPDATE ON public.sim_near_misses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) sim_inspections
CREATE TABLE public.sim_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ref text NOT NULL,
  kind text NOT NULL,
  site_id uuid,
  building_id uuid,
  inspector_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  score int,
  findings_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  priority text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_inspections TO authenticated;
GRANT ALL ON public.sim_inspections TO service_role;
ALTER TABLE public.sim_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read inspections" ON public.sim_inspections FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write inspections" ON public.sim_inspections FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_inspections_updated BEFORE UPDATE ON public.sim_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) sim_risks
CREATE TABLE public.sim_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ref text NOT NULL,
  title text NOT NULL,
  category text,
  likelihood int NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact int NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  score int GENERATED ALWAYS AS (likelihood * impact) STORED,
  owner_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  inspection_id uuid REFERENCES public.sim_inspections(id) ON DELETE SET NULL,
  mitigation text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_risks TO authenticated;
GRANT ALL ON public.sim_risks TO service_role;
ALTER TABLE public.sim_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read risks" ON public.sim_risks FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write risks" ON public.sim_risks FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_risks_updated BEFORE UPDATE ON public.sim_risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) sim_corrective_actions
CREATE TABLE public.sim_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ref text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('inspection','incident','risk','near_miss')),
  source_id uuid NOT NULL,
  action text NOT NULL,
  owner_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_corrective_actions TO authenticated;
GRANT ALL ON public.sim_corrective_actions TO service_role;
ALTER TABLE public.sim_corrective_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read cars" ON public.sim_corrective_actions FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write cars" ON public.sim_corrective_actions FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_cars_updated BEFORE UPDATE ON public.sim_corrective_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) sim_meetings
CREATE TABLE public.sim_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  ref text NOT NULL,
  title text NOT NULL,
  dept_id uuid REFERENCES public.sim_departments(id) ON DELETE SET NULL,
  organizer_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 60,
  location text,
  kind text NOT NULL DEFAULT 'operational',
  minutes_url text,
  status text NOT NULL DEFAULT 'scheduled',
  priority text NOT NULL DEFAULT 'medium',
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_meetings TO authenticated;
GRANT ALL ON public.sim_meetings TO service_role;
ALTER TABLE public.sim_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read meetings" ON public.sim_meetings FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write meetings" ON public.sim_meetings FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_meetings_updated BEFORE UPDATE ON public.sim_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) sim_notifications
CREATE TABLE public.sim_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  target_employee uuid REFERENCES public.sim_employees(id) ON DELETE CASCADE,
  target_user_id uuid,
  topic text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'unread',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_notifications TO authenticated;
GRANT ALL ON public.sim_notifications TO service_role;
ALTER TABLE public.sim_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read notifications" ON public.sim_notifications FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write notifications" ON public.sim_notifications FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_notifications_updated BEFORE UPDATE ON public.sim_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) sim_daily_ops
CREATE TABLE public.sim_daily_ops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  day date NOT NULL,
  site_id uuid NOT NULL,
  shift text NOT NULL DEFAULT 'day',
  patrols_planned int NOT NULL DEFAULT 0,
  patrols_done int NOT NULL DEFAULT 0,
  incidents_open int NOT NULL DEFAULT 0,
  permits_active int NOT NULL DEFAULT 0,
  headcount int NOT NULL DEFAULT 0,
  kpi_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'closed',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, day, site_id, shift)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sim_daily_ops TO authenticated;
GRANT ALL ON public.sim_daily_ops TO service_role;
ALTER TABLE public.sim_daily_ops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read daily_ops" ON public.sim_daily_ops FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators write daily_ops" ON public.sim_daily_ops FOR ALL TO authenticated USING (public.is_org_member(org_id, 'operator')) WITH CHECK (public.is_org_member(org_id, 'operator'));
CREATE TRIGGER trg_sim_daily_ops_updated BEFORE UPDATE ON public.sim_daily_ops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11) sim_history
CREATE TABLE public.sim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  changes_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_employee uuid REFERENCES public.sim_employees(id) ON DELETE SET NULL,
  at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sim_history TO authenticated;
GRANT ALL ON public.sim_history TO service_role;
ALTER TABLE public.sim_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read history" ON public.sim_history FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'));
CREATE POLICY "org operators append history" ON public.sim_history FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, 'operator'));

-- Helpful indexes
CREATE INDEX idx_sim_employees_dept ON public.sim_employees(dept_id);
CREATE INDEX idx_sim_employees_org ON public.sim_employees(org_id);
CREATE INDEX idx_sim_near_misses_site ON public.sim_near_misses(site_id);
CREATE INDEX idx_sim_inspections_site ON public.sim_inspections(site_id);
CREATE INDEX idx_sim_risks_inspection ON public.sim_risks(inspection_id);
CREATE INDEX idx_sim_cars_source ON public.sim_corrective_actions(source_type, source_id);
CREATE INDEX idx_sim_meetings_dept ON public.sim_meetings(dept_id);
CREATE INDEX idx_sim_notifications_target ON public.sim_notifications(target_employee);
CREATE INDEX idx_sim_daily_ops_day ON public.sim_daily_ops(day);
CREATE INDEX idx_sim_history_entity ON public.sim_history(entity_type, entity_id);
