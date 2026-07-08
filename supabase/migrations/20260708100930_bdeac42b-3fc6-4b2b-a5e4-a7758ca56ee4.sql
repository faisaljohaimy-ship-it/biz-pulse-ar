
CREATE TABLE IF NOT EXISTS public.aria_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor text NOT NULL DEFAULT 'aria',
  action text NOT NULL,
  surface text,
  route text,
  article_refs text[] NOT NULL DEFAULT '{}'::text[],
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','warn','error','denied')),
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aria_actions_log_org_created_idx ON public.aria_actions_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_actions_log_action_idx ON public.aria_actions_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS aria_actions_log_user_idx ON public.aria_actions_log(user_id, created_at DESC);

GRANT SELECT ON public.aria_actions_log TO authenticated;
GRANT ALL ON public.aria_actions_log TO service_role;

ALTER TABLE public.aria_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aria_actions_log_org_read"
  ON public.aria_actions_log FOR SELECT
  TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "aria_actions_log_tenant_isolation"
  ON public.aria_actions_log AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_org_member(org_id, 'viewer'::org_role))
  WITH CHECK (is_org_member(org_id, 'operator'::org_role));
