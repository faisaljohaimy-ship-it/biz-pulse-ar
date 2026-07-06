-- Fix 1: Restrict sap_connections SELECT to manager/admin (was open to viewer).
DROP POLICY IF EXISTS "sap_conn_org_read" ON public.sap_connections;

CREATE POLICY "sap_conn_org_read_privileged"
ON public.sap_connections
FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id()
  AND public.is_org_member(org_id, 'manager'::public.org_role)
);

-- Fix 2: ms_activity_log — remove org_id IS NULL bypass; strictly scope to caller org.
DROP POLICY IF EXISTS "ms_activity_org_read" ON public.ms_activity_log;

CREATE POLICY "ms_activity_org_read_strict"
ON public.ms_activity_log
FOR SELECT
TO authenticated
USING (
  org_id IS NOT NULL
  AND org_id = public.current_org_id()
);

-- Mark legacy NULL-org rows as legacy (kept for audit; invisible to normal reads).
UPDATE public.ms_activity_log
SET details = COALESCE(details, '{}'::jsonb) || jsonb_build_object('legacy_null_org', true)
WHERE org_id IS NULL;

-- Enforce NOT NULL only if no legacy NULLs remain.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ms_activity_log WHERE org_id IS NULL) THEN
    ALTER TABLE public.ms_activity_log ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;