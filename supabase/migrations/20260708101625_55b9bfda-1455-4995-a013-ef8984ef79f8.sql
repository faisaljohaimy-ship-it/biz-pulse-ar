
-- Attachments RLS (bucket created via storage tool)
CREATE POLICY "aria_attachments_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'aria-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aria_attachments_owner_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aria-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aria_attachments_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aria-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Article 25 classification
ALTER TABLE public.aria_documents
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_hash text;

CREATE INDEX IF NOT EXISTS aria_documents_source_kind_idx ON public.aria_documents(source_kind) WHERE is_official = true;
CREATE UNIQUE INDEX IF NOT EXISTS aria_documents_official_url_rev_idx
  ON public.aria_documents(source, revision_hash) WHERE is_official = true;

-- Corpus stale watchdog (Article 25 (f))
CREATE OR REPLACE FUNCTION public.aria_scan_corpus_stale()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _latest timestamptz;
BEGIN
  SELECT MAX(updated_at) INTO _latest
    FROM public.aria_documents
   WHERE is_official = true
     AND source_kind = 'ksa_industrial_security_regulation';

  IF _latest IS NULL OR _latest < (now() - interval '30 days') THEN
    INSERT INTO public.aria_public_incidents(kind, detail, device_class, url)
    VALUES (
      'aria_corpus_stale',
      COALESCE('latest_official=' || _latest::text, 'no_official_corpus'),
      'ci',
      NULL
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.aria_scan_corpus_stale() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aria_scan_corpus_stale() TO service_role;

-- Audit retention
CREATE OR REPLACE FUNCTION public.aria_actions_log_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.aria_actions_log WHERE created_at < now() - interval '90 days';
END;
$$;

REVOKE ALL ON FUNCTION public.aria_actions_log_retention() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aria_actions_log_retention() TO service_role;

-- Schedule daily
DO $$ BEGIN PERFORM cron.unschedule('aria-corpus-stale-scan'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('aria-actions-log-retention'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('aria-corpus-stale-scan', '17 3 * * *',
  $$SELECT public.aria_scan_corpus_stale();$$);

SELECT cron.schedule('aria-actions-log-retention', '42 4 * * *',
  $$SELECT public.aria_actions_log_retention();$$);
