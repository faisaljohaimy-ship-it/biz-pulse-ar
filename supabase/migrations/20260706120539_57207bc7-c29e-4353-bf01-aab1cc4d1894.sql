DROP POLICY IF EXISTS "authenticated can read lessons" ON public.learn_lessons;

CREATE POLICY "authenticated can read published lessons"
ON public.learn_lessons
FOR SELECT
TO authenticated
USING (
  published = true
  OR public.has_role(auth.uid(), 'admin'::app_role)
);