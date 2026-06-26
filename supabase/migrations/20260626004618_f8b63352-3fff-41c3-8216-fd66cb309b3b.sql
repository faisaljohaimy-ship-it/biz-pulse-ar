
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS request_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS device text;

CREATE OR REPLACE FUNCTION public.generate_lead_request_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.request_id IS NULL OR NEW.request_id = '' THEN
    NEW.request_id := 'NEX-' || to_char(now(),'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_set_request_id ON public.leads;
CREATE TRIGGER leads_set_request_id
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.generate_lead_request_id();
