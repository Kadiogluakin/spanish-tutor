// API route to get the lesson of the day for the current user

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLessonOfTheDay } from '@/lib/level-plan-supabase';

export async function GET(request: NextRequest) {
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

    // Use the user's ID from Supabase
    const userId = user.id;
    
    // Get the lesson of the day
    const lessonPlan = await getLessonOfTheDay(userId);
    
    return NextResponse.json(lessonPlan);
  } catch (error) {
    console.error('Error getting lesson of the day:', error);
    
    return NextResponse.json(
      { error: 'Failed to get lesson recommendation' },
      { status: 500 }
    );
  }
}