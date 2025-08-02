import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gradeSubmission } from '@/lib/grading';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    // Use the extracted grading function
    const result = await gradeSubmission(submissionId, user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to grade submission' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      submission_id: result.submissionId,
      score: result.score,
      grade: result.grade
    });

  } catch (error) {
    console.error('Error in grade-submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}