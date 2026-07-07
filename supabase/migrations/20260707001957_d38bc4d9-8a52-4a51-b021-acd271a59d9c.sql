ALTER TABLE public.aria_decisions
  ADD COLUMN IF NOT EXISTS recommended_action text,
  ADD COLUMN IF NOT EXISTS next_step text;

COMMENT ON COLUMN public.aria_decisions.recommended_action IS 'Concrete executive action recommended by ARIA (independent of rationale narrative).';
COMMENT ON COLUMN public.aria_decisions.next_step IS 'Immediate next step to move the decision forward once approved.';