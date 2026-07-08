-- 1) Missing plain started_at index on agent_runs (list view is not agent-scoped).
CREATE INDEX IF NOT EXISTS agent_runs_started_at_desc_idx
  ON public.agent_runs (started_at DESC);

-- 2) Fix RLS-enabled-no-policy on learn_quiz_questions: read follows lesson visibility.
GRANT SELECT ON public.learn_quiz_questions TO authenticated;

CREATE POLICY "learn_quiz_questions_read_via_lesson"
  ON public.learn_quiz_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.learn_lessons l
      WHERE l.id = learn_quiz_questions.lesson_id
    )
  );

-- 3) Document RLS-helper SECURITY DEFINER functions so the linter warning is
--    understood: RLS policies invoke these under the caller's role and require
--    EXECUTE. They only read from auth.uid()/claims/user_roles — no writes.
COMMENT ON FUNCTION public.has_role(uuid, app_role)
  IS 'RLS helper. SECURITY DEFINER + STABLE. Read-only. Intentionally executable by authenticated because policies call it.';
COMMENT ON FUNCTION public.is_org_member(uuid, org_role)
  IS 'RLS helper. SECURITY DEFINER + STABLE. Read-only. Intentionally executable by authenticated because policies call it.';
COMMENT ON FUNCTION public.current_org_id()
  IS 'RLS helper. SECURITY DEFINER + STABLE. Read-only. Intentionally executable by authenticated because policies call it.';