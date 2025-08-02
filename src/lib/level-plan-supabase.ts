// Lesson of the Day Logic - Supabase version
import { getLessonsForLevel, getLessonById, LessonContent } from './curriculum';
import { createClient } from '@/lib/supabase/server';

export interface LessonRecommendation {
  lesson: LessonContent;
  reason: string;
  priority: number; // 1-10 scale, 10 being highest priority
  type: 'new' | 'review' | 'remedial';
}

export interface DailyLessonPlan {
  recommendedLesson: LessonRecommendation;
  alternativeLessons: LessonRecommendation[];
  reviewItems: number; // number of items due for SRS review
  streakDays: number;
  nextMilestone: string;
}

/**
 * Get the lesson of the day for a specific user (simplified Supabase version)
 */
export async function getLessonOfTheDay(userId: string): Promise<DailyLessonPlan> {
  try {
    // Create Supabase client
    const supabase = await createClient();
    
    // Get user profile from Supabase
    let { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      // Create user profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          level_cefr: 'A1'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating user profile:', createError);
        // Return default plan for A1 level
        return getDefaultLessonPlan();
      }
      
      userProfile = newProfile; // Use the newly created profile
    }

    const userLevel = userProfile?.level_cefr || 'A1';

    // Get user's completed lessons
    const { data: completedLessons, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
    }

    const completedLessonIds = completedLessons?.map(p => p.lesson_id) || [];

    // Get available lessons for user's level
    const availableLessons = await getLessonsForLevel(userLevel);
    
    // Find next lesson to take
    const nextLesson = availableLessons.find(lesson => 
      !completedLessonIds.includes(lesson.id)
    );
    
    // Calculate progress for better display
    const totalLessons = availableLessons.length;
    const completedCount = completedLessonIds.filter(id => 
      availableLessons.some(lesson => lesson.id === id)
    ).length;

    if (nextLesson) {
      const lessonNumber = completedCount + 1;
      const progressPercent = Math.round((completedCount / totalLessons) * 100);
      
      const recommendation: LessonRecommendation = {
        lesson: nextLesson,
        reason: `Lesson ${lessonNumber} of ${totalLessons} • ${progressPercent}% complete in ${userLevel}`,
        priority: 8,
        type: 'new'
      };

      // Get alternative lessons
      const alternatives = availableLessons
        .filter(lesson => lesson.id !== nextLesson.id && !completedLessonIds.includes(lesson.id))
        .slice(0, 3)
        .map(lesson => ({
          lesson,
          reason: `Alternative ${userLevel} lesson`,
          priority: 6,
          type: 'new' as const
        }));

      return {
        recommendedLesson: recommendation,
        alternativeLessons: alternatives,
        reviewItems: 0, // TODO: Implement SRS review count
        streakDays: 0, // TODO: Calculate streak
        nextMilestone: `Complete ${userLevel} level`
      };
    } else {
      // User completed all lessons in current level
      return {
        recommendedLesson: {
          lesson: availableLessons[0], // Review first lesson
          reason: `Review ${userLevel} content - you've completed all lessons!`,
          priority: 7,
          type: 'review'
        },
        alternativeLessons: availableLessons.slice(1, 4).map(lesson => ({
          lesson,
          reason: `Review ${userLevel} lesson`,
          priority: 5,
          type: 'review' as const
        })),
        reviewItems: 0,
        streakDays: 0,
        nextMilestone: 'Ready to advance to next level!'
      };
    }

  } catch (error) {
    console.error('Error getting lesson of the day:', error);
    return getDefaultLessonPlan();
  }
}

/**
 * Default lesson plan when user data is not available
 */
async function getDefaultLessonPlan(): Promise<DailyLessonPlan> {
  const a1Lessons = await getLessonsForLevel('A1');
  const firstLesson = a1Lessons[0];

  if (!firstLesson) {
    throw new Error('No A1 lessons available');
  }

  return {
    recommendedLesson: {
      lesson: firstLesson,
      reason: 'Start your Spanish journey with this beginner lesson',
      priority: 10,
      type: 'new'
    },
    alternativeLessons: a1Lessons.slice(1, 4).map(lesson => ({
      lesson,
      reason: 'Alternative beginner lesson',
      priority: 8,
      type: 'new' as const
    })),
    reviewItems: 0,
    streakDays: 0,
    nextMilestone: 'Complete your first lesson!'
  };
}