CREATE TABLE public.aria_evolution_cycles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at   timestamptz NOT NULL,
  finished_at  timestamptz NOT NULL,
  trigger      text NOT NULL CHECK (trigger IN ('cron','manual','bootstrap')),
  decision     text NOT NULL CHECK (decision IN ('GO','NO_GO','GO_WITH_KNOWN_LIMITATIONS','UNKNOWN')),
  readiness_score numeric(4,3) NOT NULL DEFAULT 0,
  issues_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  applied_count integer NOT NULL DEFAULT 0,
  deferred_count integer NOT NULL DEFAULT 0,
  reasons      text[] NOT NULL DEFAULT '{}',
  report       jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX aria_evolution_cycles_started_idx
  ON public.aria_evolution_cycles (started_at DESC);

GRANT SELECT ON public.aria_evolution_cycles TO authenticated;
GRANT ALL    ON public.aria_evolution_cycles TO service_role;

ALTER TABLE public.aria_evolution_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_evolution_cycles"
  ON public.aria_evolution_cycles
  FOR SELECT
  TO authenticated
  USING (true);