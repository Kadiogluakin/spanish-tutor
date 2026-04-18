// POST /api/review/rate
// Central endpoint for all review ratings. Clients send the rating for a
// single item; this route applies SM-2 on the server, persists the new state
// to the correct table, and returns the resolved next-due date.
//
// Keeping this server-side (instead of letting the browser write to
// vocab_progress directly) ensures:
//  - a single source of truth for SRS math
//  - auth + ownership checks without relying purely on RLS
//  - room to add analytics / anti-cheat later

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  applyRating,
  updateErrorReviewProgress,
} from '@/lib/progress-tracking';
import { SrsRating } from '@/lib/srs';

export const runtime = 'nodejs';

type ReviewItemKind = 'vocab' | 'skill' | 'error';

type RatePayload = {
  kind: ReviewItemKind;
  progressId: string;
  rating: number;
};

function isValidRating(value: unknown): value is SrsRating {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { kind, progressId, rating } = body;

  if (!progressId || typeof progressId !== 'string') {
    return NextResponse.json({ error: 'progressId required' }, { status: 400 });
  }
  if (!isValidRating(rating)) {
    return NextResponse.json(
      { error: 'rating must be an integer 0–5' },
      { status: 400 }
    );
  }

  try {
    if (kind === 'vocab' || kind === 'skill') {
      const table = kind === 'vocab' ? 'vocab_progress' : 'skill_progress';
      const { data: row, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', progressId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error(`[${kind}] fetch error:`, fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch item' },
          { status: 500 }
        );
      }
      if (!row) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const patch = applyRating(rating, {
        sm2_easiness: row.sm2_easiness,
        interval_days: row.interval_days,
        reps: row.reps ?? 0,
        successes: row.successes,
        failures: row.failures,
      });

      const { error: updateError } = await supabase
        .from(table)
        .update(patch)
        .eq('id', progressId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error(`[${kind}] update error:`, updateError);
        return NextResponse.json(
          { error: 'Failed to save rating' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        kind,
        nextDue: patch.next_due,
        intervalDays: patch.interval_days,
      });
    }

    if (kind === 'error') {
      await updateErrorReviewProgress(user.id, progressId, rating);
      return NextResponse.json({ success: true, kind });
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
  } catch (error) {
    console.error('Review rate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
