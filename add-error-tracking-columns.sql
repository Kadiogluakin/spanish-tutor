-- Add Error Tracking Columns to Supabase Database
-- Run this script in the Supabase SQL Editor

-- First, check if columns already exist and add them if they don't
DO $$ 
BEGIN
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'status') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'improved', 'mastered'));
    END IF;

    -- Add dismissed_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'dismissed_at') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN dismissed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add improved_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'improved_at') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN improved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add last_seen column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'last_seen') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add improvement_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'improvement_score') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN improvement_score INTEGER DEFAULT 0 CHECK (improvement_score >= 0 AND improvement_score <= 10);
    END IF;

    -- Add review_priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'review_priority') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN review_priority INTEGER DEFAULT 5 CHECK (review_priority >= 1 AND review_priority <= 10);
    END IF;

    -- Add context column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'error_logs' AND column_name = 'context') THEN
        ALTER TABLE public.error_logs 
        ADD COLUMN context TEXT;
    END IF;

END $$;

-- Update existing records to have proper last_seen timestamps
UPDATE public.error_logs 
SET last_seen = created_at 
WHERE last_seen IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON public.error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_status ON public.error_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_error_logs_review_priority ON public.error_logs(review_priority DESC, count DESC);

-- Add RLS policy for updates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'error_logs' 
        AND policyname = 'Users can update own error status'
    ) THEN
        CREATE POLICY "Users can update own error status" ON public.error_logs
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.error_logs.status IS 'Current status: active, dismissed, improved, mastered';
COMMENT ON COLUMN public.error_logs.improvement_score IS 'User-rated improvement score 0-10';
COMMENT ON COLUMN public.error_logs.review_priority IS 'Priority for review system 1-10 (10=highest)';
COMMENT ON COLUMN public.error_logs.context IS 'Context where error occurred (lesson, homework, etc.)';

-- Verify the columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'error_logs' 
AND column_name IN ('status', 'dismissed_at', 'improved_at', 'last_seen', 'improvement_score', 'review_priority', 'context')
ORDER BY column_name;