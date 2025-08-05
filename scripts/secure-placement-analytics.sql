-- Secure Placement Analytics Implementation
-- This replaces the insecure view with proper security controls

-- First, ensure user_profiles table has an admin role column (if not exists)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin'));

-- Create index for performance on role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Create a secure function to get placement analytics (SECURITY INVOKER - respects RLS)
CREATE OR REPLACE FUNCTION get_placement_analytics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '1 year',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    recommended_level TEXT,
    total_exams BIGINT,
    avg_confidence NUMERIC,
    avg_completion_rate NUMERIC,
    avg_duration_minutes NUMERIC,
    most_common_strength TEXT,
    most_common_weakness TEXT,
    month TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY INVOKER  -- This is crucial - respects RLS policies
AS $$
BEGIN
    -- Check if user is admin (this will respect RLS)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required for placement analytics';
    END IF;

    RETURN QUERY
    SELECT 
        p1.recommended_level,
        COUNT(*) as total_exams,
        ROUND(AVG(p1.confidence_score)::numeric, 2) as avg_confidence,
        ROUND((AVG(p1.questions_answered::float / NULLIF(p1.total_questions::float, 0)) * 100)::numeric, 2) as avg_completion_rate,
        ROUND(AVG(p1.exam_duration_minutes)::numeric, 2) as avg_duration_minutes,
        -- Most common strength
        (
            SELECT strength 
            FROM (
                SELECT unnest(strengths) as strength, COUNT(*) as count
                FROM public.placement_logs p2 
                WHERE p2.recommended_level = p1.recommended_level
                AND p2.created_at BETWEEN start_date AND end_date
                GROUP BY strength
                ORDER BY count DESC
                LIMIT 1
            ) top_strength
        ) as most_common_strength,
        -- Most common weakness  
        (
            SELECT weakness
            FROM (
                SELECT unnest(weaknesses) as weakness, COUNT(*) as count
                FROM public.placement_logs p2
                WHERE p2.recommended_level = p1.recommended_level
                AND p2.created_at BETWEEN start_date AND end_date
                GROUP BY weakness
                ORDER BY count DESC
                LIMIT 1
            ) top_weakness
        ) as most_common_weakness,
        DATE_TRUNC('month', p1.created_at) as month
    FROM public.placement_logs p1
    WHERE p1.created_at BETWEEN start_date AND end_date
    GROUP BY p1.recommended_level, DATE_TRUNC('month', p1.created_at)  
    ORDER BY month DESC, p1.recommended_level;
END;
$$;

-- Create a simpler function for basic stats (also secure)
CREATE OR REPLACE FUNCTION get_placement_summary()
RETURNS TABLE (
    total_exams BIGINT,
    avg_confidence NUMERIC,
    level_distribution JSONB,
    recent_activity JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER
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
        (SELECT COUNT(*) FROM public.placement_logs)::BIGINT as total_exams,
        (SELECT ROUND(AVG(confidence_score)::numeric, 2) FROM public.placement_logs) as avg_confidence,
        (
            SELECT jsonb_object_agg(recommended_level, level_count)
            FROM (
                SELECT recommended_level, COUNT(*) as level_count
                FROM public.placement_logs 
                GROUP BY recommended_level
                ORDER BY recommended_level
            ) level_stats
        ) as level_distribution,
        (
            SELECT jsonb_build_object(
                'last_7_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
                'last_30_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
                'last_90_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days')
            )
            FROM public.placement_logs
        ) as recent_activity;
END;
$$;

-- Optional: Create a view that's properly secured (alternative approach)
CREATE OR REPLACE VIEW public.placement_analytics_secure
WITH (security_invoker = true) AS
SELECT 
    recommended_level,
    COUNT(*) as total_exams,
    ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
    ROUND((AVG(questions_answered::float / NULLIF(total_questions::float, 0)) * 100)::numeric, 2) as avg_completion_rate,
    ROUND(AVG(exam_duration_minutes)::numeric, 2) as avg_duration_minutes,
    DATE_TRUNC('month', created_at) as month
FROM public.placement_logs
WHERE 
    -- Only allow access if user is admin
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
GROUP BY recommended_level, DATE_TRUNC('month', created_at)
ORDER BY month DESC, recommended_level;

-- Add RLS policy for the view (extra security layer)
ALTER VIEW public.placement_analytics_secure OWNER TO postgres;

-- Grant permissions to authenticated users (they still need admin role to see data)
GRANT SELECT ON public.placement_analytics_secure TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_placement_analytics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_placement_summary() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_placement_analytics IS 'Secure function to get placement exam analytics. Requires admin role.';
COMMENT ON FUNCTION get_placement_summary IS 'Get basic placement exam statistics. Requires admin role.';
COMMENT ON VIEW public.placement_analytics_secure IS 'Secure view for placement analytics with SECURITY INVOKER and admin role check.';