
-- 1) learn_quiz_questions: RLS enabled but no policy → add authenticated read
CREATE POLICY "quiz questions readable by authenticated"
  ON public.learn_quiz_questions
  FOR SELECT TO authenticated
  USING (true);

-- 2) Replace overly-permissive "auth write" ALL policies with admin-only writes + authenticated read

-- intelligence_agents
DROP POLICY IF EXISTS "auth write agents" ON public.intelligence_agents;
CREATE POLICY "intelligence_agents read authenticated"
  ON public.intelligence_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "intelligence_agents admin write"
  ON public.intelligence_agents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "intelligence_agents admin update"
  ON public.intelligence_agents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "intelligence_agents admin delete"
  ON public.intelligence_agents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- evolution_proposals
DROP POLICY IF EXISTS "auth write proposals" ON public.evolution_proposals;
CREATE POLICY "evolution_proposals read authenticated"
  ON public.evolution_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "evolution_proposals admin write"
  ON public.evolution_proposals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "evolution_proposals admin update"
  ON public.evolution_proposals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "evolution_proposals admin delete"
  ON public.evolution_proposals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- evolution_log
DROP POLICY IF EXISTS "auth write log" ON public.evolution_log;
CREATE POLICY "evolution_log read authenticated"
  ON public.evolution_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "evolution_log admin write"
  ON public.evolution_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "evolution_log admin update"
  ON public.evolution_log FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "evolution_log admin delete"
  ON public.evolution_log FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
