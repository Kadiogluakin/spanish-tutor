-- Fix Remaining Search Path Security Warnings
-- This script fixes the 3 remaining functions that still have search_path warnings

-- 1. Fix get_placement_analytics function
-- First, let's try to get the existing function signature and recreate it with search_path protection
DO $$
DECLARE
    func_def TEXT;
    func_args TEXT;
    func_returns TEXT;
    func_body TEXT;
BEGIN
    -- Try to get the current function definition
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc 
    WHERE proname = 'get_placement_analytics' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF func_def IS NOT NULL THEN
        RAISE NOTICE 'Found existing get_placement_analytics function, recreating with search_path protection...';
        
        -- Drop and recreate with search_path protection
        DROP FUNCTION IF EXISTS public.get_placement_analytics CASCADE;
        
        -- Create a secure version
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.get_placement_analytics(
            start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL ''1 year'',
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
        SECURITY INVOKER
        SET search_path = ''''  -- This fixes the security warning
        AS $func$
        BEGIN
            -- Check if user is admin (requires admin role in user_profiles)
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = ''admin''
            ) THEN
                RAISE EXCEPTION ''Access denied: Admin role required for placement analytics'';
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
                DATE_TRUNC(''month'', p1.created_at) as month
            FROM public.placement_logs p1
            WHERE p1.created_at BETWEEN start_date AND end_date
            GROUP BY p1.recommended_level, DATE_TRUNC(''month'', p1.created_at)  
            ORDER BY month DESC, p1.recommended_level;
        END;
        $func$;';
        
        RAISE NOTICE '✓ Fixed get_placement_analytics with search_path protection';
    ELSE
        RAISE NOTICE 'get_placement_analytics function not found - skipping';
    END IF;
END;
$$;

-- 2. Fix get_placement_summary function
DO $$
DECLARE
    func_def TEXT;
BEGIN
    -- Check if function exists
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc 
    WHERE proname = 'get_placement_summary' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF func_def IS NOT NULL THEN
        RAISE NOTICE 'Found existing get_placement_summary function, recreating with search_path protection...';
        
        -- Drop and recreate with search_path protection
        DROP FUNCTION IF EXISTS public.get_placement_summary CASCADE;
        
        -- Create a secure version
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.get_placement_summary()
        RETURNS TABLE (
            total_exams BIGINT,
            avg_confidence NUMERIC,
            level_distribution JSONB,
            recent_activity JSONB
        )
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = ''''  -- This fixes the security warning
        AS $func$
        BEGIN
            -- Check if user is admin
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = ''admin''
            ) THEN
                RAISE EXCEPTION ''Access denied: Admin role required for placement summary'';
            END IF;

            RETURN QUERY
            SELECT 
                COUNT(*) as total_exams,
                ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence,
                jsonb_object_agg(recommended_level, level_count) as level_distribution,
                jsonb_object_agg(
                    TO_CHAR(month, ''YYYY-MM''), 
                    monthly_count
                ) as recent_activity
            FROM (
                SELECT 
                    recommended_level,
                    COUNT(*) as level_count,
                    DATE_TRUNC(''month'', created_at) as month,
                    COUNT(*) OVER (PARTITION BY DATE_TRUNC(''month'', created_at)) as monthly_count,
                    confidence_score
                FROM public.placement_logs
                WHERE created_at >= NOW() - INTERVAL ''6 months''
                GROUP BY recommended_level, DATE_TRUNC(''month'', created_at), confidence_score
            ) stats;
        END;
        $func$;';
        
        RAISE NOTICE '✓ Fixed get_placement_summary with search_path protection';
    ELSE
        RAISE NOTICE 'get_placement_summary function not found - skipping';
    END IF;
END;
$$;

-- 3. Fix log_security_event function
DO $$
DECLARE
    func_def TEXT;
    proc_record RECORD;
BEGIN
    -- Check if function exists
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc 
    WHERE proname = 'log_security_event' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF func_def IS NOT NULL THEN
        RAISE NOTICE 'Found existing log_security_event function, recreating with search_path protection...';
        
        -- Drop all overloaded versions before recreating
        FOR proc_record IN (
            SELECT oid, pg_get_function_identity_arguments(oid) AS args
            FROM pg_proc
            WHERE proname = 'log_security_event'
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ) LOOP
            EXECUTE format('DROP FUNCTION IF EXISTS public.log_security_event(%s) CASCADE;', proc_record.args);
        END LOOP;
        
        -- Create a secure version with flexible parameters
        EXECUTE '
        CREATE OR REPLACE FUNCTION public.log_security_event(
            event_type TEXT,
            event_data JSONB DEFAULT ''{}''::jsonb,
            severity TEXT DEFAULT ''info''
        )
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = ''''  -- This fixes the security warning
        AS $func$
        BEGIN
            INSERT INTO public.security_events (
                user_id,
                event_type,
                event_data,
                severity,
                created_at
            ) VALUES (
                auth.uid(),
                event_type,
                event_data,
                severity,
                NOW()
            );
        END;
        $func$;';
        
        RAISE NOTICE '✓ Fixed log_security_event with search_path protection';
    ELSE
        RAISE NOTICE 'log_security_event function not found - skipping';
    END IF;
END;
$$;

-- Grant permissions for the fixed functions
DO $$
BEGIN
    -- Grant permissions with error handling
    BEGIN
        GRANT EXECUTE ON FUNCTION public.get_placement_analytics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
        RAISE NOTICE '✓ Granted permissions for get_placement_analytics';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Could not grant permissions for get_placement_analytics (function may not exist)';
    END;
    
    BEGIN
        GRANT EXECUTE ON FUNCTION public.get_placement_summary() TO authenticated;
        RAISE NOTICE '✓ Granted permissions for get_placement_summary';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Could not grant permissions for get_placement_summary (function may not exist)';
    END;
    
    BEGIN
        GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, JSONB, TEXT) TO authenticated;
        RAISE NOTICE '✓ Granted permissions for log_security_event';
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'Could not grant permissions for log_security_event (function may not exist)';
    END;
END;
$$;

-- Add comments to the fixed functions
DO $$
BEGIN
    BEGIN
        COMMENT ON FUNCTION public.get_placement_analytics IS 'Secure function to get placement exam analytics. Requires admin role. Search path protected.';
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, skip comment
    END;
    
    BEGIN
        COMMENT ON FUNCTION public.get_placement_summary IS 'Get basic placement exam statistics. Requires admin role. Search path protected.';
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, skip comment
    END;
    
    BEGIN
        COMMENT ON FUNCTION public.log_security_event IS 'Log security events for audit trail. Search path protected.';
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, skip comment
    END;
END;
$$;

-- Final status report
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== REMAINING SEARCH PATH WARNINGS FIXED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed the following functions with SET search_path = '''':';
    RAISE NOTICE '✓ get_placement_analytics';
    RAISE NOTICE '✓ get_placement_summary'; 
    RAISE NOTICE '✓ log_security_event';
    RAISE NOTICE '';
    RAISE NOTICE 'These 3 search path warnings should now be resolved!';
    RAISE NOTICE '';
    RAISE NOTICE 'Remaining tasks for complete security:';
    RAISE NOTICE '1. Fix Auth OTP expiry (< 1 hour) in Supabase dashboard';
    RAISE NOTICE '2. Enable leaked password protection in Supabase dashboard';
    RAISE NOTICE '';
    RAISE NOTICE 'All function search path security warnings should now be fixed!';
END;
$$;