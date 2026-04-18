// Progress Tracking & SRS Updates
// Handles skill, vocabulary, and error-review progress updates based on
// performance. Uses SM-2; `reps` is tracked as a first-class column (see
// scripts/fix-review-feature.sql) so a failure correctly resets the
// repetition chain without destroying the lifetime successes/failures totals.

import { createClient } from '@/lib/supabase/server';
import {
  sm2,
  performanceToRating,
  INITIAL_SRS_STATE,
  SrsRating,
  SrsState,
} from '@/lib/srs';

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
  /** Array of vocabulary UUIDs (NOT Spanish strings). */
  vocabularyIds?: string[];
  performanceScore?: number;
}

export interface SkillUpdate {
  skillCode: string;
  performance: number; // 0–10 scale
  success: boolean;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Apply an SM-2 rating to a generic progress row shape (vocab, skill, or
 * error). Returns the column patch to persist.
 */
export function applyRating(
  rating: SrsRating,
  current: {
    sm2_easiness: number;
    interval_days: number;
    reps: number;
    successes: number;
    failures: number;
  }
): {
  sm2_easiness: number;
  interval_days: number;
  reps: number;
  next_due: string;
  successes: number;
  failures: number;
  updated_at: string;
} {
  const nextState = sm2(rating, {
    easiness: current.sm2_easiness,
    interval: current.interval_days,
    reps: current.reps,
  });
  const success = rating >= 3;
  return {
    sm2_easiness: nextState.easiness,
    interval_days: nextState.interval,
    reps: nextState.reps,
    next_due: daysFromNow(nextState.interval),
    successes: success ? current.successes + 1 : current.successes,
    failures: success ? current.failures : current.failures + 1,
    updated_at: new Date().toISOString(),
  };
}

/** Update skill progress by a set of SM-2 ratings derived from performance. */
export async function updateSkillProgress(
  userId: string,
  skillUpdates: SkillUpdate[]
): Promise<void> {
  const supabase = await createClient();

  for (const update of skillUpdates) {
    try {
      const rating = performanceToRating(update.performance);

      const { data: existing } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('skill_code', update.skillCode)
        .maybeSingle();

      if (existing) {
        const patch = applyRating(rating, {
          sm2_easiness: existing.sm2_easiness,
          interval_days: existing.interval_days,
          reps: existing.reps ?? 0,
          successes: existing.successes,
          failures: existing.failures,
        });
        await supabase
          .from('skill_progress')
          .update(patch)
          .eq('id', existing.id);
      } else {
        const first = sm2(rating, INITIAL_SRS_STATE);
        const success = rating >= 3;
        await supabase.from('skill_progress').insert({
          user_id: userId,
          skill_code: update.skillCode,
          sm2_easiness: first.easiness,
          interval_days: first.interval,
          reps: first.reps,
          next_due: daysFromNow(first.interval),
          successes: success ? 1 : 0,
          failures: success ? 0 : 1,
        });
      }
    } catch (error) {
      console.error(
        `Error updating skill progress for ${update.skillCode}:`,
        error
      );
    }
  }
}

/** Update vocabulary progress for a real vocabulary row (by UUID). */
export async function updateVocabularyProgress(
  userId: string,
  vocabId: string,
  performance: number // 0–10 scale
): Promise<void> {
  if (!isUuid(vocabId)) {
    console.error(
      `updateVocabularyProgress called with non-UUID vocabId: ${vocabId}`
    );
    return;
  }
  const supabase = await createClient();
  const rating = performanceToRating(performance);

  try {
    const { data: existing } = await supabase
      .from('vocab_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('vocab_id', vocabId)
      .maybeSingle();

    if (existing) {
      const patch = applyRating(rating, {
        sm2_easiness: existing.sm2_easiness,
        interval_days: existing.interval_days,
        reps: existing.reps ?? 0,
        successes: existing.successes,
        failures: existing.failures,
      });
      await supabase
        .from('vocab_progress')
        .update(patch)
        .eq('id', existing.id);
    } else {
      const first = sm2(rating, INITIAL_SRS_STATE);
      const success = rating >= 3;
      await supabase.from('vocab_progress').insert({
        user_id: userId,
        vocab_id: vocabId,
        sm2_easiness: first.easiness,
        interval_days: first.interval,
        reps: first.reps,
        next_due: daysFromNow(first.interval),
        successes: success ? 1 : 0,
        failures: success ? 0 : 1,
      });
    }
  } catch (error) {
    console.error(`Error updating vocabulary progress for ${vocabId}:`, error);
  }
}

/** Update error-review SRS state (in error_logs) after a review rating. */
export async function updateErrorReviewProgress(
  userId: string,
  errorId: string,
  rating: SrsRating
): Promise<void> {
  const supabase = await createClient();

  try {
    const { data: existing } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', errorId)
      .maybeSingle();
    if (!existing) return;

    const patch = applyRating(rating, {
      sm2_easiness: existing.sm2_easiness ?? 2.5,
      interval_days: existing.interval_days ?? 1,
      reps: existing.reps ?? 0,
      successes: existing.successes ?? 0,
      failures: existing.failures ?? 0,
    });

    // Also transition the error status if the user has clearly mastered it.
    const statusPatch: Record<string, unknown> = {
      last_seen: new Date().toISOString(),
    };
    if (rating >= 4 && (existing.successes ?? 0) + 1 >= 3) {
      statusPatch.status = 'mastered';
      statusPatch.improved_at = new Date().toISOString();
    } else if (rating >= 3 && (existing.successes ?? 0) + 1 >= 2) {
      statusPatch.status = 'improved';
      statusPatch.improved_at = new Date().toISOString();
    }

    await supabase
      .from('error_logs')
      .update({ ...patch, ...statusPatch })
      .eq('id', errorId);
  } catch (error) {
    console.error(`Error updating error-review progress for ${errorId}:`, error);
  }
}

/**
 * Comprehensive progress update based on lesson performance.
 * `vocabularyIds` MUST be UUIDs from the `vocabulary` table.
 */
export async function updateProgressFromLessonPerformance(
  progressData: ProgressUpdate
): Promise<void> {
  const { userId, skillAssessment, vocabularyIds } = progressData;

  const skillUpdates: SkillUpdate[] = [
    {
      skillCode: 'grammar',
      performance: skillAssessment.grammar,
      success: skillAssessment.grammar >= 6,
    },
    {
      skillCode: 'vocabulary',
      performance: skillAssessment.vocabulary,
      success: skillAssessment.vocabulary >= 6,
    },
    {
      skillCode: 'pronunciation',
      performance: skillAssessment.pronunciation,
      success: skillAssessment.pronunciation >= 6,
    },
    {
      skillCode: 'fluency',
      performance: skillAssessment.fluency,
      success: skillAssessment.fluency >= 6,
    },
  ];

  await updateSkillProgress(userId, skillUpdates);

  if (vocabularyIds && vocabularyIds.length > 0) {
    const avgVocabScore = skillAssessment.vocabulary;
    for (const vocabId of vocabularyIds) {
      await updateVocabularyProgress(userId, vocabId, avgVocabScore);
    }
  }
}

/** Vocabulary items due for review (joined with the word itself). */
export async function getVocabularyDueForReview(userId: string): Promise<any[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  try {
    const { data: dueItems, error } = await supabase
      .from('vocab_progress')
      .select(
        `
        *,
        vocabulary:vocab_id (
          id,
          spanish,
          english,
          tags
        )
      `
      )
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

export async function getSkillProgressSummary(userId: string): Promise<any> {
  const supabase = await createClient();

  try {
    const { data: skillProgress, error } = await supabase
      .from('skill_progress')
      .select('*')
      .eq('user_id', userId)
      .not('skill_code', 'like', 'error_%')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error getting skill progress summary:', error);
      return null;
    }

    const summary = {
      totalSkills: skillProgress?.length || 0,
      averageEasiness: 0,
      skillBreakdown: {} as Record<string, any>,
    };

    if (skillProgress && skillProgress.length > 0) {
      summary.averageEasiness =
        skillProgress.reduce((sum, s) => sum + s.sm2_easiness, 0) /
        skillProgress.length;
      skillProgress.forEach((skill) => {
        summary.skillBreakdown[skill.skill_code] = {
          easiness: skill.sm2_easiness,
          successes: skill.successes,
          failures: skill.failures,
          nextDue: skill.next_due,
          intervalDays: skill.interval_days,
        };
      });
    }

    return summary;
  } catch (error) {
    console.error('Error getting skill progress summary:', error);
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export type { SrsRating, SrsState };
