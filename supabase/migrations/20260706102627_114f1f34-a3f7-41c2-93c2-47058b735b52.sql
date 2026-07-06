
CREATE TABLE public.urgent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  department text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('عاجل جدًا','عاجل','متابعة')),
  status text NOT NULL DEFAULT 'جديد' CHECK (status IN ('جديد','قيد المعالجة','بانتظار اعتماد','مغلق')),
  owner_name text,
  due_at timestamptz,
  sla_hours integer,
  is_simulation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urgent_tasks TO authenticated;
GRANT ALL ON public.urgent_tasks TO service_role;
ALTER TABLE public.urgent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read urgent_tasks" ON public.urgent_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write urgent_tasks" ON public.urgent_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_urgent_tasks_updated BEFORE UPDATE ON public.urgent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester text NOT NULL,
  topic_ar text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('داخلي','ميداني','تنفيذي')),
  status text NOT NULL DEFAULT 'جديد',
  assigned_to text,
  is_simulation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read support_requests" ON public.support_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write support_requests" ON public.support_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_support_requests_updated BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.aria_improvement_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  proposal_ar text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('حرج','عالٍ','متوسط')),
  status text NOT NULL DEFAULT 'مقترح' CHECK (status IN ('مقترح','معتمد','مرفوض')),
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_improvement_proposals TO authenticated;
GRANT ALL ON public.aria_improvement_proposals TO service_role;
ALTER TABLE public.aria_improvement_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read aria_proposals" ON public.aria_improvement_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write aria_proposals" ON public.aria_improvement_proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_aria_proposals_updated BEFORE UPDATE ON public.aria_improvement_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.urgent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aria_improvement_proposals;
