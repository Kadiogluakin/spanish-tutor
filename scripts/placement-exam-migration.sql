-- Migration: Add Placement Exam Support
-- Adds placement exam result storage and logging

-- Update user_profiles table to store placement results
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS placement_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS placement_scores JSONB;

-- Create placement_logs table for analytics and tracking
CREATE TABLE IF NOT EXISTS public.placement_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_level TEXT NOT NULL CHECK (recommended_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  recommended_unit INTEGER NOT NULL DEFAULT 1,
  recommended_lesson INTEGER NOT NULL DEFAULT 1,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  level_scores JSONB NOT NULL, -- Scores for each level (A1, A2, B1, B2)
  skill_scores JSONB NOT NULL, -- Scores for each skill (grammar, vocabulary, reading, culture)
  strengths TEXT[] DEFAULT '{}', -- Array of strength areas
  weaknesses TEXT[] DEFAULT '{}', -- Array of weakness areas  
  recommendations TEXT[] DEFAULT '{}', -- Array of personalized recommendations
  exam_duration_minutes INTEGER, -- How long the exam took
  total_questions INTEGER DEFAULT 0, -- Total questions in the exam
  questions_answered INTEGER DEFAULT 0, -- Questions actually answered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_placement_logs_user_id ON public.placement_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_logs_recommended_level ON public.placement_logs(recommended_level);
CREATE INDEX IF NOT EXISTS idx_placement_logs_confidence_score ON public.placement_logs(confidence_score);
CREATE INDEX IF NOT EXISTS idx_placement_logs_created_at ON public.placement_logs(created_at DESC);

-- Create composite index for user placement history
CREATE INDEX IF NOT EXISTS idx_placement_logs_user_date ON public.placement_logs(user_id, created_at DESC);

-- Row Level Security policies
CREATE POLICY "Users can view own placement logs" ON public.placement_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own placement logs" ON public.placement_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.placement_logs ENABLE ROW LEVEL SECURITY;

-- Note: Removed placement_analytics view due to security concerns
-- The view was using SECURITY DEFINER which bypassed RLS policies
-- If analytics are needed in the future, implement with proper SECURITY INVOKER
-- and appropriate RLS policies or use secure server-side queries instead

-- Create function to get user's placement history
CREATE OR REPLACE FUNCTION get_user_placement_history(target_user_id UUID)
RETURNS TABLE (
  exam_date TIMESTAMP WITH TIME ZONE,
  recommended_level TEXT,
  confidence_score INTEGER,
  strengths TEXT[],
  weaknesses TEXT[],
  recommendations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the requesting user is the target user
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: You can only view your own placement history';
  END IF;

  RETURN QUERY
  SELECT 
    pl.created_at,
    pl.recommended_level,
    pl.confidence_score,
    pl.strengths,
    pl.weaknesses,
    pl.recommendations
  FROM public.placement_logs pl
  WHERE pl.user_id = target_user_id
  ORDER BY pl.created_at DESC;
END;
$$;

-- Create trigger to update user profile when placement is completed
CREATE OR REPLACE FUNCTION update_user_profile_on_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the user profile with latest placement info
  UPDATE public.user_profiles 
  SET 
    level_cefr = NEW.recommended_level,
    placement_completed = TRUE,
    placement_scores = jsonb_build_object(
      'confidence_score', NEW.confidence_score,
      'level_scores', NEW.level_scores,
      'skill_scores', NEW.skill_scores,
      'last_placement_date', NEW.created_at
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_profile_on_placement ON public.placement_logs;
CREATE TRIGGER trigger_update_profile_on_placement
  AFTER INSERT ON public.placement_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profile_on_placement();

-- Add helpful comments
COMMENT ON TABLE public.placement_logs IS 'Stores results from Spanish placement exams for analytics and user tracking';
COMMENT ON COLUMN public.placement_logs.confidence_score IS 'Overall confidence score 0-100 based on exam performance';
COMMENT ON COLUMN public.placement_logs.level_scores IS 'JSON object with scores for each CEFR level (A1, A2, B1, B2)';
COMMENT ON COLUMN public.placement_logs.skill_scores IS 'JSON object with scores for each skill area (grammar, vocabulary, reading, culture)';
COMMENT ON COLUMN public.user_profiles.placement_completed IS 'Whether user has completed a placement exam';
COMMENT ON COLUMN public.user_profiles.placement_scores IS 'Latest placement exam results and metadata';

-- Insert some sample data for testing (optional - remove in production)
-- This helps validate the schema works correctly
/*
INSERT INTO public.placement_logs (
  user_id, 
  recommended_level, 
  recommended_unit, 
  recommended_lesson,
  confidence_score,
  level_scores,
  skill_scores,
  strengths,
  weaknesses,
  recommendations,
  exam_duration_minutes,
  total_questions,
  questions_answered
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use first available user
  'A2',
  2,
  1,
  75,
  '{"A1": 85, "A2": 70, "B1": 45, "B2": 20}'::jsonb,
  '{"grammar": 80, "vocabulary": 85, "reading": 65, "culture": 70}'::jsonb,
  ARRAY['vocabulary', 'culture'],
  ARRAY['grammar'],
  ARRAY['Focus on verb conjugations and tenses', 'Practice reading comprehension'],
  18,
  20,
  19
) ON CONFLICT DO NOTHING;
*/