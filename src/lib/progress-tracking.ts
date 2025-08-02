// Progress Tracking & SRS Updates for Phase 5
// Handles skill and vocabulary progress updates based on performance

import { createClient } from '@/lib/supabase/server';
import { sm2, SrsState } from '@/lib/srs';
import { v4 as uuidv4 } from 'uuid';

export interface ProgressUpdate {
  userId: string;
  lessonId: string;
  sessionId?: string;
  skillAssessment: {
    grammar: number;
    vocabulary: number;
    pronunciation: number;
    fluency: number;
  };
  vocabularyWords?: string[];
  performanceScore?: number;
}

export interface SkillUpdate {
  skillCode: string;
  performance: number; // 0-10 scale
  success: boolean;
}

/**
 * Update skill progress based on lesson performance
 */
export async function updateSkillProgress(
  userId: string,
  skillUpdates: SkillUpdate[]
): Promise<void> {
  const supabase = await createClient();

  for (const update of skillUpdates) {
    try {
      // Get existing skill progress
      const { data: existingProgress } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('skill_code', update.skillCode)
        .single();

      if (existingProgress) {
        // Update existing progress using SM-2 algorithm
        const currentState: SrsState = {
          easiness: existingProgress.sm2_easiness,
          interval: existingProgress.interval_days,
          reps: existingProgress.successes
        };

        // Convert 0-10 performance to 0-5 SM-2 rating
        const sm2Rating = Math.min(5, Math.max(0, Math.round(update.performance / 2))) as 0|1|2|3|4|5;
        const newState = sm2(sm2Rating, currentState);

        // Calculate next due date
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + newState.interval);

        // Update the progress
        await supabase
          .from('skill_progress')
          .update({
            sm2_easiness: newState.easiness,
            interval_days: newState.interval,
            next_due: nextDue.toISOString(),
            successes: update.success ? existingProgress.successes + 1 : existingProgress.successes,
            failures: update.success ? existingProgress.failures : existingProgress.failures + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        // Create new skill progress entry
        const initialState: SrsState = { easiness: 2.5, interval: 1, reps: 0 };
        const sm2Rating = Math.min(5, Math.max(0, Math.round(update.performance / 2))) as 0|1|2|3|4|5;
        const newState = sm2(sm2Rating, initialState);

        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + newState.interval);

        await supabase
          .from('skill_progress')
          .insert({
            user_id: userId,
            skill_code: update.skillCode,
            sm2_easiness: newState.easiness,
            interval_days: newState.interval,
            next_due: nextDue.toISOString(),
            successes: update.success ? 1 : 0,
            failures: update.success ? 0 : 1
          });
      }
    } catch (error) {
      console.error(`Error updating skill progress for ${update.skillCode}:`, error);
    }
  }
}

/**
 * Update vocabulary progress in SRS system
 */
export async function updateVocabularyProgress(
  userId: string,
  vocabId: string,
  performance: number // 0-10 scale
): Promise<void> {
  const supabase = await createClient();

  try {
    // Get existing vocabulary progress
    const { data: existingProgress } = await supabase
      .from('vocab_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('vocab_id', vocabId)
      .single();

    const success = performance >= 6; // Consider 6+ out of 10 as success
    const sm2Rating = Math.min(5, Math.max(0, Math.round(performance / 2))) as 0|1|2|3|4|5;

    if (existingProgress) {
      // Update existing progress
      const currentState: SrsState = {
        easiness: existingProgress.sm2_easiness,
        interval: existingProgress.interval_days,
        reps: existingProgress.successes
      };

      const newState = sm2(sm2Rating, currentState);
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + newState.interval);

      await supabase
        .from('vocab_progress')
        .update({
          sm2_easiness: newState.easiness,
          interval_days: newState.interval,
          next_due: nextDue.toISOString(),
          successes: success ? existingProgress.successes + 1 : existingProgress.successes,
          failures: success ? existingProgress.failures : existingProgress.failures + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id);
    } else {
      // Create new vocabulary progress entry
      const initialState: SrsState = { easiness: 2.5, interval: 1, reps: 0 };
      const newState = sm2(sm2Rating, initialState);
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + newState.interval);

      await supabase
        .from('vocab_progress')
        .insert({
          user_id: userId,
          vocab_id: vocabId,
          sm2_easiness: newState.easiness,
          interval_days: newState.interval,
          next_due: nextDue.toISOString(),
          successes: success ? 1 : 0,
          failures: success ? 0 : 1
        });
    }
  } catch (error) {
    console.error(`Error updating vocabulary progress for ${vocabId}:`, error);
  }
}

/**
 * Comprehensive progress update based on lesson performance
 */
export async function updateProgressFromLessonPerformance(
  progressData: ProgressUpdate
): Promise<void> {
  const { userId, skillAssessment, vocabularyWords, performanceScore } = progressData;

  // Update skill progress based on assessment scores
  const skillUpdates: SkillUpdate[] = [
    {
      skillCode: 'grammar',
      performance: skillAssessment.grammar,
      success: skillAssessment.grammar >= 6
    },
    {
      skillCode: 'vocabulary',
      performance: skillAssessment.vocabulary,
      success: skillAssessment.vocabulary >= 6
    },
    {
      skillCode: 'pronunciation',
      performance: skillAssessment.pronunciation,
      success: skillAssessment.pronunciation >= 6
    },
    {
      skillCode: 'fluency',
      performance: skillAssessment.fluency,
      success: skillAssessment.fluency >= 6
    }
  ];

  // Update skills
  await updateSkillProgress(userId, skillUpdates);

  // Update vocabulary progress for encountered words
  if (vocabularyWords && vocabularyWords.length > 0) {
    const avgVocabScore = skillAssessment.vocabulary;
    
    for (const vocabId of vocabularyWords) {
      await updateVocabularyProgress(userId, vocabId, avgVocabScore);
    }
  }
}

/**
 * Get vocabulary items due for review
 */
export async function getVocabularyDueForReview(userId: string): Promise<any[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    const { data: dueItems, error } = await supabase
      .from('vocab_progress')
      .select(`
        *,
        vocabulary:vocab_id (
          id,
          spanish,
          english,
          tags
        )
      `)
      .eq('user_id', userId)
      .lte('next_due', now)
      .order('next_due', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error getting vocabulary due for review:', error);
      return [];
    }

    return dueItems || [];
  } catch (error) {
    console.error('Error getting vocabulary due for review:', error);
    return [];
  }
}

/**
 * Get skill progress summary for user
 */
export async function getSkillProgressSummary(userId: string): Promise<any> {
  const supabase = await createClient();

  try {
    const { data: skillProgress, error } = await supabase
      .from('skill_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting skill progress summary:', error);
      return null;
    }

    // Calculate averages and overall progress
    const summary = {
      totalSkills: skillProgress?.length || 0,
      averageEasiness: 0,
      skillBreakdown: {} as Record<string, any>
    };

    if (skillProgress && skillProgress.length > 0) {
      summary.averageEasiness = skillProgress.reduce((sum, skill) => sum + skill.sm2_easiness, 0) / skillProgress.length;
      
      skillProgress.forEach(skill => {
        summary.skillBreakdown[skill.skill_code] = {
          easiness: skill.sm2_easiness,
          successes: skill.successes,
          failures: skill.failures,
          nextDue: skill.next_due,
          intervalDays: skill.interval_days
        };
      });
    }

    return summary;
  } catch (error) {
    console.error('Error getting skill progress summary:', error);
    return null;
  }
}