DROP POLICY IF EXISTS "authenticated_read_evolution_cycles" ON public.aria_evolution_cycles;

CREATE POLICY "admins_read_evolution_cycles"
  ON public.aria_evolution_cycles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));