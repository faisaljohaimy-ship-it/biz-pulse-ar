
-- Add ownership to sec_gates
ALTER TABLE public.sec_gates ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Recreate write policies with creator scope (admins can still manage all in their org)
DROP POLICY IF EXISTS sec_gates_insert_operator ON public.sec_gates;
DROP POLICY IF EXISTS sec_gates_update_operator ON public.sec_gates;
DROP POLICY IF EXISTS sec_gates_delete_operator ON public.sec_gates;

CREATE POLICY sec_gates_insert_operator ON public.sec_gates
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_member(org_id, 'operator'::org_role)
    AND created_by = auth.uid()
  );

CREATE POLICY sec_gates_update_operator ON public.sec_gates
  FOR UPDATE TO authenticated
  USING (
    is_org_member(org_id, 'operator'::org_role)
    AND (created_by = auth.uid() OR is_org_member(org_id, 'admin'::org_role))
  )
  WITH CHECK (
    is_org_member(org_id, 'operator'::org_role)
    AND (created_by = auth.uid() OR is_org_member(org_id, 'admin'::org_role))
  );

CREATE POLICY sec_gates_delete_operator ON public.sec_gates
  FOR DELETE TO authenticated
  USING (
    is_org_member(org_id, 'operator'::org_role)
    AND (created_by = auth.uid() OR is_org_member(org_id, 'admin'::org_role))
  );

-- Harden current_org_id: fail closed when no JWT claim and user has multiple memberships
CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _claim uuid;
  _count int;
  _only uuid;
BEGIN
  _claim := NULLIF(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}','')::uuid;
  IF _claim IS NOT NULL THEN
    RETURN _claim;
  END IF;

  SELECT count(*), min(org_id) INTO _count, _only
    FROM public.org_members
   WHERE user_id = auth.uid();

  -- Only auto-resolve when membership is unambiguous; otherwise fail closed.
  IF _count = 1 THEN
    RETURN _only;
  END IF;

  RETURN NULL;
END;
$$;
