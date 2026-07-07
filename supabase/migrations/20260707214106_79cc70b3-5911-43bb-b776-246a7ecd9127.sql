
-- ═══════════════════════════════════════════════════════════════════
-- ARIA Runtime Constitution — Self-learning & Self-healing tables
-- ═══════════════════════════════════════════════════════════════════
-- Powers INVARIANT-9..12: measure every reply, mine safe patterns,
-- inject high-confidence learned instincts, log incidents for evolution.

-- 1) aria_interactions — every question/answer with latency & satisfaction
CREATE TABLE public.aria_interactions (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  thread_id     UUID NULL,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  model         TEXT NOT NULL,
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  first_token_ms INTEGER NULL,
  tokens_in     INTEGER NULL,
  tokens_out    INTEGER NULL,
  satisfied     BOOLEAN NULL,
  retried       BOOLEAN NOT NULL DEFAULT FALSE,
  device_class  TEXT NULL,   -- mobile | tablet | desktop
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.aria_interactions TO authenticated;
GRANT ALL ON public.aria_interactions TO service_role;

ALTER TABLE public.aria_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own interactions"
  ON public.aria_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users write own interactions"
  ON public.aria_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own interactions"
  ON public.aria_interactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_aria_interactions_user_created
  ON public.aria_interactions (user_id, created_at DESC);


-- 2) aria_learned_patterns — mined patterns with confidence & hits
CREATE TABLE public.aria_learned_patterns (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pattern_key   TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  domain        TEXT NOT NULL DEFAULT 'general',
  confidence    NUMERIC(3,2) NOT NULL DEFAULT 0.30 CHECK (confidence >= 0 AND confidence <= 1),
  hits          INTEGER NOT NULL DEFAULT 1,
  safety_passed BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pattern_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aria_learned_patterns TO authenticated;
GRANT ALL ON public.aria_learned_patterns TO service_role;

ALTER TABLE public.aria_learned_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own patterns"
  ON public.aria_learned_patterns FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own patterns"
  ON public.aria_learned_patterns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_aria_learned_patterns_user_conf
  ON public.aria_learned_patterns (user_id, confidence DESC, last_seen DESC);


-- 3) aria_incidents — self-healing / degradation ledger
CREATE TABLE public.aria_incidents (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NULL REFERENCES auth.users ON DELETE SET NULL,
  kind         TEXT NOT NULL,          -- timeout | rate_limit | model_error | tts_failure | fallback
  detail       TEXT NOT NULL,
  model        TEXT NULL,
  device_class TEXT NULL,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.aria_incidents TO authenticated;
GRANT ALL ON public.aria_incidents TO service_role;

ALTER TABLE public.aria_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own incidents"
  ON public.aria_incidents FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users log own incidents"
  ON public.aria_incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX idx_aria_incidents_occurred
  ON public.aria_incidents (occurred_at DESC);
