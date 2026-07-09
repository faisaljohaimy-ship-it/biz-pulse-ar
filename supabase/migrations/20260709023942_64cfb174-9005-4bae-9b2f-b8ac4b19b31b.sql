CREATE OR REPLACE FUNCTION public.current_org_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _claim uuid;
  _count int;
  _only uuid;
BEGIN
  _claim := NULLIF(current_setting('request.jwt.claims', true)::jsonb #>> '{app_metadata,current_org}','')::uuid;
  IF _claim IS NOT NULL THEN
    RETURN _claim;
  END IF;

  SELECT count(*) INTO _count
    FROM public.org_members
   WHERE user_id = auth.uid();

  -- Only auto-resolve when membership is unambiguous; otherwise fail closed.
  IF _count = 1 THEN
    SELECT org_id INTO _only
      FROM public.org_members
     WHERE user_id = auth.uid()
     LIMIT 1;
    RETURN _only;
  END IF;

  RETURN NULL;
END;
$function$;