// Level progression logic - Supabase version
import { createClient } from '@/lib/supabase/server';
import { getLessonsForLevel } from './curriculum';

export interface LevelProgressionResult {
  currentLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  shouldAdvance: boolean;
  nextLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  completionPercentage: number;
  lessonsCompleted: number;
  totalLessonsInLevel: number;
}

export interface UserProgressStats {
  userId: string;
  currentLevel: string;
  lessonsCompleted: number;
  totalLessons: number;
  completionPercentage: number;
  streakDays: number;
  totalStudyTime: number;
  recentSessions: Array<{
    lessonId: string;
    completedAt: string;
    duration: number;
  }>;
}

const LEVEL_PROGRESSION: Array<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'> = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Check if user should advance to next level and update if needed
 */
export async function checkAndUpdateUserLevel(userId: string): Promise<LevelProgressionResult> {
  try {
    // Create Supabase client
    const supabase = await createClient();
    
    // Get current user level from Supabase
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('User not found:', userError);
      // Return default for new user
      return {
        currentLevel: 'A1',
        shouldAdvance: false,
        completionPercentage: 0,
        lessonsCompleted: 0,
        totalLessonsInLevel: 0
      };
    }

    const currentLevel = userProfile.level_cefr as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    
    // Get all lessons for current level
    const allLessonsInLevel = await getLessonsForLevel(currentLevel);
    const totalLessonsInLevel = allLessonsInLevel.length;
    
    // Get completed lessons for this user
    const { data: completedLessons, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return {
        currentLevel,
        shouldAdvance: false,
        completionPercentage: 0,
        lessonsCompleted: 0,
        totalLessonsInLevel
      };
    }

    const completedLessonIds = completedLessons?.map(p => p.lesson_id) || [];

    // Count how many lessons in current level are completed
    const completedLessonsInCurrentLevel = allLessonsInLevel.filter(
      lesson => completedLessonIds.includes(lesson.id)
    ).length;

    const completionPercentage = totalLessonsInLevel > 0 
      ? Math.round((completedLessonsInCurrentLevel / totalLessonsInLevel) * 100)
      : 0;

    // Check if user completed all lessons in current level
    const shouldAdvance = completedLessonsInCurrentLevel >= totalLessonsInLevel && totalLessonsInLevel > 0;
    
    let nextLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | undefined;
    
    if (shouldAdvance) {
      const currentLevelIndex = LEVEL_PROGRESSION.indexOf(currentLevel);
      if (currentLevelIndex >= 0 && currentLevelIndex < LEVEL_PROGRESSION.length - 1) {
        nextLevel = LEVEL_PROGRESSION[currentLevelIndex + 1];
        
        // Automatically advance the user in Supabase
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ level_cefr: nextLevel })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating user level:', updateError);
        } else {
          console.log(`🎉 User ${userId} advanced from ${currentLevel} to ${nextLevel}!`);
        }
      }
    }

    return {
      currentLevel: nextLevel || currentLevel, // Return new level if advanced
      shouldAdvance,
      nextLevel,
      completionPercentage,
      lessonsCompleted: completedLessonsInCurrentLevel,
      totalLessonsInLevel
    };

  } catch (error) {
    console.error('Error checking user level progression:', error);
    return {
      currentLevel: 'A1',
      shouldAdvance: false,
      completionPercentage: 0,
      lessonsCompleted: 0,
      totalLessonsInLevel: 0
    };
  }
}

/**
 * Get detailed user progress statistics
 */
export async function getUserProgressStats(userId: string): Promise<UserProgressStats | null> {
  try {
    // Create Supabase client
    const supabase = await createClient();
    
    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('User not found:', userError);
      return null;
    }

    // Get user's completed lessons
    const { data: completedLessons, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return null;
    }

    // Get recent learning sessions
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error('Error fetching recent sessions:', sessionsError);
    }

    const currentLevel = userProfile.level_cefr;
    const lessonsCompleted = completedLessons?.length || 0;
    
    // Get total lessons for current level
    const allLessonsInLevel = await getLessonsForLevel(currentLevel);
    const totalLessons = allLessonsInLevel.length;
    
    const completionPercentage = totalLessons > 0 
      ? Math.round((lessonsCompleted / totalLessons) * 100)
      : 0;

    // Calculate total study time from sessions
    const totalStudyTime = recentSessions?.reduce((total, session) => 
      total + (session.duration_min || 0), 0) || 0;

    // Simple streak calculation (consecutive days with sessions)
    const streakDays = calculateStreakDays(recentSessions || []);

    return {
      userId,
      currentLevel,
      lessonsCompleted,
      totalLessons,
      completionPercentage,
      streakDays,
      totalStudyTime,
      recentSessions: (recentSessions || []).map(session => ({
        lessonId: session.lesson_id || '',
        completedAt: session.created_at,
        duration: session.duration_min || 0
      }))
    };

  } catch (error) {
    console.error('Error getting user progress stats:', error);
    return null;
  }
}

/**
 * Calculate user's learning streak in days
 */
function calculateStreakDays(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;

  const today = new Date();
  const sessionDates = sessions
    .map(session => new Date(session.created_at))
    .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (const sessionDate of sessionDates) {
    const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0 || daysDiff === 1) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  return streak;
}