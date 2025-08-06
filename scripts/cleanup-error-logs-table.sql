-- Cleanup Script for error_logs table
-- Removes columns that are no longer needed after UI simplification.

-- Drop unnecessary columns from the error_logs table
ALTER TABLE public.error_logs
DROP COLUMN IF EXISTS context,
DROP COLUMN IF EXISTS dismissed_at,
DROP COLUMN IF EXISTS improved_at,
DROP COLUMN IF EXISTS improvement_score,
DROP COLUMN IF EXISTS last_seen,
DROP COLUMN IF EXISTS review_priority;

-- Verify the columns have been removed
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'error_logs';