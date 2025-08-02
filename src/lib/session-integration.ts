// Session Integration for Phase 5
// Handles session summarization and progress updates after lesson completion

import { createClient } from '@/lib/supabase/server';
import { updateProgressFromLessonPerformance } from '@/lib/progress-tracking';

export interface SessionSummaryData {
  sessionId: string;
  lessonId: string;
  transcript: string;
  notebookEntries?: Array<{
    text: string;
    type: 'vocabulary' | 'note' | 'title';
  }>;
  duration?: number;
  mistakes?: string[];
}

/**
 * Complete session analysis and progress updates
 * This function should be called after a lesson is completed
 */
export async function completeSessionAnalysis(
  userId: string,
  summaryData: SessionSummaryData
): Promise<{
  success: boolean;
  summary?: string;
  errors?: any[];
  progressUpdated?: boolean;
}> {
  try {
    // Call the summary API to analyze the session
    const summaryResponse = await fetch('/api/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: summaryData.sessionId,
        lessonId: summaryData.lessonId,
        transcript: summaryData.transcript,
        mistakes: summaryData.mistakes,
        duration: summaryData.duration,
        notebookEntries: summaryData.notebookEntries
      })
    });

    if (!summaryResponse.ok) {
      throw new Error('Failed to generate session summary');
    }

    const summaryResult = await summaryResponse.json();

    // Update progress based on skill assessment
    if (summaryResult.skillAssessment) {
      await updateProgressFromLessonPerformance({
        userId,
        lessonId: summaryData.lessonId,
        sessionId: summaryData.sessionId,
        skillAssessment: summaryResult.skillAssessment,
        vocabularyWords: summaryResult.newVocabulary?.map((v: any) => v.spanish) || []
      });
    }

    return {
      success: true,
      summary: summaryResult.summary,
      errors: summaryResult.errors,
      progressUpdated: true
    };

  } catch (error) {
    console.error('Error in session analysis:', error);
    return {
      success: false
    };
  }
}

/**
 * Collect session data from lesson page components
 * This helper function formats data for session analysis
 */
export function prepareSessionData(
  sessionId: string,
  lessonId: string,
  conversationHistory: any[],
  notebookEntries: any[],
  duration: number
): SessionSummaryData {
  // Extract transcript from conversation history
  const transcript = conversationHistory
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  // Format notebook entries
  const formattedEntries = notebookEntries.map(entry => ({
    text: entry.text,
    type: entry.type as 'vocabulary' | 'note' | 'title'
  }));

  return {
    sessionId,
    lessonId,
    transcript,
    notebookEntries: formattedEntries,
    duration,
    mistakes: [] // Could be extracted from conversation analysis
  };
}