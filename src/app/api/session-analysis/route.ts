// API route for complete session analysis
// Integrates summarization and progress tracking

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeSessionAnalysis, SessionSummaryData } from '@/lib/session-integration';

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
    const summaryData: SessionSummaryData = await request.json();

    // Validate required fields
    if (!summaryData.sessionId || !summaryData.lessonId || !summaryData.transcript) {
      return NextResponse.json(
        { error: 'Session ID, lesson ID, and transcript are required' },
        { status: 400 }
      );
    }

    // Perform complete session analysis
    const result = await completeSessionAnalysis(userId, summaryData);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to analyze session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      errors: result.errors,
      progressUpdated: result.progressUpdated
    });

  } catch (error) {
    console.error('Error in session analysis:', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze session' },
      { status: 500 }
    );
  }
}