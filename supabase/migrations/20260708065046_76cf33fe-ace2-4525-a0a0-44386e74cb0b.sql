
CREATE TABLE IF NOT EXISTS public.aria_public_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  detail TEXT,
  device_class TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.aria_public_incidents TO service_role;
-- deliberately NO grants to anon or authenticated: writes go through service_role only.

ALTER TABLE public.aria_public_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON public.aria_public_incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS aria_public_incidents_created_at_idx
  ON public.aria_public_incidents (created_at DESC);
