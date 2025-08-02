import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const level = searchParams.get('level'); // A1, A2, B1
    const unit = searchParams.get('unit'); // unit number
    const completed = searchParams.get('completed'); // true/false
    const search = searchParams.get('search'); // search term
    
    // Get user ID for progress tracking
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Base query for lessons  
    let query = supabase
      .from('lessons')
      .select('*');

    // Apply filters
    if (level) {
      query = query.eq('cefr', level.toUpperCase());
    }
    
    // Note: unit filtering will be done after parsing content_refs since it's stored as JSON

    if (search) {
      query = query.or(`title.ilike.%${search}%, objectives.ilike.%${search}%`);
    }

    const { data: lessons, error } = await query.order('cefr').order('id');

    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
    }

    // Get user progress for each lesson
    const { data: userProgress } = await supabase
      .from('user_progress')  
      .select('lesson_id, completed_at')
      .eq('user_id', user.id);

    const progressMap = new Map();
    userProgress?.forEach(session => {
      if (session.completed_at) {
        progressMap.set(session.lesson_id, session.completed_at);
      }
    });

    // Enhance lessons with user progress and parse JSON fields
    const enhancedLessons = lessons?.map(lesson => {
      const isCompleted = progressMap.has(lesson.id);
      const completedAt = progressMap.get(lesson.id);
      
      // Parse JSON fields safely
      let content_refs;
      let objectives;
      
      try {
        content_refs = typeof lesson.content_refs === 'string' 
          ? JSON.parse(lesson.content_refs) 
          : lesson.content_refs || {};
      } catch {
        content_refs = {};
      }
      
      try {
        objectives = typeof lesson.objectives === 'string'
          ? JSON.parse(lesson.objectives)
          : lesson.objectives || [];
      } catch {
        objectives = [];
      }
      
      return {
        ...lesson,
        isCompleted,
        completedAt,
        content_refs,
        objectives,
        unit: content_refs.unit || 1,
        lesson: content_refs.lesson || 1
      };
    }) || [];

    // Apply filters after processing
    let filteredLessons = enhancedLessons;
    
    // Apply unit filter
    if (unit) {
      const unitNum = parseInt(unit);
      filteredLessons = filteredLessons.filter(lesson => lesson.unit === unitNum);
    }
    
    // Apply completed filter
    if (completed === 'true') {
      filteredLessons = filteredLessons.filter(lesson => lesson.isCompleted);
    } else if (completed === 'false') {
      filteredLessons = filteredLessons.filter(lesson => !lesson.isCompleted);
    }

    // Group lessons by level and unit for better organization
    const groupedLessons = filteredLessons.reduce((acc, lesson) => {
      const level = lesson.cefr;
      const unit = lesson.unit;
      
      if (!acc[level]) acc[level] = {};
      if (!acc[level][unit]) acc[level][unit] = [];
      
      acc[level][unit].push(lesson);
      return acc;
    }, {} as Record<string, Record<number, any[]>>);

    return NextResponse.json({
      lessons: filteredLessons,
      grouped: groupedLessons,
      total: filteredLessons.length,
      summary: {
        A1: filteredLessons.filter(l => l.cefr === 'A1').length,
        A2: filteredLessons.filter(l => l.cefr === 'A2').length,
        B1: filteredLessons.filter(l => l.cefr === 'B1').length,
        completed: filteredLessons.filter(l => l.isCompleted).length
      }
    });

  } catch (error) {
    console.error('Error in lessons API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}