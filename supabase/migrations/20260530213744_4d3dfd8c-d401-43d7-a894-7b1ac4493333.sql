
-- pulse_kpis
CREATE TABLE public.pulse_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  label_en text NOT NULL,
  value text NOT NULL,
  delta text NOT NULL DEFAULT '',
  trend text NOT NULL DEFAULT 'flat',
  tone text NOT NULL DEFAULT 'cyan',
  why text NOT NULL DEFAULT '',
  why_en text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_kpis TO authenticated;
GRANT ALL ON public.pulse_kpis TO service_role;
ALTER TABLE public.pulse_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY pulse_kpis_all ON public.pulse_kpis FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER pulse_kpis_updated BEFORE UPDATE ON public.pulse_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pulse_crises
CREATE TABLE public.pulse_crises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  title_en text NOT NULL,
  risk_score integer NOT NULL DEFAULT 50,
  probability integer NOT NULL DEFAULT 50,
  impact text NOT NULL DEFAULT '',
  impact_en text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  action_en text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT '/',
  linked_memory_key text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_crises TO authenticated;
GRANT ALL ON public.pulse_crises TO service_role;
ALTER TABLE public.pulse_crises ENABLE ROW LEVEL SECURITY;
CREATE POLICY pulse_crises_all ON public.pulse_crises FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER pulse_crises_updated BEFORE UPDATE ON public.pulse_crises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pulse_execution
CREATE TABLE public.pulse_execution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  decision text NOT NULL,
  decision_en text NOT NULL,
  action text NOT NULL DEFAULT '',
  action_en text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  dependency text NOT NULL DEFAULT '',
  dependency_en text NOT NULL DEFAULT '',
  risk text NOT NULL DEFAULT 'medium',
  completion integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_execution TO authenticated;
GRANT ALL ON public.pulse_execution TO service_role;
ALTER TABLE public.pulse_execution ENABLE ROW LEVEL SECURITY;
CREATE POLICY pulse_execution_all ON public.pulse_execution FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER pulse_execution_updated BEFORE UPDATE ON public.pulse_execution FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pulse_memory
CREATE TABLE public.pulse_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  title_en text NOT NULL,
  owner text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  progress integer NOT NULL DEFAULT 0,
  impact text NOT NULL DEFAULT 'medium',
  days_silent integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT '',
  source_en text NOT NULL DEFAULT '',
  decision_route text,
  depends_on text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pulse_memory TO authenticated;
GRANT ALL ON public.pulse_memory TO service_role;
ALTER TABLE public.pulse_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY pulse_memory_all ON public.pulse_memory FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER pulse_memory_updated BEFORE UPDATE ON public.pulse_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_crises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_execution;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pulse_memory;
