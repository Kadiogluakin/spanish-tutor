-- Phase 5 Migration: Add missing tables for error logging and skill progress

-- Error logs table for tracking student mistakes
CREATE TABLE public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES public.learning_sessions(id),
  type TEXT NOT NULL CHECK (type IN ('grammar', 'vocabulary', 'pronunciation')),
  spanish TEXT NOT NULL,
  english TEXT NOT NULL,
  note TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill progress table for SRS tracking of language skills
CREATE TABLE public.skill_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  skill_code TEXT NOT NULL,
  sm2_easiness REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_due TIMESTAMP WITH TIME ZONE,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, skill_code)
);

-- Row Level Security policies
CREATE POLICY "Users can view own error logs" ON public.error_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own skill progress" ON public.skill_progress
  FOR ALL USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_session_id ON public.error_logs(session_id);
CREATE INDEX idx_error_logs_type ON public.error_logs(type);
CREATE INDEX idx_skill_progress_user_id ON public.skill_progress(user_id);
CREATE INDEX idx_skill_progress_next_due ON public.skill_progress(next_due);
CREATE INDEX idx_vocab_progress_user_id ON public.vocab_progress(user_id);
CREATE INDEX idx_vocab_progress_next_due ON public.vocab_progress(next_due);