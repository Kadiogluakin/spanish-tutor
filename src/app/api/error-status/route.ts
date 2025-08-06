import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { errorId, status } = body;

    if (!errorId || status !== 'dismissed') {
      return NextResponse.json({ error: 'Invalid request. Only dismissal is supported.' }, { status: 400 });
    }

    // Verify the error belongs to the current user
    const { data: existingError, error: fetchError } = await supabase
      .from('error_logs')
      .select('*')
      .eq('id', errorId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingError) {
      return NextResponse.json({ error: 'Error not found or access denied' }, { status: 404 });
    }

    const updateData: any = {
      status: 'dismissed'
    };

    // Update the error
    const { error: updateError } = await supabase
      .from('error_logs')
      .update(updateData)
      .eq('id', errorId);

    if (updateError) {
      console.error('Error updating error status:', updateError);
      console.error('Update data attempted:', updateData);
      console.error('Error ID:', errorId);
      return NextResponse.json({ 
        error: 'Failed to update error status', 
        details: updateError.message,
        code: updateError.code 
      }, { status: 500 });
    }

    // If marked as improved/mastered, try to update related vocabulary/skill progress
    if (status === 'improved' || status === 'mastered') {
      // This section is now deprecated as we only support 'dismissed'
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Error status updated successfully',
      updatedStatus: status
    });

  } catch (error) {
    console.error('Error updating error status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}