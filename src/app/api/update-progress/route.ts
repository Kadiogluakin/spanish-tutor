// API route for updating user progress based on lesson performance
// Part of Phase 5: Memory & Progression

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProgressFromLessonPerformance, ProgressUpdate } from '@/lib/progress-tracking';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get the current user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body = await request.json();
    
    const progressData: ProgressUpdate = {
      userId,
      lessonId: body.lessonId,
      sessionId: body.sessionId,
      skillAssessment: body.skillAssessment,
      vocabularyWords: body.vocabularyWords,
      performanceScore: body.performanceScore
    };

    // Validate required fields
    if (!progressData.lessonId || !progressData.skillAssessment) {
      return NextResponse.json(
        { error: 'Lesson ID and skill assessment are required' },
        { status: 400 }
      );
    }

    // Update progress
    await updateProgressFromLessonPerformance(progressData);

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}