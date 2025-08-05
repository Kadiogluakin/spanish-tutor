import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlacementResult } from '@/lib/placement-exam-improved';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { result }: { result: PlacementResult } = body;

    if (!result) {
      return NextResponse.json({ error: 'Missing placement result' }, { status: 400 });
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
      .eq('cefr', result.recommendedLevel)
      .order('content_refs->unit', { ascending: true })
      .order('content_refs->lesson', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // Find the specific lesson to start with based on unit and lesson recommendations
    let recommendedLessonId = null;
    if (lessons && lessons.length > 0) {
      // Find lesson in the recommended unit
      const targetLesson = lessons.find(lesson => {
        const contentRefs = lesson.content_refs as any;
        return contentRefs?.unit === result.recommendedUnit && 
               contentRefs?.lesson >= result.recommendedLesson;
      });
      
      // If specific lesson not found, start with first lesson of the unit
      const fallbackLesson = lessons.find(lesson => {
        const contentRefs = lesson.content_refs as any;
        return contentRefs?.unit === result.recommendedUnit;
      });

      recommendedLessonId = targetLesson?.id || fallbackLesson?.id || lessons[0].id;
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