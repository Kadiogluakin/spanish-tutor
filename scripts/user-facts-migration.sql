-- Durable personal facts volunteered by the student during lessons.
-- Populated by the `remember_student_fact` realtime tool. Injected back into
-- the lesson prompt so Profesora Milagros can reference them across sessions
-- for narrative continuity ("tu perro Luna", "tu trabajo de diseñadora").
--
-- Facts are keyed by (user_id, key) so that an update to the same key
-- (e.g. "travel_plan") overwrites the previous value rather than piling up.
--
-- Run: psql ... -f scripts/user-facts-migration.sql
-- Or copy-paste into the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.user_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_facts_user_id ON public.user_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_updated_at ON public.user_facts(updated_at DESC);

-- Row-level security: users only see/modify their own facts.
ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_facts_select_own" ON public.user_facts;
CREATE POLICY "user_facts_select_own"
  ON public.user_facts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_facts_insert_own" ON public.user_facts;
CREATE POLICY "user_facts_insert_own"
  ON public.user_facts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_facts_update_own" ON public.user_facts;
CREATE POLICY "user_facts_update_own"
  ON public.user_facts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_facts_delete_own" ON public.user_facts;
CREATE POLICY "user_facts_delete_own"
  ON public.user_facts FOR DELETE
  USING (auth.uid() = user_id);
