-- MINIMAL SECURITY ENHANCEMENTS FOR YOUR SPANISH TUTOR APP
-- Since you already have RLS enabled and policies, this just adds missing pieces

-- 1. ADD SECURITY LOGGING TABLE (for monitoring suspicious activity)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own security events
CREATE POLICY "Users can view own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert security events (from API routes)
CREATE POLICY "Service role can insert security events" ON public.security_events
  FOR INSERT TO service_role WITH CHECK (true);

-- 2. ADD PERFORMANCE INDEXES (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_homework_user_created ON public.homework(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created ON public.submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_created ON public.learning_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson ON public.user_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_due ON public.vocab_progress(user_id, next_due) WHERE next_due IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON public.security_events(user_id, created_at DESC);

-- 3. CREATE SECURITY LOGGING FUNCTION (for API routes to use)
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

-- 4. CREATE SECURITY STATUS FUNCTION (for monitoring)
CREATE OR REPLACE FUNCTION public.get_user_security_status()
RETURNS TABLE (
  recent_events_count BIGINT,
  last_event_type TEXT,
  last_event_time TIMESTAMP WITH TIME ZONE,
  security_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_count BIGINT;
  last_event TEXT;
  last_time TIMESTAMP WITH TIME ZONE;
  score INTEGER;
BEGIN
  -- Count recent security events (last 24 hours)
  SELECT COUNT(*) INTO event_count
  FROM public.security_events
  WHERE user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Get last security event
  SELECT event_type, created_at INTO last_event, last_time
  FROM public.security_events
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate simple security score (100 - events in last 24h)
  score := GREATEST(0, 100 - event_count::INTEGER);
  
  RETURN QUERY SELECT 
    event_count,
    last_event,
    last_time,
    score;
END;
$$;

-- 5. VERIFY YOUR SECURITY SETUP
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = t.tablename
  ) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles', 'learning_sessions', 'user_progress', 
  'vocab_progress', 'error_logs', 'skill_progress', 
  'placement_logs', 'lessons', 'vocabulary', 'homework',
  'submissions', 'security_events'
)
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true and policy_count >= 1