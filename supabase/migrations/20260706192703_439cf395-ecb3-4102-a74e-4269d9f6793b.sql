
-- Remove permissive always-true SELECT policies; keep RESTRICTIVE tenant isolation as the effective control
DROP POLICY IF EXISTS "auth read log" ON public.evolution_log;
DROP POLICY IF EXISTS "evolution_log read authenticated" ON public.evolution_log;
CREATE POLICY "evolution_log tenant read" ON public.evolution_log FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS "auth read proposals" ON public.evolution_proposals;
DROP POLICY IF EXISTS "evolution_proposals read authenticated" ON public.evolution_proposals;
CREATE POLICY "evolution_proposals tenant read" ON public.evolution_proposals FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));

DROP POLICY IF EXISTS "auth read agents" ON public.intelligence_agents;
DROP POLICY IF EXISTS "intelligence_agents read authenticated" ON public.intelligence_agents;
CREATE POLICY "intelligence_agents tenant read" ON public.intelligence_agents FOR SELECT TO authenticated USING (public.is_org_member(org_id, 'viewer'::org_role));

-- Hide quiz answer key from client reads via column-level revoke; grading must go through a server-side function
REVOKE SELECT (correct_index) ON public.learn_quiz_questions FROM authenticated, anon;
