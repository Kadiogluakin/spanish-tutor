import { NextRequest, NextResponse } from 'next/server';
import { gradeAllPendingSubmissions } from '@/lib/grading';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const result = await gradeAllPendingSubmissions();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to grade submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.total === 0 
        ? 'No ungraded submissions found' 
        : `Graded ${result.graded} of ${result.total} submissions`,
      graded: result.graded,
      total: result.total,
      results: result.results
    });

  } catch (error) {
    console.error('Error in auto-grade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}