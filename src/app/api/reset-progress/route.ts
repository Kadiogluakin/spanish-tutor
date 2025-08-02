import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { confirmationText } = body;

    // Require explicit confirmation
    if (confirmationText !== 'RESET MY PROGRESS') {
      return NextResponse.json({ 
        error: 'Please type "RESET MY PROGRESS" to confirm' 
      }, { status: 400 });
    }

    // Delete all user progress data
    const tables = [
      'learning_sessions',
      'user_progress', 
      'vocab_progress',
      'skill_progress',
      'error_logs',
      'submissions',
      'homework'
    ];

    const deletePromises = tables.map(table => 
      supabase
        .from(table)
        .delete()
        .eq('user_id', user.id)
    );

    await Promise.all(deletePromises);

    // Reset user profile learning data but keep personal info
    await supabase
      .from('user_profiles')
      .update({
        level_cefr: 'A1',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    return NextResponse.json({
      message: 'Progress reset successfully',
      resetDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resetting progress:', error);
    return NextResponse.json({ error: 'Failed to reset progress' }, { status: 500 });
  }
}