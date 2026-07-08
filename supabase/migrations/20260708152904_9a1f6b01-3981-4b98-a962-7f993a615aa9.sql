-- 1) learn_quiz_questions: remove authenticated-read of correct_index
--    App reads via server admin client (supabaseAdmin) — clients never
--    query this table directly. Restrict SELECT to admins only.
DROP POLICY IF EXISTS "learn_quiz_questions_read_via_lesson" ON public.learn_quiz_questions;

CREATE POLICY "learn_quiz_questions_admin_read"
  ON public.learn_quiz_questions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) org_invitations: allow the invitee to look up their own pending,
--    unexpired invitation by matching the JWT email. Admin policies stay.
CREATE POLICY "invitee reads own pending invitation"
  ON public.org_invitations
  FOR SELECT
  TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower(COALESCE((auth.jwt() ->> 'email'), ''))
  );