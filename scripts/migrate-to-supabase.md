# Migration to Supabase - Step by Step Guide

## 1. Setup Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Create new project: "spanish-tutor"
4. Choose region closest to your users
5. Wait for database provisioning (~2 minutes)

## 2. Get Connection Details

In your Supabase dashboard:
- Go to Settings → API
- Copy these values:
  - `Project URL`
  - `anon public key`
  - `service_role key` (keep secret!)

## 3. Environment Variables

Create/update `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Remove old database URL
# DATABASE_URL=./local.db  # DELETE THIS
```

## 4. Install Supabase Client

```bash
npm install @supabase/supabase-js
npm uninstall better-sqlite3 drizzle-orm  # Remove SQLite dependencies
```

## 5. Database Schema Migration

In Supabase SQL Editor, run:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  level_cefr TEXT DEFAULT 'A1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons table
CREATE TABLE public.lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cefr TEXT NOT NULL,
  objectives JSONB,
  content_refs JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vocabulary table
CREATE TABLE public.vocabulary (
  id TEXT PRIMARY KEY,
  spanish TEXT NOT NULL,
  english TEXT NOT NULL,
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning sessions table
CREATE TABLE public.learning_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  lesson_id TEXT REFERENCES public.lessons(id),
  duration_min INTEGER DEFAULT 0,
  summary TEXT,
  audio_url TEXT,
  board_snapshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  lesson_id TEXT REFERENCES public.lessons(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  score INTEGER,
  time_spent_min INTEGER,
  UNIQUE(user_id, lesson_id)
);

-- Vocabulary progress (SRS)
CREATE TABLE public.vocab_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  vocab_id TEXT REFERENCES public.vocabulary(id),
  sm2_easiness REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_due TIMESTAMP WITH TIME ZONE,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, vocab_id)
);

-- Row Level Security Policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own sessions" ON public.learning_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vocab progress" ON public.vocab_progress
  FOR ALL USING (auth.uid() = user_id);

-- Everyone can read lessons and vocabulary
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view vocabulary" ON public.vocabulary
  FOR SELECT USING (true);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;
```

## 6. Benefits After Migration

✅ **Multi-user ready**: Each user has their own progress
✅ **Scalable**: Handles thousands of users
✅ **Real-time**: Live lesson updates
✅ **Secure**: Row-level security built-in
✅ **Free**: 500MB database, 50K MAU
✅ **Backup**: Automatic daily backups
✅ **Analytics**: Built-in usage analytics

## 7. Code Changes Needed

- Replace SQLite client with Supabase client
- Update authentication to use Supabase Auth
- Modify database queries for PostgreSQL
- Add user registration flow

Would you like me to implement these changes?