-- Fix error_logs table by adding missing updated_at column
-- Run this in Supabase SQL Editor

-- Add the missing updated_at column
ALTER TABLE public.error_logs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have updated_at timestamps
UPDATE public.error_logs 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'error_logs' 
AND column_name = 'updated_at';