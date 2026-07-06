DROP POLICY IF EXISTS "quiz questions readable by authenticated" ON public.learn_quiz_questions;
REVOKE SELECT ON public.learn_quiz_questions FROM authenticated;
REVOKE SELECT ON public.learn_quiz_questions FROM anon;