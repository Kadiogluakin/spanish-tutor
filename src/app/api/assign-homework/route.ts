import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignHomework } from '@/lib/homework';

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
    const { lessonId, userLevel } = body;

    if (!lessonId || !userLevel) {
      return NextResponse.json(
        { error: 'Lesson ID and user level are required' },
        { status: 400 }
      );
    }

    // Use the extracted homework assignment function
    const homework = await assignHomework(userId, lessonId, userLevel);

    if (!homework) {
      return NextResponse.json(
        { error: 'Failed to assign homework' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      homework
    });

  } catch (error) {
    console.error('Error in assign-homework:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}