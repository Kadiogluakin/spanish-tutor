-- Migration: Enhance Error Tracking with Status Management
-- Adds status fields for manual dismissal and improvement tracking

-- Add new columns to error_logs table
ALTER TABLE public.error_logs 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'improved', 'mastered')),
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS improved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS improvement_score INTEGER DEFAULT 0 CHECK (improvement_score >= 0 AND improvement_score <= 10),
ADD COLUMN IF NOT EXISTS review_priority INTEGER DEFAULT 5 CHECK (review_priority >= 1 AND review_priority <= 10),
ADD COLUMN IF NOT EXISTS context TEXT;

-- Update existing records to have proper last_seen timestamps
UPDATE public.error_logs 
SET last_seen = created_at 
WHERE last_seen IS NULL;

-- Create index for status-based queries
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON public.error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_status ON public.error_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_error_logs_review_priority ON public.error_logs(review_priority DESC, count DESC);

-- Create function to update error status
CREATE OR REPLACE FUNCTION update_error_status(
  error_id UUID,
  new_status TEXT,
  improvement_score INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the error belongs to the authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM public.error_logs 
    WHERE id = error_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Error not found or access denied';
  END IF;

  -- Update the error status
  UPDATE public.error_logs
  SET 
    status = new_status,
    dismissed_at = CASE WHEN new_status = 'dismissed' THEN NOW() ELSE dismissed_at END,
    improved_at = CASE WHEN new_status IN ('improved', 'mastered') THEN NOW() ELSE improved_at END,
    improvement_score = COALESCE(improvement_score, error_logs.improvement_score),
    review_priority = CASE 
      WHEN new_status = 'dismissed' THEN 1
      WHEN new_status = 'improved' THEN 3
      WHEN new_status = 'mastered' THEN 1
      ELSE review_priority
    END
  WHERE id = error_id;

  -- If marked as improved/mastered, update related vocabulary/skill progress
  IF new_status IN ('improved', 'mastered') THEN
    -- Update vocabulary progress if this error relates to vocabulary
    UPDATE public.vocab_progress 
    SET 
      sm2_easiness = LEAST(sm2_easiness + 0.2, 4.0),
      successes = successes + 1
    WHERE user_id = auth.uid() 
      AND EXISTS (
        SELECT 1 FROM public.error_logs e 
        WHERE e.id = error_id 
          AND e.type = 'vocabulary'
          AND vocab_progress.vocab_id::text = e.spanish
      );
  END IF;

  RETURN TRUE;
END;
$$;

-- Create function to get user errors with filtering
CREATE OR REPLACE FUNCTION get_user_errors(
  target_user_id UUID,
  status_filter TEXT DEFAULT 'active',
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  spanish TEXT,
  english TEXT,
  note TEXT,
  count INTEGER,
  status TEXT,
  improvement_score INTEGER,
  review_priority INTEGER,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  days_since_last_seen INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is the target user
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only view your own errors';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.type,
    e.spanish,
    e.english,
    e.note,
    e.count,
    e.status,
    e.improvement_score,
    e.review_priority,
    e.last_seen,
    e.created_at,
    EXTRACT(DAY FROM NOW() - e.last_seen)::INTEGER as days_since_last_seen
  FROM public.error_logs e
  WHERE e.user_id = target_user_id
    AND (status_filter = 'all' OR e.status = status_filter)
  ORDER BY 
    e.review_priority DESC,
    e.count DESC,
    e.last_seen DESC
  LIMIT limit_count;
END;
$$;

-- Add RLS policy for the new function
CREATE POLICY "Users can update own error status" ON public.error_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON COLUMN public.error_logs.status IS 'Current status: active, dismissed, improved, mastered';
COMMENT ON COLUMN public.error_logs.improvement_score IS 'User-rated improvement score 0-10';
COMMENT ON COLUMN public.error_logs.review_priority IS 'Priority for review system 1-10 (10=highest)';
COMMENT ON COLUMN public.error_logs.context IS 'Context where error occurred (lesson, homework, etc.)';
COMMENT ON FUNCTION update_error_status IS 'Updates error status and syncs with SRS system';
COMMENT ON FUNCTION get_user_errors IS 'Gets user errors with filtering and priority sorting';