-- Migration: Fix Review Feature correctness
-- 1. Add a dedicated SM-2 `reps` counter to vocab_progress and skill_progress.
--    Previously the review code hydrated SM-2's `reps` from `successes`, which is
--    a lifetime metric. A failure resets SM-2's reps to 0 but `successes` stayed,
--    so failed items were pushed FURTHER into the future (the opposite of SRS).
--
-- 2. Add SM-2 fields to error_logs so error-review practice can run on the same
--    algorithm without polluting skill_progress with `error_<uuid>` pseudo-skills.

BEGIN;

-- ---------------------------------------------------------------------------
-- vocab_progress
-- ---------------------------------------------------------------------------
ALTER TABLE public.vocab_progress
  ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.vocab_progress.reps IS
  'SM-2 consecutive-successful-repetitions counter. Resets to 0 on failure. '
  'Distinct from `successes` (which is a lifetime total).';

-- Seed existing rows: best-effort init from `successes`, capped at 20 to avoid
-- producing absurdly long first intervals for legacy rows.
UPDATE public.vocab_progress
SET reps = LEAST(COALESCE(successes, 0), 20)
WHERE reps = 0 AND successes > 0;

-- ---------------------------------------------------------------------------
-- skill_progress
-- ---------------------------------------------------------------------------
ALTER TABLE public.skill_progress
  ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.skill_progress.reps IS
  'SM-2 consecutive-successful-repetitions counter. Resets to 0 on failure.';

UPDATE public.skill_progress
SET reps = LEAST(COALESCE(successes, 0), 20)
WHERE reps = 0 AND successes > 0;

-- Clean up the pseudo-skills that the review queue previously injected for
-- error tracking (skill_code LIKE 'error_<uuid>'). Those now live in
-- error_logs with native SM-2 fields (see below).
DELETE FROM public.skill_progress
WHERE skill_code LIKE 'error\_%' ESCAPE '\';

-- ---------------------------------------------------------------------------
-- error_logs — native SRS fields so errors can be reviewed without piggy-
-- backing on skill_progress.
-- ---------------------------------------------------------------------------
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS sm2_easiness NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_due TIMESTAMPTZ;

COMMENT ON COLUMN public.error_logs.sm2_easiness IS 'SM-2 E-factor for this error-as-flashcard.';
COMMENT ON COLUMN public.error_logs.next_due IS 'When this error card is next due for review practice.';

-- Backfill next_due so existing rows surface immediately.
UPDATE public.error_logs
SET next_due = COALESCE(last_seen, created_at)
WHERE next_due IS NULL;

CREATE INDEX IF NOT EXISTS idx_error_logs_user_next_due
  ON public.error_logs(user_id, next_due);

COMMIT;
