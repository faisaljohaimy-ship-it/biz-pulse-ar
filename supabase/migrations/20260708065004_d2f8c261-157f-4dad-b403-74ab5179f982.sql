
-- Orphaned NULL-owner rows are unattributable; remove them (audit log lives in aria_audit).
DELETE FROM public.aria_incidents WHERE user_id IS NULL;

ALTER TABLE public.aria_incidents
  ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users read own incidents" ON public.aria_incidents;
DROP POLICY IF EXISTS "Users log own incidents" ON public.aria_incidents;

CREATE POLICY "Owners read own incidents"
  ON public.aria_incidents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners log own incidents"
  ON public.aria_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
