// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client for frontend use (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (we'll generate these later)
export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          name: string | null
          age: number | null
          native_language: string | null
          learning_goals: string | null
          interests: string | null
          occupation: string | null
          location: string | null
          level_cefr: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          age?: number | null
          native_language?: string | null
          learning_goals?: string | null
          interests?: string | null
          occupation?: string | null
          location?: string | null
          level_cefr?: string | null
        }
        Update: {
          name?: string | null
          age?: number | null
          native_language?: string | null
          learning_goals?: string | null
          interests?: string | null
          occupation?: string | null
          location?: string | null
          level_cefr?: string | null
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          title: string
          cefr: string
          objectives: any | null
          content_refs: any | null
          created_at: string
        }
        Insert: {
          id: string
          title: string
          cefr: string
          objectives?: any | null
          content_refs?: any | null
        }
        Update: {
          title?: string
          cefr?: string
          objectives?: any | null
          content_refs?: any | null
        }
      }
      vocabulary: {
        Row: {
          id: string
          spanish: string
          english: string
          tags: any | null
          created_at: string
        }
        Insert: {
          id: string
          spanish: string
          english: string
          tags?: any | null
        }
        Update: {
          spanish?: string
          english?: string
          tags?: any | null
        }
      }
      learning_sessions: {
        Row: {
          id: string
          user_id: string | null
          lesson_id: string | null
          duration_min: number | null
          summary: string | null
          audio_url: string | null
          board_snapshot_url: string | null
          created_at: string
        }
        Insert: {
          user_id?: string | null
          lesson_id?: string | null
          duration_min?: number | null
          summary?: string | null
          audio_url?: string | null
          board_snapshot_url?: string | null
        }
        Update: {
          user_id?: string | null
          lesson_id?: string | null
          duration_min?: number | null
          summary?: string | null
          audio_url?: string | null
          board_snapshot_url?: string | null
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string | null
          lesson_id: string | null
          completed_at: string
          score: number | null
          time_spent_min: number | null
        }
        Insert: {
          user_id?: string | null
          lesson_id?: string | null
          score?: number | null
          time_spent_min?: number | null
        }
        Update: {
          user_id?: string | null
          lesson_id?: string | null
          completed_at?: string
          score?: number | null
          time_spent_min?: number | null
        }
      }
      homework: {
        Row: {
          id: string
          user_id: string
          lesson_id: string | null
          assigned_at: string
          due_at: string | null
          type: string
          prompt: string
          rubric_json: any | null
          created_at: string
        }
        Insert: {
          user_id: string
          lesson_id?: string | null
          due_at?: string | null
          type: string
          prompt: string
          rubric_json?: any | null
        }
        Update: {
          user_id?: string
          lesson_id?: string | null
          due_at?: string | null
          type?: string
          prompt?: string
          rubric_json?: any | null
        }
      }
      submissions: {
        Row: {
          id: string
          homework_id: string
          user_id: string
          text_content: string | null
          audio_url: string | null
          transcript: string | null
          submitted_at: string
          graded_at: string | null
          grade_json: any | null
          teacher_feedback: string | null
          score: number | null
          created_at: string
        }
        Insert: {
          homework_id: string
          user_id: string
          text_content?: string | null
          audio_url?: string | null
          transcript?: string | null
          teacher_feedback?: string | null
          score?: number | null
        }
        Update: {
          text_content?: string | null
          audio_url?: string | null
          transcript?: string | null
          graded_at?: string | null
          grade_json?: any | null
          teacher_feedback?: string | null
          score?: number | null
        }
      }
      vocab_progress: {
        Row: {
          id: string
          user_id: string | null
          vocab_id: string | null
          sm2_easiness: number
          interval_days: number
          next_due: string | null
          successes: number
          failures: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string | null
          vocab_id?: string | null
          sm2_easiness?: number
          interval_days?: number
          next_due?: string | null
          successes?: number
          failures?: number
        }
        Update: {
          user_id?: string | null
          vocab_id?: string | null
          sm2_easiness?: number
          interval_days?: number
          next_due?: string | null
          successes?: number
          failures?: number
          updated_at?: string
        }
      }
      error_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          type: string
          spanish: string
          english: string
          note: string
          count: number
          created_at: string
        }
        Insert: {
          user_id?: string | null
          session_id?: string | null
          type: string
          spanish: string
          english: string
          note: string
          count?: number
        }
        Update: {
          user_id?: string | null
          session_id?: string | null
          type?: string
          spanish?: string
          english?: string
          note?: string
          count?: number
        }
      }
      skill_progress: {
        Row: {
          id: string
          user_id: string | null
          skill_code: string
          sm2_easiness: number
          interval_days: number
          next_due: string | null
          successes: number
          failures: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string | null
          skill_code: string
          sm2_easiness?: number
          interval_days?: number
          next_due?: string | null
          successes?: number
          failures?: number
        }
        Update: {
          user_id?: string | null
          skill_code?: string
          sm2_easiness?: number
          interval_days?: number
          next_due?: string | null
          successes?: number
          failures?: number
          updated_at?: string
        }
      }
    }
  }
}