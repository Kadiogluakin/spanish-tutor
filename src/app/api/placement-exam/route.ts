import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { PlacementResult, scorePlacementSubmission } from '@/lib/placement-exam-improved';

const placementCompletionSchema = z.object({
  submission: z.object({
    askedQuestionIds: z.array(z.string().min(1)).min(3).max(12),
    answers: z.record(z.string().min(1), z.string().min(1).max(500)),
  }),
  durationMinutes: z.number().int().min(0).max(180),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const parsedCompletion = placementCompletionSchema.safeParse(body);

    if (!parsedCompletion.success) {
      const message = parsedCompletion.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return NextResponse.json(
        { error: `Invalid placement payload (${message})` },
        { status: 400 }
      );
    }

    const { submission, durationMinutes } = parsedCompletion.data;

    let result: PlacementResult;
    try {
      result = scorePlacementSubmission(submission);
    } catch (scoringError) {
      const message = scoringError instanceof Error ? scoringError.message : 'Unknown scoring failure';
      return NextResponse.json(
        { error: `Invalid placement submission (${message})` },
        { status: 400 }
      );
    }

    // Update user profile with placement results
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        level_cefr: result.recommendedLevel,
        placement_completed: true,
        placement_scores: {
          overall_confidence: result.confidenceScore,
          level_scores: result.detailedScores,
          skill_breakdown: result.skillBreakdown,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendations: result.recommendations,
          exam_duration_minutes: durationMinutes,
          questions_answered: result.questionsAnswered,
          total_questions: result.totalQuestions,
          estimated_study_time: result.estimatedStudyTime,
          completed_at: new Date().toISOString()
        }
      }, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json({ error: 'Failed to save placement results' }, { status: 500 });
    }

    // Find the recommended lesson to start with
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, content_refs')
      .eq('cefr', result.recommendedLevel);

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // Find the specific lesson to start with based on unit and lesson recommendations
    let recommendedLessonId = null;
    if (lessons && lessons.length > 0) {
      const sortedLessons = lessons
        .map(lesson => {
          const contentRefs = lesson.content_refs as { unit?: number | string; lesson?: number | string } | null;
          return {
            ...lesson,
            unit: Number(contentRefs?.unit ?? Number.MAX_SAFE_INTEGER),
            lessonNumber: Number(contentRefs?.lesson ?? Number.MAX_SAFE_INTEGER),
          };
        })
        .sort((a, b) => (a.unit - b.unit) || (a.lessonNumber - b.lessonNumber));

      // Find lesson in the recommended unit
      const targetLesson = sortedLessons.find(lesson => {
        return lesson.unit === result.recommendedUnit &&
               lesson.lessonNumber >= result.recommendedLesson;
      });
      
      // If specific lesson not found, start with first lesson of the unit
      const fallbackLesson = sortedLessons.find(lesson => {
        return lesson.unit === result.recommendedUnit;
      });

      recommendedLessonId = targetLesson?.id || fallbackLesson?.id || sortedLessons[0].id;
    }

    // Log the placement result for analytics
    const { error: logError } = await supabase
      .from('placement_logs')
      .insert({
        user_id: user.id,
        recommended_level: result.recommendedLevel,
        recommended_unit: result.recommendedUnit,
        recommended_lesson: result.recommendedLesson,
        confidence_score: result.confidenceScore,
        level_scores: result.detailedScores,
        skill_scores: result.skillBreakdown,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        exam_duration_minutes: durationMinutes,
        total_questions: result.totalQuestions,
        questions_answered: result.questionsAnswered,
        created_at: new Date().toISOString()
      });

    // Don't fail the request if logging fails
    if (logError) {
      console.warn('Failed to log placement result:', logError);
    }

    return NextResponse.json({
      success: true,
      user_level: result.recommendedLevel,
      recommended_lesson_id: recommendedLessonId,
      placement_summary: {
        level: result.recommendedLevel,
        unit: result.recommendedUnit,
        lesson: result.recommendedLesson,
        confidence: result.confidenceScore,
        estimated_time: result.estimatedStudyTime
      }
    });

  } catch (error) {
    console.error('Error processing placement exam:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}