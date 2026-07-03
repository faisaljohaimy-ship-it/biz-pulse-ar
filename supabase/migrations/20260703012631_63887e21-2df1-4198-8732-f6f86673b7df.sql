-- ============================================================
-- Executive Knowledge Bridge — enterprise learning engine
-- ============================================================

-- 1) Lessons catalog ------------------------------------------------
CREATE TABLE public.learn_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'core',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  subtitle_ar text NOT NULL,
  subtitle_en text NOT NULL,
  summary_ar text NOT NULL,
  summary_en text NOT NULL,
  narration_ar text NOT NULL DEFAULT '',
  narration_en text NOT NULL DEFAULT '',
  objectives_ar jsonb NOT NULL DEFAULT '[]'::jsonb,
  objectives_en jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_url text,
  video_url text,
  video_duration_seconds int NOT NULL DEFAULT 0,
  simulation_kind text,
  aria_system_prompt_ar text NOT NULL DEFAULT '',
  aria_system_prompt_en text NOT NULL DEFAULT '',
  aria_suggested_prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiz_pass_score int NOT NULL DEFAULT 60,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.learn_lessons TO authenticated;
GRANT ALL ON public.learn_lessons TO service_role;
ALTER TABLE public.learn_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read lessons"
  ON public.learn_lessons FOR SELECT TO authenticated
  USING (true);

CREATE INDEX learn_lessons_order_idx ON public.learn_lessons (order_index);
CREATE INDEX learn_lessons_published_idx ON public.learn_lessons (published);

-- 2) Quiz questions -------------------------------------------------
-- Server-side only. Never exposed to the client raw (correct answers).
CREATE TABLE public.learn_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.learn_lessons(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  prompt_ar text NOT NULL,
  prompt_en text NOT NULL,
  options_ar jsonb NOT NULL,
  options_en jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation_ar text NOT NULL DEFAULT '',
  explanation_en text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No grant to authenticated; server functions read via service_role.
GRANT ALL ON public.learn_quiz_questions TO service_role;
ALTER TABLE public.learn_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX learn_quiz_questions_lesson_idx ON public.learn_quiz_questions (lesson_id, order_index);

-- 3) Per-user progress ---------------------------------------------
CREATE TABLE public.learn_lesson_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learn_lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  video_watched_seconds int NOT NULL DEFAULT 0,
  simulation_completed boolean NOT NULL DEFAULT false,
  quiz_best_score int NOT NULL DEFAULT 0,
  quiz_passed boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learn_lesson_progress TO authenticated;
GRANT ALL ON public.learn_lesson_progress TO service_role;
ALTER TABLE public.learn_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage their own progress"
  ON public.learn_lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Quiz attempts audit -------------------------------------------
CREATE TABLE public.learn_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.learn_lessons(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  score int NOT NULL,
  passed boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.learn_quiz_attempts TO authenticated;
GRANT ALL ON public.learn_quiz_attempts TO service_role;
ALTER TABLE public.learn_quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see their own attempts"
  ON public.learn_quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "users insert their own attempts"
  ON public.learn_quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX learn_quiz_attempts_user_lesson_idx ON public.learn_quiz_attempts (user_id, lesson_id, attempted_at DESC);

-- 5) Updated-at trigger reuse --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
      LANGUAGE plpgsql SET search_path = public AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $$;

CREATE TRIGGER update_learn_lessons_updated_at
  BEFORE UPDATE ON public.learn_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
