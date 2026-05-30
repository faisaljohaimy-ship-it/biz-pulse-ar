-- ============================================================
-- 1. governance_systems
-- ============================================================
CREATE TABLE public.governance_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  owner text,
  criticality text NOT NULL DEFAULT 'Tier-2',
  sla numeric(5,2) NOT NULL DEFAULT 99.0,
  contract_ends text,
  risk text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_systems TO authenticated;
GRANT ALL ON public.governance_systems TO service_role;
ALTER TABLE public.governance_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY gov_systems_all ON public.governance_systems FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_gov_systems_updated BEFORE UPDATE ON public.governance_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. governance_policies
-- ============================================================
CREATE TABLE public.governance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  name_en text,
  version text NOT NULL DEFAULT '1.0',
  coverage integer NOT NULL DEFAULT 0 CHECK (coverage BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_policies TO authenticated;
GRANT ALL ON public.governance_policies TO service_role;
ALTER TABLE public.governance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY gov_policies_all ON public.governance_policies FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_gov_policies_updated BEFORE UPDATE ON public.governance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. transformation_programs
-- ============================================================
CREATE TABLE public.transformation_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  name_en text,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  adoption integer NOT NULL DEFAULT 0 CHECK (adoption BETWEEN 0 AND 100),
  savings text,
  phase text NOT NULL DEFAULT 'design',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformation_programs TO authenticated;
GRANT ALL ON public.transformation_programs TO service_role;
ALTER TABLE public.transformation_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tx_programs_all ON public.transformation_programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tx_programs_updated BEFORE UPDATE ON public.transformation_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. transformation_milestones
-- ============================================================
CREATE TABLE public.transformation_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid REFERENCES public.transformation_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_en text,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformation_milestones TO authenticated;
GRANT ALL ON public.transformation_milestones TO service_role;
ALTER TABLE public.transformation_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY tx_milestones_all ON public.transformation_milestones FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_tx_milestones_updated BEFORE UPDATE ON public.transformation_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tx_milestones_program ON public.transformation_milestones(program_id);

-- ============================================================
-- 5. business_outcomes
-- ============================================================
CREATE TABLE public.business_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  label_en text,
  value text NOT NULL,
  delta text,
  period_from text,
  period_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_outcomes TO authenticated;
GRANT ALL ON public.business_outcomes TO service_role;
ALTER TABLE public.business_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_outcomes_all ON public.business_outcomes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_business_outcomes_updated BEFORE UPDATE ON public.business_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. outcome_metrics
-- ============================================================
CREATE TABLE public.outcome_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  outcome_id uuid REFERENCES public.business_outcomes(id) ON DELETE CASCADE,
  driver text NOT NULL,
  driver_en text,
  impact_value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outcome_metrics TO authenticated;
GRANT ALL ON public.outcome_metrics TO service_role;
ALTER TABLE public.outcome_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcome_metrics_all ON public.outcome_metrics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_outcome_metrics_outcome ON public.outcome_metrics(outcome_id);

-- ============================================================
-- 7. executive_briefings
-- ============================================================
CREATE TABLE public.executive_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  title_en text,
  summary text,
  summary_en text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_briefings TO authenticated;
GRANT ALL ON public.executive_briefings TO service_role;
ALTER TABLE public.executive_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY exec_briefings_all ON public.executive_briefings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_exec_briefings_updated BEFORE UPDATE ON public.executive_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. briefing_actions
-- ============================================================
CREATE TABLE public.briefing_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  briefing_id uuid REFERENCES public.executive_briefings(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_en text,
  priority integer NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_actions TO authenticated;
GRANT ALL ON public.briefing_actions TO service_role;
ALTER TABLE public.briefing_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefing_actions_all ON public.briefing_actions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_briefing_actions_briefing ON public.briefing_actions(briefing_id);

-- ============================================================
-- 9. briefing_risks
-- ============================================================
CREATE TABLE public.briefing_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  briefing_id uuid REFERENCES public.executive_briefings(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_en text,
  level text NOT NULL DEFAULT 'medium',
  probability integer NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_risks TO authenticated;
GRANT ALL ON public.briefing_risks TO service_role;
ALTER TABLE public.briefing_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefing_risks_all ON public.briefing_risks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_briefing_risks_briefing ON public.briefing_risks(briefing_id);

-- ============================================================
-- 10. briefing_opportunities
-- ============================================================
CREATE TABLE public.briefing_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  briefing_id uuid REFERENCES public.executive_briefings(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_en text,
  potential integer NOT NULL DEFAULT 50 CHECK (potential BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_opportunities TO authenticated;
GRANT ALL ON public.briefing_opportunities TO service_role;
ALTER TABLE public.briefing_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY briefing_opps_all ON public.briefing_opportunities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_briefing_opps_briefing ON public.briefing_opportunities(briefing_id);