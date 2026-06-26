
-- Tighten audit_logs INSERT: actor_id & user_id must equal auth.uid() when present, and at least one must equal auth.uid()
DROP POLICY IF EXISTS audit_logs_org_insert ON public.audit_logs;
CREATE POLICY audit_logs_org_insert ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(org_id, 'operator'::org_role)
  AND (actor_id IS NOT NULL AND actor_id = auth.uid())
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- sec_visitors: require operators to attribute themselves on INSERT/UPDATE via created_by
-- Check column exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sec_visitors' AND column_name='created_by') THEN
    ALTER TABLE public.sec_visitors ADD COLUMN created_by uuid;
  END IF;
END $$;

DROP POLICY IF EXISTS sec_visitors_insert_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_insert_operator ON public.sec_visitors
FOR INSERT TO authenticated
WITH CHECK (
  is_org_member(org_id, 'operator'::org_role)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS sec_visitors_update_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_update_operator ON public.sec_visitors
FOR UPDATE TO authenticated
USING (is_org_member(org_id, 'operator'::org_role) AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK (is_org_member(org_id, 'operator'::org_role) AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS sec_visitors_delete_operator ON public.sec_visitors;
CREATE POLICY sec_visitors_delete_operator ON public.sec_visitors
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- email_unsubscribe_tokens: add explicit deny-all for anon/authenticated by ensuring no anon grant + cleanup of stale tokens
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

-- Cleanup function to purge used / expired tokens (run via cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_email_unsubscribe_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.email_unsubscribe_tokens
  WHERE used_at IS NOT NULL
     OR created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_email_unsubscribe_tokens() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_email_unsubscribe_tokens() TO service_role;
