-- Test script to check if error_logs table can be updated
-- Run this in Supabase SQL Editor while logged in as your user

-- First, let's see what error_logs exist for the current user
SELECT 
    id,
    type,
    spanish,
    english,
    status,
    user_id,
    created_at
FROM public.error_logs 
WHERE user_id = auth.uid()
LIMIT 5;

-- Check if RLS policies are blocking updates
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'error_logs';

-- Try a simple update (replace 'your-error-id-here' with an actual error ID from the first query)
-- UPDATE public.error_logs 
-- SET status = 'dismissed'
-- WHERE id = 'your-error-id-here' AND user_id = auth.uid();

-- Check current user ID
SELECT auth.uid() as current_user_id;