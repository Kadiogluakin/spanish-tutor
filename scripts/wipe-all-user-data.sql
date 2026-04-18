-- =============================================================================
-- Wipe ALL learner-generated data (every user) — start fresh on app data
-- =============================================================================
-- Run in Supabase → SQL Editor (postgres role).
--
-- KEEPS: public.lessons, public.vocabulary (shared curriculum).
-- REMOVES: profiles, progress, sessions, homework, errors, facts, placement, etc.
--
-- After this, Auth users still exist (same emails/passwords) but see empty state.
-- To remove logins too, use the OPTIONAL block at the bottom OR Authentication → Users.
-- =============================================================================

BEGIN;

-- Dynamic SQL so missing optional tables do not abort the whole script
DO $$
BEGIN
  EXECUTE 'DELETE FROM public.learning_analytics';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'learning_analytics not present; skipped.';
END;
$$;

DELETE FROM public.submissions;
DELETE FROM public.homework;

DO $$
BEGIN
  EXECUTE 'DELETE FROM public.homework_submissions';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'homework_submissions not present; skipped.';
END;
$$;

DELETE FROM public.placement_logs;
DELETE FROM public.user_facts;
DELETE FROM public.error_logs;
DELETE FROM public.vocab_progress;
DELETE FROM public.skill_progress;
DELETE FROM public.user_progress;
DELETE FROM public.learning_sessions;
DELETE FROM public.user_profiles;

COMMIT;

-- -----------------------------------------------------------------------------
-- OPTIONAL: delete every Supabase Auth account (cannot log in again)
-- -----------------------------------------------------------------------------
-- Run ONLY after the transaction above succeeds. Child tables of auth.users first.
-- If a statement errors (table missing on your Supabase version), skip that line.
--
-- BEGIN;
-- DELETE FROM auth.refresh_tokens;
-- DELETE FROM auth.sessions;
-- DELETE FROM auth.identities;
-- DELETE FROM auth.users;
-- COMMIT;
--
-- Easiest: Dashboard → Authentication → Users → delete each user (or use the API
-- with the service role) once public data no longer references them.
