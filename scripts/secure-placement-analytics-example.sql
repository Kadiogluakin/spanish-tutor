-- EXAMPLE: Secure placement analytics implementation
-- Only create this if you actually need analytics functionality

-- Option A: Secure view with SECURITY INVOKER (respects RLS)
CREATE OR REPLACE VIEW public.placement_analytics
WITH (security_invoker = true) AS
SELECT 
  recommended_level,
  COUNT(*) as total_exams,
  AVG(confidence_score) as avg_confidence,
  AVG(questions_answered::float / total_questions::float * 100) as avg_completion_rate,
  AVG(exam_duration_minutes) as avg_duration_minutes,
  DATE_TRUNC('month', created_at) as month
FROM public.placement_logs
GROUP BY recommended_level, DATE_TRUNC('month', created_at)
ORDER BY month DESC, recommended_level;

-- Add RLS policy for the view (admin access only)
CREATE POLICY "Only admins can view placement analytics" ON public.placement_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on the view
ALTER VIEW public.placement_analytics ENABLE ROW LEVEL SECURITY;

-- Option B: Secure function approach (recommended)
CREATE OR REPLACE FUNCTION get_placement_analytics()
RETURNS TABLE (
  recommended_level TEXT,
  total_exams BIGINT,
  avg_confidence NUMERIC,
  avg_completion_rate NUMERIC,
  avg_duration_minutes NUMERIC,
  month TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY INVOKER -- This is the key security setting
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    pl.recommended_level,
    COUNT(*) as total_exams,
    AVG(pl.confidence_score) as avg_confidence,
    AVG(pl.questions_answered::float / pl.total_questions::float * 100) as avg_completion_rate,
    AVG(pl.exam_duration_minutes) as avg_duration_minutes,
    DATE_TRUNC('month', pl.created_at) as month
  FROM public.placement_logs pl
  GROUP BY pl.recommended_level, DATE_TRUNC('month', pl.created_at)
  ORDER BY month DESC, pl.recommended_level;
END;
$$;