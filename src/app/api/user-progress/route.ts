import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lesson_id');

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lesson_id parameter is required' },
        { status: 400 }
      );
    }

    // Check if user has completed this specific lesson
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking user progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to check progress' },
        { status: 500 }
      );
    }

    const completed = !!progress;
    
    return NextResponse.json({
      lesson_id: lessonId,
      completed,
      completed_at: progress?.completed_at || null,
      score: progress?.score || null,
      time_spent_min: progress?.time_spent_min || null
    });

  } catch (error) {
    console.error('Error in user-progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}