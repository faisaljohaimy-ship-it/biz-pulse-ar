
-- =========== COST BUDGETS ===========
CREATE TABLE public.cost_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'ai_gateway',
  monthly_cap_usd NUMERIC(12,4) NOT NULL CHECK (monthly_cap_usd >= 0),
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, scope)
);
GRANT SELECT ON public.cost_budgets TO authenticated;
GRANT ALL ON public.cost_budgets TO service_role;
ALTER TABLE public.cost_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view budgets" ON public.cost_budgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_members.org_id = cost_budgets.org_id AND org_members.user_id = auth.uid()));

-- =========== SECRETS ROTATION LOG ===========
CREATE TABLE public.secrets_rotation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_name TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_by UUID,
  next_due_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_secrets_rotation_name ON public.secrets_rotation_log(secret_name, rotated_at DESC);
GRANT SELECT ON public.secrets_rotation_log TO authenticated;
GRANT ALL ON public.secrets_rotation_log TO service_role;
ALTER TABLE public.secrets_rotation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read rotation log" ON public.secrets_rotation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========== RATE LIMIT BUCKETS ===========
CREATE TABLE public.rate_limit_buckets (
  bucket_key TEXT NOT NULL PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- service_role only; no authenticated policy

-- Atomic rate limit checker (sliding 60s window)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket_key TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_buckets(bucket_key, window_start, request_count, updated_at)
    VALUES (_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
    SET request_count = CASE
          WHEN public.rate_limit_buckets.window_start < v_now - make_interval(secs => _window_seconds)
          THEN 1
          ELSE public.rate_limit_buckets.request_count + 1
        END,
        window_start = CASE
          WHEN public.rate_limit_buckets.window_start < v_now - make_interval(secs => _window_seconds)
          THEN v_now
          ELSE public.rate_limit_buckets.window_start
        END,
        updated_at = v_now
  RETURNING request_count INTO v_count;

  RETURN v_count <= _max_requests;
END;
$$;
