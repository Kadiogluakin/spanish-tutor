// POST /api/review/mark
// The AI only knows Spanish text, not our internal progress-row IDs. This
// endpoint resolves a Spanish string + kind (vocab | error) into the
// corresponding progress row for the authenticated user, then applies an
// SM-2 rating derived from the AI-reported `performance` qualitative label.
//
// This is a convenience wrapper around the same SM-2 math used by
// /api/review/rate, but callable from the realtime tool without requiring
// the AI to track UUIDs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  applyRating,
  updateErrorReviewProgress,
} from '@/lib/progress-tracking';
import type { SrsRating } from '@/lib/srs';

export const runtime = 'nodejs';

type Performance = 'again' | 'hard' | 'good' | 'easy';
type Kind = 'vocab' | 'error';

interface MarkBody {
  kind?: Kind;
  spanish?: string;
  performance?: Performance;
}

// Map the AI's qualitative label to an SM-2 rating (0–5).
// Rationale:
//   - "again"  → 1: clearly failed the recall attempt
//   - "hard"   → 3: minimum success, interval advances but slowly
//   - "good"   → 4: normal success
//   - "easy"   → 5: confident success, bigger interval jump
function performanceToSrs(p: Performance): SrsRating {
  switch (p) {
    case 'again':
      return 1;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
    default:
      return 3;
  }
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

  let body: MarkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const kind = body.kind;
  const spanish = (body.spanish ?? '').trim();
  const performance = body.performance ?? 'good';

  if (kind !== 'vocab' && kind !== 'error') {
    return NextResponse.json(
      { error: 'kind must be "vocab" or "error"' },
      { status: 400 }
    );
  }
  if (!spanish) {
    return NextResponse.json(
      { error: 'spanish is required' },
      { status: 400 }
    );
  }
  if (!['again', 'hard', 'good', 'easy'].includes(performance)) {
    return NextResponse.json(
      { error: 'performance must be one of: again|hard|good|easy' },
      { status: 400 }
    );
  }

  const rating = performanceToSrs(performance as Performance);

  try {
    if (kind === 'vocab') {
      // Resolve spanish → vocabulary.id → vocab_progress row for this user.
      const { data: vocabRow, error: vocabError } = await supabase
        .from('vocabulary')
        .select('id')
        .eq('spanish', spanish)
        .maybeSingle();

      if (vocabError) {
        console.error('[review/mark] vocabulary lookup error:', vocabError);
        return NextResponse.json(
          { error: 'Vocabulary lookup failed' },
          { status: 500 }
        );
      }
      if (!vocabRow?.id) {
        // Item not yet in vocabulary — silent no-op so the AI can call this
        // aggressively without us erroring on items it only said once.
        return NextResponse.json({ success: true, skipped: 'vocab-not-found' });
      }

      const { data: progressRow, error: progressError } = await supabase
        .from('vocab_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('vocab_id', vocabRow.id)
        .maybeSingle();

      if (progressError) {
        console.error('[review/mark] vocab_progress lookup error:', progressError);
        return NextResponse.json(
          { error: 'Progress lookup failed' },
          { status: 500 }
        );
      }
      if (!progressRow) {
        return NextResponse.json({ success: true, skipped: 'no-progress-row' });
      }

      const patch = applyRating(rating, {
        sm2_easiness: progressRow.sm2_easiness,
        interval_days: progressRow.interval_days,
        reps: progressRow.reps ?? 0,
        successes: progressRow.successes,
        failures: progressRow.failures,
      });

      const { error: updateError } = await supabase
        .from('vocab_progress')
        .update(patch)
        .eq('id', progressRow.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[review/mark] vocab update error:', updateError);
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

    // kind === 'error'
    const { data: errorRow, error: errorLookupError } = await supabase
      .from('error_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('spanish', spanish)
      .in('status', ['active', 'improved'])
      .maybeSingle();

    if (errorLookupError) {
      console.error('[review/mark] error_logs lookup error:', errorLookupError);
      return NextResponse.json(
        { error: 'Error lookup failed' },
        { status: 500 }
      );
    }
    if (!errorRow?.id) {
      return NextResponse.json({ success: true, skipped: 'error-not-found' });
    }

    await updateErrorReviewProgress(user.id, errorRow.id, rating);
    return NextResponse.json({ success: true, kind });
  } catch (err) {
    console.error('[review/mark] exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
