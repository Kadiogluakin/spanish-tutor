-- CRITICAL SECURITY SETUP FOR YOUR SPANISH TUTOR APP
-- Run these commands in your Supabase SQL Editor

-- 1. ENABLE RLS ON USER DATA TABLES (if not already enabled)
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;

-- Note: error_logs, skill_progress, placement_logs already have RLS enabled from migrations
-- Note: user_profiles already has RLS enabled from migration

-- 2. CREATE USER ISOLATION POLICIES (Users can only access their own data)
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own learning sessions" ON public.learning_sessions;
DROP POLICY IF EXISTS "Users can manage own user progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage own vocab progress" ON public.vocab_progress;

CREATE POLICY "Users can manage own learning sessions" ON public.learning_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own user progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vocab progress" ON public.vocab_progress
  FOR ALL USING (auth.uid() = user_id);

-- 3. ALLOW READ ACCESS TO CURRICULUM DATA (lessons and vocabulary are public content)
-- Enable RLS but allow authenticated users to read
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can read vocabulary" ON public.vocabulary;

CREATE POLICY "Authenticated users can read lessons" ON public.lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read vocabulary" ON public.vocabulary
  FOR SELECT TO authenticated USING (true);

-- 4. CREATE SECURITY LOGGING TABLE (for monitoring)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security events (only users can see their own events)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow inserts from service role (API routes)
CREATE POLICY "Service role can insert security events" ON public.security_events
  FOR INSERT TO service_role WITH CHECK (true);

-- 5. CREATE PERFORMANCE INDEXES (improve query performance)
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_created ON public.learning_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson ON public.user_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_due ON public.vocab_progress(user_id, next_due) WHERE next_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON public.security_events(user_id, created_at DESC);

-- 6. CREATE SECURITY FUNCTION FOR API ROUTES
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_data JSONB DEFAULT NULL,
  ip_address TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (auth.uid(), event_type, event_data, ip_address::INET, user_agent)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 7. CLEAN UP ANY EXISTING CONFLICTING POLICIES (if you've run this before)
-- DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- 8. VERIFY SETUP (Run these to check everything worked)
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = t.schemaname 
    AND tablename = t.tablename
  ) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles', 'learning_sessions', 'user_progress', 
  'vocab_progress', 'error_logs', 'skill_progress', 
  'placement_logs', 'lessons', 'vocabulary', 'security_events'
)
ORDER BY tablename;

-- Expected output: All tables should have rls_enabled = true and policy_count > 0