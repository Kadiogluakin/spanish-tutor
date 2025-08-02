// API route to mark a lesson as completed and track user progress

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAndUpdateUserLevel } from '@/lib/level-progression-supabase';
import { assignHomework } from '@/lib/homework';

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
    const { lessonId, durationMin } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Create a learning session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        duration_min: durationMin || 30,
        summary: `Completed lesson: ${lessonId}`
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating learning session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to record session' },
        { status: 500 }
      );
    }

    const sessionId = sessionData?.id;

    // Mark lesson as completed in user progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        score: 100, // Default completion score
        time_spent_min: durationMin || 30
      });

    if (progressError) {
      console.error('Error updating user progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // Check if user should advance to next level
    const levelProgression = await checkAndUpdateUserLevel(userId);

    // Assign homework for the completed lesson
    const homeworkAssigned = await assignHomework(userId, lessonId, levelProgression.currentLevel);
    if (!homeworkAssigned) {
      console.warn('Failed to assign homework, but lesson completion will continue');
    }

    return NextResponse.json({
      success: true,
      lessonCompleted: lessonId,
      sessionId: sessionId,
      levelProgression: {
        currentLevel: levelProgression.currentLevel,
        advanced: levelProgression.shouldAdvance,
        nextLevel: levelProgression.nextLevel,
        completionPercentage: levelProgression.completionPercentage,
        lessonsCompleted: levelProgression.lessonsCompleted,
        totalLessonsInLevel: levelProgression.totalLessonsInLevel
      },
      homeworkAssigned
    });

  } catch (error) {
    console.error('Error completing lesson:', error);
    
    return NextResponse.json(
      { error: 'Failed to complete lesson' },
      { status: 500 }
    );
  }
}