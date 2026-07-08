DROP POLICY IF EXISTS learn_quiz_questions_read_via_lesson ON public.learn_quiz_questions;

CREATE POLICY learn_quiz_questions_read_via_lesson
ON public.learn_quiz_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.learn_lessons l
    WHERE l.id = learn_quiz_questions.lesson_id
      AND (l.published = true OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);